/**
 * Histórico DETERMINÍSTICO da demonstração (Agente 09 — integração).
 *
 * Sem histórico, Dashboard, Financeiro e Relatórios comparavam a semana demo com "nada"
 * (+1.833% vs. período anterior, ocupação de 3%, gráfico de 12 meses zerado). Aqui geramos,
 * sempre com o MESMO resultado (PRNG com semente fixa e IDs estáveis):
 *
 * 1. Agendamentos de 01/09/2026 a 17/10/2026 para cada profissional, respeitando expediente,
 *    intervalo de almoço e consultas já existentes (sem conflito). Status: concluída / faltou / cancelada.
 * 2. Uma receita PAGA por consulta concluída, vinculada por `appointmentId` (sem duplicidade).
 * 3. Fechamentos mensais consolidados de nov/2025 a ago/2026 (receita e despesa), com os valores de
 *    `monthlyCashFlow` do design, e a despesa consolidada de set/2026.
 *
 * Tudo é FICTÍCIO e marcado como demonstração.
 */
import { monthlyCashFlow } from '@ds/mocks/business';
import type { PaymentMethod } from '@ds/mocks/types';
import type { AppointmentRecord, FinancialEntryRecord, PatientRecord, Professional } from '../domain';

export const HISTORY_FROM = '2026-09-01';
export const HISTORY_TO = '2026-10-17';

/** mulberry32: PRNG pequeno e determinístico. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const LUNCH = [toMin('12:00'), toMin('13:00')] as const;
/** Fração dos horários livres que vira consulta (calibrada para ~R$ 45–55 mil/mês, como no design). */
const FILL_FACTOR = 0.13;
const CHANNELS: NonNullable<AppointmentRecord['channel']>[] = ['whatsapp', 'whatsapp', 'assistente_ia', 'telefone', 'presencial'];
const METHODS: PaymentMethod[] = ['pix', 'pix', 'cartao_credito', 'cartao_debito', 'dinheiro'];

interface ServiceTemplate {
  service: string;
  durationMin: number;
  price: number;
}

/** Serviços e pacientes que cada profissional já atende na semente (base para o histórico). */
function profileOf(prof: Professional, base: AppointmentRecord[], patients: PatientRecord[]) {
  const own = base.filter((a) => a.professionalId === prof.id && a.price > 0);
  const services = new Map<string, ServiceTemplate>();
  for (const a of own) if (!services.has(a.service)) services.set(a.service, { service: a.service, durationMin: a.durationMin, price: a.price });
  const patientIds = Array.from(new Set(base.filter((a) => a.professionalId === prof.id).map((a) => a.patientId)));
  // Garante uma carteira mínima de 4 pacientes ativos por profissional.
  for (const p of patients) {
    if (patientIds.length >= 4) break;
    if (p.status === 'ativo' && !patientIds.includes(p.id)) patientIds.push(p.id);
  }
  return { services: Array.from(services.values()), patientIds };
}

export interface DemoHistory {
  appointments: AppointmentRecord[];
  financialEntries: FinancialEntryRecord[];
}

export function buildHistory(
  professionals: Professional[],
  patients: PatientRecord[],
  base: AppointmentRecord[],
): DemoHistory {
  const rand = prng(20261019);
  const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)];
  const patientName = new Map(patients.map((p) => [p.id, p.name]));
  const appointments: AppointmentRecord[] = [];
  const entries: FinancialEntryRecord[] = [];

  const busy = new Map<string, [number, number][]>();
  const key = (profId: string, day: string) => `${profId}|${day}`;
  for (const a of base) {
    const k = key(a.professionalId, a.start.slice(0, 10));
    const s = toMin(a.start.slice(11, 16));
    busy.set(k, [...(busy.get(k) ?? []), [s, s + a.durationMin]]);
  }

  const profiles = new Map(professionals.map((p) => [p.id, profileOf(p, base, patients)]));
  const end = new Date(`${HISTORY_TO}T00:00:00`);
  for (let d = new Date(`${HISTORY_FROM}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
    const day = dateKey(d);
    for (const prof of professionals) {
      const hours = prof.workingHours.find((w) => w.weekday === d.getDay());
      const profile = profiles.get(prof.id);
      if (!hours || !profile || profile.services.length === 0) continue;
      const taken = busy.get(key(prof.id, day)) ?? [];
      for (let t = toMin(hours.start); t + 30 <= toMin(hours.end); t += 60) {
        const tpl = pick(profile.services);
        const s = t;
        const e = t + tpl.durationMin;
        if (e > toMin(hours.end)) continue;
        if (s < LUNCH[1] && e > LUNCH[0]) continue;
        if (taken.some(([bs, be]) => s < be && e > bs)) continue;
        if (rand() > prof.occupancy * FILL_FACTOR * 2) continue;
        const r = rand();
        const status: AppointmentRecord['status'] = r < 0.86 ? 'concluida' : r < 0.93 ? 'faltou' : 'cancelada';
        const patientId = pick(profile.patientIds);
        const id = `hist-${day.replace(/-/g, '')}-${prof.id.replace('prof-', '')}-${toHHMM(s).replace(':', '')}`;
        const start = `${day}T${toHHMM(s)}:00`;
        appointments.push({
          id,
          patientId,
          patientName: patientName.get(patientId) ?? '',
          professionalId: prof.id,
          professionalName: prof.name,
          specialty: prof.specialty,
          service: tpl.service,
          roomId: prof.roomId ?? 'sala-7',
          start,
          durationMin: tpl.durationMin,
          status,
          price: tpl.price,
          channel: pick(CHANNELS),
          notes: status === 'cancelada' ? 'Cancelada pelo paciente (histórico demonstrativo).' : undefined,
          createdAt: start,
          updatedAt: start,
        });
        taken.push([s, e]);
        if (status === 'concluida') {
          entries.push({
            id: `fe-${id}`,
            type: 'receita',
            description: tpl.service,
            category: 'Consulta',
            amount: tpl.price,
            date: day,
            dueDate: day,
            method: pick(METHODS),
            status: 'pago',
            paidAt: day,
            patientId,
            patientName: patientName.get(patientId),
            professionalId: prof.id,
            professionalName: prof.name,
            appointmentId: id,
          });
        }
      }
    }
  }

  // Fechamentos mensais consolidados (nov/25 a ago/26) + despesas de set/26.
  const MONTHS: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  };
  for (const m of monthlyCashFlow) {
    const [mon, yy] = m.month.split('/');
    const ym = `20${yy}-${MONTHS[mon]}`;
    if (ym >= '2026-10') continue;
    const last = `${ym}-28`;
    if (ym < '2026-09') {
      entries.push({
        id: `fe-hist-rec-${ym}`,
        type: 'receita',
        description: `Fechamento de receitas — ${m.month} (consolidado)`,
        category: 'Histórico consolidado',
        amount: m.revenue,
        date: last,
        dueDate: last,
        method: 'pix',
        status: 'pago',
        paidAt: last,
      });
    }
    entries.push({
      id: `fe-hist-desp-${ym}`,
      type: 'despesa',
      description: `Fechamento de despesas — ${m.month} (consolidado)`,
      category: 'Histórico consolidado',
      amount: m.expenses,
      date: last,
      dueDate: last,
      method: 'boleto',
      status: 'pago',
      paidAt: last,
    });
  }

  return { appointments, financialEntries: entries };
}
