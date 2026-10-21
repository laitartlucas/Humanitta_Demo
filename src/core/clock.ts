/**
 * Relógio da demonstração. Todos os módulos usam ESTE "agora" para que dashboard, agenda,
 * portal e atendimentos contem a mesma história: segunda, 19/10/2026, a partir das 10:24.
 *
 * O relógio AVANÇA em tempo real a partir de DEMO_NOW desde que a página abriu (limite de 8 h, para
 * a demonstração nunca "virar o dia"). Assim início/fim de atendimento têm duração real e mensagens
 * novas ficam em ordem (CR 05 §4, CR 07 §4). Recarregar a página volta para 10:24.
 * No produto, `now()` passa a devolver `new Date()` — nenhuma tela deve instanciar datas "de hoje".
 */
import { toDateKey } from '@ds/mocks/clinical';

export const DEMO_NOW = new Date(2026, 9, 19, 10, 24);

const MAX_ELAPSED_MS = 8 * 60 * 60 * 1000;
/** Só avança no navegador; em testes (Node) o relógio fica parado em DEMO_NOW (determinístico). */
const TICKING = typeof window !== 'undefined';
let startedAt = Date.now();

/** Testes: fixa o início do relógio (ex.: `resetDemoClock()` em beforeEach). */
export function resetDemoClock(realNowMs: number = Date.now()): void {
  startedAt = realNowMs;
}

export function now(): Date {
  if (!TICKING) return new Date(DEMO_NOW.getTime());
  const elapsed = Math.min(Math.max(0, Date.now() - startedAt), MAX_ELAPSED_MS);
  return new Date(DEMO_NOW.getTime() + elapsed);
}

/** "AAAA-MM-DD" de hoje (demo). */
export function todayKey(): string {
  return toDateKey(now());
}

/** ISO local sem fuso (mesmo formato dos mocks: "2026-10-19T10:24:00"). */
export function nowIso(): string {
  const d = now();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Instante estritamente posterior a `after` (ISO local) — mantém a ordem de eventos no mesmo segundo. */
export function isoAfter(after: string | undefined): string {
  const current = nowIso();
  if (!after || current > after) return current;
  const d = new Date(after);
  d.setSeconds(d.getSeconds() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
