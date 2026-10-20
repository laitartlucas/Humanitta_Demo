import type { AppointmentStatus } from '@ds/mocks/types';
import { formatTime, parseDate } from '@ds/mocks/clinical';
import type { BlockRequestStatus, PortalAppointment } from '@ds/mocks/portal';

export const WAITING_STATUSES: AppointmentStatus[] = ['agendada', 'confirmada', 'reagendada'];

export function isWaiting(status: AppointmentStatus): boolean {
  return WAITING_STATUSES.includes(status);
}

export function endTimeOf(a: PortalAppointment): string {
  return formatTime(new Date(new Date(a.start).getTime() + a.durationMin * 60000));
}

export function timeRange(a: PortalAppointment): string {
  return `${formatTime(a.start)}–${endTimeOf(a)}`;
}

/** "Bom dia" / "Boa tarde" / "Boa noite". */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "Segunda, 19 de outubro de 2026". */
export function longDate(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace('-feira', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "23/10" a partir de AAAA-MM-DD ou ISO. */
export function shortDate(value: string): string {
  const d = value.length === 10 ? parseDate(value) : new Date(value);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** "qui., 23/10". */
export function weekdayDate(value: string): string {
  const d = value.length === 10 ? parseDate(value) : new Date(value);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function minutesBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - new Date(fromIso).getTime()) / 60000));
}

export const REQUEST_STATUS_LABEL: Record<BlockRequestStatus, string> = {
  enviada: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
};
