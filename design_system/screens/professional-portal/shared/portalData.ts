/**
 * Portal do Profissional — regras PURAS de agenda/disponibilidade sobre os dados do `@core`.
 *
 * Substituem os seletores de `@ds/mocks/portal` (que liam arrays fixos): aqui tudo recebe as
 * entidades já filtradas pelos seletores com escopo do core (useAppointments, useBlockRequests…),
 * então o mesmo cálculo vale para o portal e para a gestão de profissionais.
 * Sem React: testado em tests/modules/portal.
 */
import type {
  AccessContext,
  AppointmentStatus,
  BlockRequestRecord,
  ClinicalRecord,
  Database,
  FinancialEntryRecord,
  Professional,
} from '@core';
import { parseDate, toDateKey } from '@ds/mocks/clinical';
import type { AvailabilityDay, PortalAppointment, PortalAttendanceRecord, PortalSlot, Weekday } from '@ds/mocks/portal';

/** Ordem de exibição da semana (segunda → domingo). */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Intervalo padrão da clínica (não há campo de intervalo no cadastro — ver CR 04). */
export const DEFAULT_BREAK = { start: '12:00', end: '13:00' } as const;

const WAITING: AppointmentStatus[] = ['agendada', 'confirmada', 'reagendada'];

/** Mínimo necessário de um agendamento para os cálculos de grade. */
export type SlotAppointment = Pick<PortalAppointment, 'id' | 'professionalId' | 'start' | 'durationMin' | 'status'>;

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function apptRange(a: Pick<SlotAppointment, 'start' | 'durationMin'>): [number, number] {
  const d = new Date(a.start);
  const s = d.getHours() * 60 + d.getMinutes();
  return [s, s + a.durationMin];
}

/** Grade semanal do profissional (intervalo padrão quando o expediente passa pelo almoço). */
export function availabilityOf(prof: Pick<Professional, 'workingHours'> | undefined): AvailabilityDay[] {
  return WEEK_ORDER.map((weekday) => {
    const w = prof?.workingHours.find((x) => x.weekday === weekday);
    if (!w) return { weekday, enabled: false };
    const hasBreak = w.start < DEFAULT_BREAK.start && w.end > DEFAULT_BREAK.end;
    return {
      weekday,
      enabled: true,
      start: w.start,
      end: w.end,
      breakStart: hasBreak ? DEFAULT_BREAK.start : undefined,
      breakEnd: hasBreak ? DEFAULT_BREAK.end : undefined,
    };
  });
}

/** Bloqueios que afetam a agenda do profissional: aprovados (bloqueado) e enviados (pendente). */
export function activeBlocks(requests: BlockRequestRecord[], professionalId: string): BlockRequestRecord[] {
  return requests.filter((r) => r.professionalId === professionalId && r.kind === 'bloqueio' && r.status !== 'recusada');
}

/**
 * Horários de 30 min do expediente numa data, com estado. Considera consultas (exceto canceladas
 * e faltas), intervalo, bloqueios aprovados e pendentes. Pendente NÃO bloqueia a agenda real
 * (o core só considera aprovados em `findConflicts`); aqui ele só é sinalizado.
 */
export function daySlots(
  prof: Pick<Professional, 'id' | 'workingHours'> | undefined,
  dateKey: string,
  appointments: SlotAppointment[],
  requests: BlockRequestRecord[] = [],
): PortalSlot[] {
  if (!prof) return [];
  const day = availabilityOf(prof).find((d) => d.weekday === parseDate(dateKey).getDay());
  if (!day?.enabled || !day.start || !day.end) return [];
  const appts = appointments.filter(
    (a) => a.professionalId === prof.id && a.start.startsWith(dateKey) && a.status !== 'cancelada' && a.status !== 'faltou',
  );
  const blocks = activeBlocks(requests, prof.id).filter((b) => b.date === dateKey);
  const slots: PortalSlot[] = [];
  for (let t = timeToMinutes(day.start); t < timeToMinutes(day.end); t += 30) {
    const end = t + 30;
    const time = minutesToTime(t);
    const appt = appts.find((a) => {
      const [s, e] = apptRange(a);
      return s < end && e > t;
    });
    const block = blocks.find((b) => timeToMinutes(b.start) < end && timeToMinutes(b.end) > t);
    const inBreak = day.breakStart && day.breakEnd && t >= timeToMinutes(day.breakStart) && t < timeToMinutes(day.breakEnd);
    if (appt) slots.push({ time, state: 'ocupado', appointmentId: appt.id });
    else if (block) slots.push({ time, state: block.status === 'aprovada' ? 'bloqueado' : 'pendente', requestId: block.id });
    else if (inBreak) slots.push({ time, state: 'intervalo' });
    else slots.push({ time, state: 'livre' });
  }
  return slots;
}

/** Ocupação (0..1) num conjunto de dias: horários ocupados ÷ horários de trabalho (sem intervalo). */
export function occupancyOf(
  prof: Pick<Professional, 'id' | 'workingHours'> | undefined,
  dateKeys: string[],
  appointments: SlotAppointment[],
  requests: BlockRequestRecord[] = [],
): number {
  let busy = 0;
  let workable = 0;
  dateKeys.forEach((k) => {
    daySlots(prof, k, appointments, requests).forEach((s) => {
      if (s.state === 'intervalo') return;
      workable += 1;
      if (s.state === 'ocupado') busy += 1;
    });
  });
  return workable ? busy / workable : 0;
}

/** Horários livres num conjunto de dias. */
export function freeSlotsCount(
  prof: Pick<Professional, 'id' | 'workingHours'> | undefined,
  dateKeys: string[],
  appointments: SlotAppointment[],
  requests: BlockRequestRecord[] = [],
): number {
  return dateKeys.reduce((t, k) => t + daySlots(prof, k, appointments, requests).filter((s) => s.state === 'livre').length, 0);
}

