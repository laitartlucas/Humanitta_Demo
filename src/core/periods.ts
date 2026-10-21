/**
 * Comparativo entre períodos — regra ÚNICA para Dashboard, Financeiro e Relatórios.
 *
 * Problema corrigido (Agente 09): "Mês atual" (1–31/10, ainda em andamento) era comparado com o
 * mês anterior INTEIRO (1–30/09), o que dava quedas artificiais (ex.: −44%).
 *
 * Regra: se o período é formado por meses de calendário inteiros e ainda está em andamento
 * (hoje cai dentro dele, antes do último dia), compara-se do primeiro dia até HOJE com os MESMOS
 * dias do período anterior, limitados ao fim de cada mês (1–31/03 → 1–28/02).
 * Nos demais casos (mês fechado, intervalo livre), o anterior é o período fechado equivalente.
 * Datas no formato local "AAAA-MM-DD" (sem fuso).
 */

export interface DayRange {
  /** "AAAA-MM-DD" inclusive. */
  from: string;
  to: string;
}

export interface ComparablePeriods {
  /** Intervalo do período atual usado NA COMPARAÇÃO (pode terminar hoje). */
  current: DayRange;
  /** Intervalo anterior equivalente. */
  previous: DayRange;
  /** true = período em andamento comparado "até hoje" com os mesmos dias do anterior. */
  partial: boolean;
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const pad = (n: number) => String(n).padStart(2, '0');
const ym = (y: number, m: number) => `${y}-${pad(m)}`; // m: 1..12

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function lastDay(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${monthKey}-${pad(daysInMonth(y, m))}`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ym(d.getFullYear(), d.getMonth() + 1);
}

function monthsSpan(r: DayRange): number {
  const [y1, m1] = r.from.split('-').map(Number);
  const [y2, m2] = r.to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** O intervalo é formado por meses de calendário inteiros (1º dia → último dia)? */
export function isWholeMonths(r: DayRange): boolean {
  return r.from.endsWith('-01') && r.to === lastDay(r.to.slice(0, 7)) && r.from <= r.to;
}

/** Período anterior "fechado": meses inteiros → os N meses anteriores; senão, o mesmo nº de dias antes. */
export function closedPreviousRange(r: DayRange): DayRange {
  if (isWholeMonths(r)) {
    const n = monthsSpan(r);
    return { from: `${shiftMonth(r.from.slice(0, 7), -n)}-01`, to: lastDay(shiftMonth(r.to.slice(0, 7), -n)) };
  }
  const len = diffDays(r.from, r.to) + 1;
  return { from: addDaysKey(r.from, -len), to: addDaysKey(r.from, -1) };
}

/**
 * Intervalos comparáveis para indicadores "vs. período anterior".
 * @param today "AAAA-MM-DD" do relógio da aplicação (`todayKey()` do core).
 */
export function comparablePeriods(range: DayRange, today: string): ComparablePeriods {
  const ongoing = isWholeMonths(range) && today >= range.from && today < range.to;
  if (!ongoing) return { current: range, previous: closedPreviousRange(range), partial: false };

  const n = monthsSpan(range);
  const prevFromMonth = shiftMonth(range.from.slice(0, 7), -n);
  // Mesmo "dia corrido" do anterior, limitado ao fim do mês correspondente a hoje no período anterior.
  const todayMonthPrev = shiftMonth(today.slice(0, 7), -n);
  const [py, pm] = todayMonthPrev.split('-').map(Number);
  const day = Math.min(Number(today.slice(8, 10)), daysInMonth(py, pm));
  return {
    current: { from: range.from, to: today },
    previous: { from: `${prevFromMonth}-01`, to: `${todayMonthPrev}-${pad(day)}` },
    partial: true,
  };
}

function shortDay(key: string): string {
  return `${Number(key.slice(8, 10))} ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}`;
}

/** "1–19 out" / "1 set–19 out" / "19 out". */
export function formatDayRange(r: DayRange): string {
  if (r.from === r.to) return shortDay(r.from);
  if (r.from.slice(0, 7) === r.to.slice(0, 7)) return `${Number(r.from.slice(8, 10))}–${shortDay(r.to)}`;
  return `${shortDay(r.from)}–${shortDay(r.to)}`;
}

/** Legenda explícita do comparativo parcial: "1–19 out vs. 1–19 set". */
export function comparisonCaption(c: ComparablePeriods): string {
  return `${formatDayRange(c.current)} vs. ${formatDayRange(c.previous)}`;
}
