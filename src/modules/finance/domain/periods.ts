/**
 * Períodos do Financeiro. Datas são chaves "AAAA-MM-DD" (mesmo formato do modelo); as contas são
 * feitas em UTC para não sofrer com fuso/horário de verão.
 */

/** Intervalo fechado de dias ("AAAA-MM-DD", inclusive nas duas pontas). */
export interface DateRange {
  from: string;
  to: string;
}

export type PeriodPreset = 'mes_atual' | 'mes_anterior' | 'ultimos_3_meses' | 'ano' | 'personalizado';

export const PERIOD_PRESET_LABEL: Record<PeriodPreset, string> = {
  mes_atual: 'Mês atual',
  mes_anterior: 'Mês anterior',
  ultimos_3_meses: 'Últimos 3 meses',
  ano: 'Ano até hoje',
  personalizado: 'Personalizado',
};

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const pad = (n: number) => String(n).padStart(2, '0');

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** "AAAA-MM-DD" válido no calendário (rejeita 2026-02-30). */
export function isValidDateKey(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const year = Number(s.slice(0, 4));
  return year >= 2000 && year <= 2100 && format(parse(s)) === s;
}

export function addDays(key: string, days: number): string {
  const d = parse(key);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

/** "AAAA-MM" deslocado em `n` meses. */
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function lastDayOfMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return format(new Date(Date.UTC(y, m, 0)));
}

export function monthRange(monthKey: string): DateRange {
  return { from: `${monthKey}-01`, to: lastDayOfMonth(monthKey) };
}

export function inRange(key: string | undefined, r: DateRange): boolean {
  return Boolean(key) && key!.slice(0, 10) >= r.from && key!.slice(0, 10) <= r.to;
}

/** Dias do intervalo (inclusive). */
export function rangeLength(r: DateRange): number {
  return Math.round((parse(r.to).getTime() - parse(r.from).getTime()) / 86_400_000) + 1;
}

function isWholeMonths(r: DateRange): boolean {
  return r.from.endsWith('-01') && r.to === lastDayOfMonth(r.to.slice(0, 7));
}

function monthsBetween(r: DateRange): number {
  const [y1, m1] = r.from.split('-').map(Number);
  const [y2, m2] = r.to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/**
 * Período imediatamente anterior, de mesmo tamanho. Meses inteiros comparam com meses inteiros
 * (outubro → setembro); intervalos livres comparam com o mesmo número de dias.
 */
export function previousRange(r: DateRange): DateRange {
  if (isWholeMonths(r)) {
    const n = monthsBetween(r);
    const fromMonth = addMonths(r.from.slice(0, 7), -n);
    return { from: `${fromMonth}-01`, to: lastDayOfMonth(addMonths(r.to.slice(0, 7), -n)) };
  }
  const len = rangeLength(r);
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

export function presetRange(preset: PeriodPreset, today: string, custom?: DateRange): DateRange {
  const month = today.slice(0, 7);
  switch (preset) {
    case 'mes_atual':
      return monthRange(month);
    case 'mes_anterior':
      return monthRange(addMonths(month, -1));
    case 'ultimos_3_meses':
      return { from: `${addMonths(month, -2)}-01`, to: lastDayOfMonth(month) };
    case 'ano':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'personalizado':
      return custom && isValidDateKey(custom.from) && isValidDateKey(custom.to) && custom.from <= custom.to
        ? custom
        : monthRange(month);
  }
}

/** Meses ("AAAA-MM") terminando em `endMonth`, do mais antigo ao mais novo. */
export function lastMonths(endMonth: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(endMonth, i - (n - 1)));
}

/** "out/26" */
export function monthShortLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
}

/** "Outubro de 2026" */
export function monthLongLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

const br = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;

/** Rótulo legível: "Outubro de 2026", "Agosto a outubro de 2026" ou "01/10/2026 – 15/10/2026". */
export function rangeLabel(r: DateRange): string {
  if (isWholeMonths(r)) {
    const a = r.from.slice(0, 7);
    const b = r.to.slice(0, 7);
    if (a === b) return monthLongLabel(a);
    if (a.slice(0, 4) === b.slice(0, 4)) {
      const first = MONTHS[Number(a.slice(5)) - 1];
      return `${first.charAt(0).toUpperCase()}${first.slice(1)} a ${MONTHS[Number(b.slice(5)) - 1]} de ${b.slice(0, 4)}`;
    }
  }
  return `${br(r.from)} – ${br(r.to)}`;
}

/** Período curto para legendas de comparação ("set/26" ou "01/09 – 30/09"). */
export function rangeShortLabel(r: DateRange): string {
  if (isWholeMonths(r) && r.from.slice(0, 7) === r.to.slice(0, 7)) return monthShortLabel(r.from.slice(0, 7));
  return `${r.from.slice(8, 10)}/${r.from.slice(5, 7)} – ${r.to.slice(8, 10)}/${r.to.slice(5, 7)}`;
}

export interface Fortnight {
  id: string;
  label: string;
  range: DateRange;
}

/** Quinzenas de repasse (1–15 e 16–fim do mês), da mais recente para trás. */
export function fortnights(today: string, count: number): Fortnight[] {
  const list: Fortnight[] = [];
  let month = today.slice(0, 7);
  let half: 1 | 2 = Number(today.slice(8, 10)) <= 15 ? 1 : 2;
  while (list.length < count) {
    const range = half === 1 ? { from: `${month}-01`, to: `${month}-15` } : { from: `${month}-16`, to: lastDayOfMonth(month) };
    list.push({ id: `${month}-q${half}`, label: `${half}ª quinzena de ${monthShortLabel(month)}`, range });
    if (half === 2) half = 1;
    else {
      half = 2;
      month = addMonths(month, -1);
    }
  }
  return list;
}
