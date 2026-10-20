/**
 * Agente 07 — horários livres a partir da agenda COMPARTILHADA (somente leitura).
 * Usa `appointmentService.findConflicts` (mesma regra da Agenda: consultas ativas + bloqueios
 * aprovados), então nunca oferece um horário que a Agenda recusaria.
 */
import { appointmentService, now, type ID, type Professional, type Specialty } from '@core';

export interface SlotOption {
  professionalId: ID;
  professionalName: string;
  specialty: Specialty;
  /** ISO local "AAAA-MM-DDTHH:mm:00". */
  start: string;
  label: string;
}

export interface SlotQuery {
  specialty?: Specialty;
  professionalId?: ID;
  durationMin?: number;
  /** Dias à frente a pesquisar (padrão 7). */
  days?: number;
  limit?: number;
  /** Início da busca (padrão: relógio da demonstração). */
  from?: Date;
}

const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const STEP_MIN = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** "ter, 20/10 · 09h00" */
export function formatSlot(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}h${pad(d.getMinutes())}`;
}

export function findAvailableSlots(professionals: Professional[], q: SlotQuery = {}): SlotOption[] {
  const { durationMin = 50, days = 7, limit = 3 } = q;
  const from = q.from ?? now();
  const pros = professionals.filter(
    (p) => (!q.professionalId || p.id === q.professionalId) && (!q.specialty || p.specialty === q.specialty),
  );
  const out: SlotOption[] = [];
  for (let offset = 0; offset < days && out.length < limit; offset++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
    const candidates: SlotOption[] = [];
    for (const p of pros) {
      for (const wh of p.workingHours.filter((w) => w.weekday === day.getDay())) {
        for (let m = toMin(wh.start); m + durationMin <= toMin(wh.end); m += STEP_MIN) {
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
          if (start <= from) continue;
          const iso = toIso(start);
          const c = appointmentService.findConflicts(p.id, iso, durationMin);
          if (c.appointments.length || c.blocks.length) continue;
          candidates.push({ professionalId: p.id, professionalName: p.name, specialty: p.specialty, start: iso, label: `${formatSlot(iso)} · ${p.name}` });
          break; // um horário por faixa de atendimento por dia mantém as opções variadas
        }
      }
    }
    candidates.sort((a, b) => a.start.localeCompare(b.start));
    out.push(...candidates.slice(0, limit - out.length));
  }
  return out;
}
