/**
 * Períodos dos relatórios: presets, intervalo anterior de comparação e agrupamento em faixas.
 * Datas são chaves "AAAA-MM-DD" (horário local, sem fuso), como no restante do core.
 */

export type PeriodPreset = 'hoje' | '7d' | '30d' | 'mes_atual' | 'mes_anterior' | 'personalizado';

export interface DateRange {
  /** "AAAA-MM-DD" inclusive. */
  from: string;
  to: string;
}

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'personalizado', label: 'Personalizado' },
];

export function isPeriodPreset(v: string): v is PeriodPreset {
  return PERIOD_PRESETS.some((p) => p.value === v);
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');

export function parseKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateKey(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return toKey(parseKey(v)) === v;
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** Quantidade de dias do intervalo (inclusive). */
export function rangeLength(r: DateRange): number {
  return Math.round((parseKey(r.to).getTime() - parseKey(r.from).getTime()) / 86_400_000) + 1;
}

export function daysOf(r: DateRange): string[] {
  const n = rangeLength(r);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(r.from, i));
}

function monthStart(key: string, offset = 0): string {
  const d = parseKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + offset, 1));
}

function monthEnd(key: string, offset = 0): string {
  const d = parseKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + offset + 1, 0));
}

/** Intervalo do preset em relação a "hoje" (`todayKey()` do core). */
export function resolvePeriod(preset: PeriodPreset, today: string, custom?: Partial<DateRange>): DateRange {
  switch (preset) {
    case 'hoje':
      return { from: today, to: today };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'mes_atual':
      return { from: monthStart(today), to: monthEnd(today) };
    case 'mes_anterior':
      return { from: monthStart(today, -1), to: monthEnd(today, -1) };
    case 'personalizado': {
      const from = custom?.from && isDateKey(custom.from) ? custom.from : today;
      const to = custom?.to && isDateKey(custom.to) ? custom.to : from;
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

/**
 * Intervalo de comparação: o mês anterior inteiro quando o período é um mês completo;
 * senão, o mesmo número de dias imediatamente antes.
 */
export function previousRange(r: DateRange): DateRange {
  const isFullMonth = r.from === monthStart(r.from) && r.to === monthEnd(r.from);
  if (isFullMonth) return { from: monthStart(r.from, -1), to: monthEnd(r.from, -1) };
  const n = rangeLength(r);
  return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
}

export function formatKeyBR(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

export function describeRange(r: DateRange): string {
  if (r.from === r.to) return formatKeyBR(r.from);
  const isFullMonth = r.from === monthStart(r.from) && r.to === monthEnd(r.from);
  if (isFullMonth) {
    const d = parseKey(r.from);
    return `${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
  }
  return `${formatKeyBR(r.from)} a ${formatKeyBR(r.to)}`;
}

export interface Bucket {
  /** Rótulo curto para o eixo dos gráficos. */
  label: string;
  from: string;
  to: string;
}

/** Faixas para gráficos de evolução: por dia até 31 dias, por semana até ~4 meses, senão por mês. */
export function bucketsOf(r: DateRange): Bucket[] {
  const n = rangeLength(r);
  if (n <= 31) {
    return daysOf(r).map((k) => ({ label: `${k.slice(8, 10)}/${k.slice(5, 7)}`, from: k, to: k }));
  }
  if (n <= 124) {
    const out: Bucket[] = [];
    for (let start = r.from; start <= r.to; start = addDays(start, 7)) {
      const end = addDays(start, 6) < r.to ? addDays(start, 6) : r.to;
      out.push({ label: `${start.slice(8, 10)}/${start.slice(5, 7)}`, from: start, to: end });
    }
    return out;
  }
  const out: Bucket[] = [];
  for (let start = monthStart(r.from); start <= r.to; start = monthStart(start, 1)) {
    const d = parseKey(start);
    out.push({
      label: `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      from: start < r.from ? r.from : start,
      to: monthEnd(start) > r.to ? r.to : monthEnd(start),
    });
  }
  return out;
}

/** Últimos `count` meses terminando no mês de `endKey` (para "evolução mensal"). */
export function lastMonths(endKey: string, count: number): Bucket[] {
  return Array.from({ length: count }, (_, i) => {
    const start = monthStart(endKey, i - count + 1);
    const d = parseKey(start);
    return { label: `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, from: start, to: monthEnd(start) };
  });
}

export const inRange = (key: string, r: DateRange) => {
  const day = key.slice(0, 10);
  return day >= r.from && day <= r.to;
};