/** Consultas do profissional que colidem com um período (aviso do modal de bloqueio). */
export function findConflictsIn<T extends SlotAppointment>(
  appointments: T[],
  professionalId: string,
  dateKey: string,
  start: string,
  end: string,
): T[] {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return appointments.filter((a) => {
    if (a.professionalId !== professionalId || !a.start.startsWith(dateKey)) return false;
    if (a.status === 'cancelada' || a.status === 'faltou' || a.status === 'concluida') return false;
    const [as, ae] = apptRange(a);
    return as < e && ae > s;
  });
}

/** Próxima consulta aguardando atendimento a partir de `now`. */
export function nextWaitingAppointment<T extends SlotAppointment>(list: T[], now: Date): T | undefined {
  return list
    .filter((a) => WAITING.includes(a.status) && new Date(a.start).getTime() + a.durationMin * 60000 > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

/* ------------------------------------------------------------------ */
/* Histórico autorizado                                                  */
/* ------------------------------------------------------------------ */

/** Marcador de atendimento de OUTRO profissional com um paciente meu: só a existência. */
export interface RestrictedMarker {
  appointmentId: string;
  patientId: string;
  patientName: string;
  date: string;
  durationMin: number;
}

/**
 * Atendimentos concluídos de outros profissionais com os MESMOS pacientes do profissional logado,
 * projetados em campos mínimos (sem serviço, especialidade, profissional ou conteúdo).
 * Backend: view `portal_restricted_history` com RLS — ver docs/change-requests/04-profissionais-portal.md.
 */
export function selectRestrictedMarkers(s: Database, ctx: AccessContext, nowIsoValue: string): RestrictedMarker[] {
  if (ctx.role !== 'profissional' || !ctx.professionalId) return [];
  const myPatients = new Set(s.appointments.filter((a) => a.professionalId === ctx.professionalId).map((a) => a.patientId));
  return s.appointments
    .filter((a) => a.professionalId !== ctx.professionalId && myPatients.has(a.patientId) && a.status === 'concluida' && a.start < nowIsoValue)
    .map((a) => ({ appointmentId: a.id, patientId: a.patientId, patientName: a.patientName, date: a.start, durationMin: a.durationMin }));
}

/**
 * Histórico do profissional (mais recentes primeiro): consultas próprias concluídas/faltas até
 * `now`, com o resumo do prontuário próprio quando existir, e opcionalmente os marcadores restritos.
 */
export function attendanceHistory(
  appointments: PortalAppointment[],
  records: ClinicalRecord[],
  now: Date,
  options: { restricted?: RestrictedMarker[]; patientId?: string } = {},
): PortalAttendanceRecord[] {
  const summaryByAppt = new Map(records.map((r) => [r.appointmentId, r.summary]));
  const nowMs = now.getTime();
  const own: PortalAttendanceRecord[] = appointments
    .filter((a) => (a.status === 'concluida' || a.status === 'faltou') && new Date(a.start).getTime() < nowMs)
    .map((a) => ({
      id: `rec-${a.id}`,
      appointmentId: a.id,
      patientId: a.patientId,
      patientName: a.patientName,
      date: a.start,
      durationMin: a.durationMin,
      outcome: a.status === 'faltou' ? 'faltou' : 'concluida',
      restricted: false,
      service: a.service,
      specialty: a.specialty,
      professionalName: a.professionalName,
      summary: a.status === 'faltou' ? 'Paciente não compareceu.' : summaryByAppt.get(a.id),
    }));
  const restricted: PortalAttendanceRecord[] = (options.restricted ?? []).map((m) => ({
    id: `rec-${m.appointmentId}`,
    appointmentId: m.appointmentId,
    patientId: m.patientId,
    patientName: m.patientName,
    date: m.date,
    durationMin: m.durationMin,
    outcome: 'concluida',
    restricted: true,
  }));
  return [...own, ...restricted]
    .filter((r) => !options.patientId || r.patientId === options.patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ */
/* Repasses (único dado financeiro do portal)                           */
/* ------------------------------------------------------------------ */

export interface PayoutSummaryData {
  monthLabel: string;
  /** Repasses do mês corrente (pagos + pendentes). */
  expected: number;
  /** Atendimentos concluídos no mês corrente. */
  attendances: number;
  /** Repasses pagos no mês anterior. */
  lastMonthPaid: number;
  /** Vencimento do próximo repasse pendente (AAAA-MM-DD). */
  nextPaymentDate?: string;
}

function monthKeyOf(d: Date): string {
  return toDateKey(d).slice(0, 7);
}

/** Resumo de "Meus repasses" a partir de `useMyPayouts()` (já filtrado ao profissional). */
export function payoutSummary(payouts: FinancialEntryRecord[], appointments: PortalAppointment[], now: Date): PayoutSummaryData {
  const month = monthKeyOf(now);
  const prev = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const inMonth = (e: FinancialEntryRecord, key: string) => (e.dueDate ?? e.date).startsWith(key);
  const label = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const next = payouts
    .filter((e) => e.status === 'pendente' || e.status === 'atrasado')
    .map((e) => e.dueDate ?? e.date)
    .sort()[0];
  return {
    monthLabel: label,
    expected: payouts.filter((e) => inMonth(e, month) && e.status !== 'estornado').reduce((t, e) => t + e.amount, 0),
    attendances: appointments.filter((a) => a.status === 'concluida' && a.start.startsWith(month)).length,
    lastMonthPaid: payouts.filter((e) => inMonth(e, prev) && e.status === 'pago').reduce((t, e) => t + e.amount, 0),
    nextPaymentDate: next?.slice(0, 10),
  };
}
