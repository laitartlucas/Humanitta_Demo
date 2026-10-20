/**
 * Relógio da demonstração. Todos os módulos usam ESTE "agora" para que dashboard, agenda,
 * portal e atendimentos contem a mesma história: segunda, 19/10/2026, 10:24.
 * No produto, `now()` passa a devolver `new Date()` — nenhuma tela deve instanciar datas "de hoje".
 */
import { toDateKey } from '@ds/mocks/clinical';

export const DEMO_NOW = new Date(2026, 9, 19, 10, 24);

export function now(): Date {
  return new Date(DEMO_NOW.getTime());
}

/** "AAAA-MM-DD" de hoje (demo). */
export function todayKey(): string {
  return toDateKey(DEMO_NOW);
}

/** ISO local sem fuso (mesmo formato dos mocks: "2026-10-19T10:24:00"). */
export function nowIso(): string {
  const d = now();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
