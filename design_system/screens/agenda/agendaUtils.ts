import type { Appointment, AppointmentStatus, Specialty } from '@ds/mocks/types';
import { toDateKey } from '@ds/mocks/clinical';

export type AgendaView = 'dia' | 'semana' | 'mes';

export interface AgendaFilters {
  professionalId: string; // 'todos' ou id
  specialties: Specialty[]; // vazio = todas
  status: AppointmentStatus | 'todos';
}

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 20;
/** Altura em px de uma hora nas grades de dia/semana. */
export const HOUR_HEIGHT = 88;

export const HOURS: number[] = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Segunda-feira da semana de `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = r.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDays(r, diff);
}

/** Segunda a sábado. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 6 }, (_, i) => addDays(start, i));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildIso(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00`;
}

/** Posição vertical (px) de um agendamento na grade. */
export function topFor(iso: string): number {
  const d = new Date(iso);
  return ((d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes()) * (HOUR_HEIGHT / 60);
}

export function heightFor(durationMin: number): number {
  return Math.max(28, durationMin * (HOUR_HEIGHT / 60) - 4);
}

export function applyFilters(list: Appointment[], f: AgendaFilters): Appointment[] {
  return list.filter(
    (a) =>
      (f.professionalId === 'todos' || a.professionalId === f.professionalId) &&
      (f.specialties.length === 0 || f.specialties.includes(a.specialty)) &&
      (f.status === 'todos' || a.status === f.status),
  );
}

/** Distribui agendamentos sobrepostos em colunas lado a lado. */
export function layoutOverlaps(list: Appointment[]): { appt: Appointment; col: number; cols: number }[] {
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
  const out: { appt: Appointment; col: number; cols: number }[] = [];
  let group: { appt: Appointment; col: number; end: number }[] = [];
  let groupEnd = 0;
  const flush = () => {
    const cols = group.reduce((m, g) => Math.max(m, g.col + 1), 0);
    group.forEach((g) => out.push({ appt: g.appt, col: g.col, cols }));
    group = [];
  };
  sorted.forEach((a) => {
    const s = new Date(a.start).getTime();
    const e = s + a.durationMin * 60000;
    if (group.length && s >= groupEnd) flush();
    const used = new Set(group.filter((g) => g.end > s).map((g) => g.col));
    let col = 0;
    while (used.has(col)) col += 1;
    group.push({ appt: a, col, end: e });
    groupEnd = Math.max(groupEnd, e);
  });
  if (group.length) flush();
  return out;
}

/** Horários (a cada 30 min) e seu estado para um profissional numa data. */
export function slotsFor(
  list: Appointment[],
  professionalId: string,
  dateKey: string,
  ignoreId?: string,
): { time: string; busy: boolean }[] {
  const busy = list.filter(
    (a) =>
      a.professionalId === professionalId &&
      a.id !== ignoreId &&
      a.status !== 'cancelada' &&
      a.start.startsWith(dateKey),
  );
  const slots: { time: string; busy: boolean }[] = [];
  for (let h = 8; h < 19; h += 1) {
    for (const m of [0, 30]) {
      const t = `${pad(h)}:${pad(m)}`;
      const start = new Date(buildIso(dateKey, t)).getTime();
      const end = start + 30 * 60000;
      const isBusy = busy.some((a) => {
        const s = new Date(a.start).getTime();
        const e = s + a.durationMin * 60000;
        return s < end && e > start;
      });
      slots.push({ time: t, busy: isBusy });
    }
  }
  return slots;
}

export { toDateKey };
