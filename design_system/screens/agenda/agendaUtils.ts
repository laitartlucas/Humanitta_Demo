import type { AppointmentFilters, AppointmentRecord, AppointmentStatus, Specialty } from '@core';
import { toDateKey } from '@ds/mocks/clinical';

export type AgendaView = 'dia' | 'semana' | 'mes';

export interface AgendaFilters {
  professionalId: string; // 'todos' ou id
  specialties: Specialty[]; // vazio = todas
  roomId: string; // 'todas' ou id
  status: AppointmentStatus | 'todos';
}

export const EMPTY_FILTERS: AgendaFilters = { professionalId: 'todos', specialties: [], roomId: 'todas', status: 'todos' };

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

/** Data local a partir de "AAAA-MM-DD" ou ISO local. */
export function parseKey(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Posição vertical (px) de um agendamento na grade. */
export function topFor(iso: string): number {
  const d = new Date(iso);
  return ((d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes()) * (HOUR_HEIGHT / 60);
}

export function heightFor(durationMin: number): number {
  return Math.max(28, durationMin * (HOUR_HEIGHT / 60) - 4);
}

/** Faixa (px) de um intervalo em minutos do dia, recortada à grade visível. */
export function rangeBox(startMin: number, endMin: number): { top: number; height: number } | null {
  const s = Math.max(startMin, DAY_START_HOUR * 60);
  const e = Math.min(endMin, DAY_END_HOUR * 60);
  if (e <= s) return null;
  return { top: (s - DAY_START_HOUR * 60) * (HOUR_HEIGHT / 60), height: (e - s) * (HOUR_HEIGHT / 60) };
}

/** Período (AAAA-MM-DD, inclusivo) exibido pela visão atual. */
export function periodRange(view: AgendaView, date: Date): { from: string; to: string } {
  if (view === 'dia') return { from: toDateKey(date), to: toDateKey(date) };
  if (view === 'semana') {
    const days = weekDays(date);
    return { from: toDateKey(days[0]), to: toDateKey(days[days.length - 1]) };
  }
  const first = startOfMonth(date);
  return { from: toDateKey(first), to: toDateKey(new Date(first.getFullYear(), first.getMonth() + 1, 0)) };
}

/** Filtros da tela → filtros do seletor compartilhado (`useAppointments`). */
export function toCoreFilters(f: AgendaFilters): AppointmentFilters {
  return {
    professionalIds: f.professionalId === 'todos' ? undefined : [f.professionalId],
    specialties: f.specialties.length ? f.specialties : undefined,
    roomIds: f.roomId === 'todas' ? undefined : [f.roomId],
    statuses: f.status === 'todos' ? undefined : [f.status],
  };
}

export function hasActiveFilters(f: AgendaFilters): boolean {
  return f.professionalId !== 'todos' || f.specialties.length > 0 || f.roomId !== 'todas' || f.status !== 'todos';
}

/** Distribui agendamentos sobrepostos em colunas lado a lado. */
export function layoutOverlaps(list: AppointmentRecord[]): { appt: AppointmentRecord; col: number; cols: number }[] {
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
  const out: { appt: AppointmentRecord; col: number; cols: number }[] = [];
  let group: { appt: AppointmentRecord; col: number; end: number }[] = [];
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

export { toDateKey };
