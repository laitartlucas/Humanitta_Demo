/**
 * Leituras do Financeiro. Funções PURAS sobre o banco compartilhado: os dados vêm dos seletores
 * com escopo do core (`selectFinancialEntries`, `selectAttendances`, `selectAppointments`) — nenhum
 * número é fixo e nada é guardado fora do `db`.
 *
 * Regras de totalização (iguais a `selectFinanceTotals` do core para Dashboard e Relatórios):
 * regime de competência pela data do lançamento (`date`); receita/despesa/repasse só contam pagos;
 * resultado = receitas − despesas − repasses; estornados não entram em nada.
 */
import {
  can,
  scopeByProfessional,
  selectAppointments,
  selectAttendances,
  selectFinancialEntries,
  todayKey,
  type AccessContext,
  type AppointmentRecord,
  type Database,
  type FinancialEntryRecord,
  type ID,
  type PaymentMethod,
  type PaymentStatus,
  type Professional,
  type Specialty,
} from '@core';
import { fromCents, sumCents, toCents, type Cents } from './money';
import { inRange, lastMonths, monthRange, type DateRange } from './periods';
import { effectiveStatus } from './status';

export type EntryType = FinancialEntryRecord['type'];

/** Lançamento com a situação efetiva calculada para hoje. */
export interface FinanceRow extends FinancialEntryRecord {
  effective: PaymentStatus;
}

const ov = (s: Database) => s.clinicSettings.permissionOverrides;

export function toRows(entries: readonly FinancialEntryRecord[], today: string): FinanceRow[] {
  return entries.map((e) => ({ ...e, effective: effectiveStatus(e, today) }));
}

/** Lançamentos visíveis ao contexto (financeiro geral). Profissional/recepção: lista vazia. */
export function selectFinanceRows(s: Database, ctx: AccessContext): FinanceRow[] {
  return toRows(selectFinancialEntries(s, ctx), todayKey());
}

/* ------------------------------ Filtros ------------------------------ */

export type SortKey = 'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc' | 'vencimento_asc';

export const SORT_LABEL: Record<SortKey, string> = {
  data_desc: 'Mais recentes',
  data_asc: 'Mais antigos',
  valor_desc: 'Maior valor',
  valor_asc: 'Menor valor',
  vencimento_asc: 'Vencimento mais próximo',
};

export interface EntryFilters {
  types?: EntryType[];
  range?: DateRange;
  /** Situação EFETIVA (vencido inclui pendentes com vencimento passado). */
  status?: PaymentStatus | 'todos';
  /** Só em aberto (pendente ou vencido). */
  openOnly?: boolean;
  query?: string;
  category?: string;
  professionalId?: ID;
  method?: PaymentMethod;
  sort?: SortKey;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterRows(rows: readonly FinanceRow[], f: EntryFilters): FinanceRow[] {
  const q = f.query ? norm(f.query.trim()) : '';
  const list = rows.filter((e) => {
    if (f.types?.length && !f.types.includes(e.type)) return false;
    if (f.range && !inRange(e.date, f.range)) return false;
    if (f.status && f.status !== 'todos' && e.effective !== f.status) return false;
    if (f.openOnly && e.effective !== 'pendente' && e.effective !== 'atrasado') return false;
    if (f.category && e.category !== f.category) return false;
    if (f.professionalId && e.professionalId !== f.professionalId) return false;
    if (f.method && e.method !== f.method) return false;
    if (q && ![e.description, e.category, e.patientName ?? '', e.professionalName ?? ''].some((v) => norm(v).includes(q))) return false;
    return true;
  });
  const sort = f.sort ?? 'data_desc';
  const byDate = (a: FinanceRow, b: FinanceRow) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
  const cmp: Record<SortKey, (a: FinanceRow, b: FinanceRow) => number> = {
    data_desc: (a, b) => -byDate(a, b),
    data_asc: byDate,
    valor_desc: (a, b) => toCents(b.amount) - toCents(a.amount) || -byDate(a, b),
    valor_asc: (a, b) => toCents(a.amount) - toCents(b.amount) || -byDate(a, b),
    vencimento_asc: (a, b) => (a.dueDate ?? a.date).localeCompare(b.dueDate ?? b.date) || byDate(a, b),
  };
  return list.sort(cmp[sort]);
}

/* ----------------------------- Indicadores ----------------------------- */

export interface PeriodTotals {
  /** Receitas pagas (competência no período). */
  revenue: number;
  /** Despesas pagas. */
  expenses: number;
  /** Repasses pagos. */
  payouts: number;
  /** revenue − expenses − payouts. */
  balance: number;
  /** Receitas pendentes ainda dentro do prazo. */
  receivable: number;
  /** Receitas vencidas. */
  overdueReceivable: number;
  /** Despesas + repasses em aberto (pendentes e vencidos). */
  payable: number;
  /** Despesas + repasses vencidos. */
  overduePayable: number;
  /** Lançados (todas as situações exceto estornado). */
  launchedRevenue: number;
  launchedExpenses: number;
  launchedPayouts: number;
  /** Baixas registradas com data de pagamento no período. */
  paymentsCount: number;
  paymentsTotal: number;
}

export function computeTotals(rows: readonly FinanceRow[], range: DateRange): PeriodTotals {
  const inPeriod = rows.filter((e) => inRange(e.date, range));
  const sum = (pred: (e: FinanceRow) => boolean): Cents => sumCents(inPeriod.filter(pred));
  const revenue = sum((e) => e.type === 'receita' && e.effective === 'pago');
  const expenses = sum((e) => e.type === 'despesa' && e.effective === 'pago');
  const payouts = sum((e) => e.type === 'repasse' && e.effective === 'pago');
  const paid = rows.filter((e) => e.effective === 'pago' && inRange(e.paidAt ?? e.date, range));
  return {
    revenue: fromCents(revenue),
    expenses: fromCents(expenses),
    payouts: fromCents(payouts),
    balance: fromCents(revenue - expenses - payouts),
    receivable: fromCents(sum((e) => e.type === 'receita' && e.effective === 'pendente')),
    overdueReceivable: fromCents(sum((e) => e.type === 'receita' && e.effective === 'atrasado')),
    payable: fromCents(sum((e) => e.type !== 'receita' && (e.effective === 'pendente' || e.effective === 'atrasado'))),
    overduePayable: fromCents(sum((e) => e.type !== 'receita' && e.effective === 'atrasado')),
    launchedRevenue: fromCents(sum((e) => e.type === 'receita' && e.effective !== 'estornado')),
    launchedExpenses: fromCents(sum((e) => e.type === 'despesa' && e.effective !== 'estornado')),
    launchedPayouts: fromCents(sum((e) => e.type === 'repasse' && e.effective !== 'estornado')),
    paymentsCount: paid.length,
    paymentsTotal: fromCents(sumCents(paid)),
  };
}

/** Variação percentual; `null` quando não há base de comparação (período anterior zerado). */
export function percentChange(current: number, previous: number): number | null {
  const prev = toCents(previous);
  if (prev === 0) return null;
  return ((toCents(current) - prev) / Math.abs(prev)) * 100;
}

export interface StatusTotals {
  paid: number;
  open: number;
  overdue: number;
  count: number;
}

/** Totais por situação efetiva de um tipo no período (pago · pendente no prazo · vencido). */
export function statusTotals(rows: readonly FinanceRow[], type: EntryType, range: DateRange): StatusTotals {
  const list = rows.filter((e) => e.type === type && inRange(e.date, range));
  const sum = (s: PaymentStatus) => fromCents(sumCents(list.filter((e) => e.effective === s)));
  return { paid: sum('pago'), open: sum('pendente'), overdue: sum('atrasado'), count: list.length };
}

/* ------------------------------ Gráficos ------------------------------ */

export interface MonthPoint {
  month: string;
  revenue: number;
  expenses: number;
  payouts: number;
  balance: number;
}

/** Série mensal (competência, só pagos) dos `n` meses que terminam em `endMonth`. */
export function monthlySeries(rows: readonly FinanceRow[], endMonth: string, n = 12): MonthPoint[] {
  return lastMonths(endMonth, n).map((month) => {
    const t = computeTotals(rows, monthRange(month));
    return { month, revenue: t.revenue, expenses: t.expenses, payouts: t.payouts, balance: t.balance };
  });
}

export interface Slice<K extends string = string> {
  key: K;
  value: number;
}

function groupSum<K extends string>(list: readonly FinanceRow[], keyOf: (e: FinanceRow) => K | undefined): Slice<K>[] {
  const map = new Map<K, Cents>();
  for (const e of list) {
    const k = keyOf(e);
    if (k === undefined) continue;
    map.set(k, (map.get(k) ?? 0) + toCents(e.amount));
  }
  return [...map.entries()].map(([key, c]) => ({ key, value: fromCents(c) })).sort((a, b) => b.value - a.value);
}

/** Receitas pagas no período por especialidade do profissional vinculado. */
export function revenueBySpecialty(rows: readonly FinanceRow[], range: DateRange, professionals: readonly Professional[]): Slice<Specialty | 'sem_vinculo'>[] {
  const spec = new Map(professionals.map((p) => [p.id, p.specialty]));
  return groupSum(
    rows.filter((e) => e.type === 'receita' && e.effective === 'pago' && inRange(e.date, range)),
    (e) => (e.professionalId && spec.get(e.professionalId)) || 'sem_vinculo',
  );
}

/** Receitas recebidas no período (pela data de pagamento) por forma de pagamento. */
export function receivedByMethod(rows: readonly FinanceRow[], range: DateRange): Slice<PaymentMethod>[] {
  return groupSum(
    rows.filter((e) => e.type === 'receita' && e.effective === 'pago' && inRange(e.paidAt ?? e.date, range)),
    (e) => e.method,
  );
}

/** Receitas do período por situação efetiva (pago, pendente, vencido, estornado). */
export function receivableByStatus(rows: readonly FinanceRow[], range: DateRange): Slice<PaymentStatus>[] {
  return groupSum(rows.filter((e) => e.type === 'receita' && inRange(e.date, range)), (e) => e.effective);
}

/** Despesas do período (exceto estornadas) por categoria. */
export function expensesByCategory(rows: readonly FinanceRow[], range: DateRange): Slice[] {
  return groupSum(rows.filter((e) => e.type === 'despesa' && e.effective !== 'estornado' && inRange(e.date, range)), (e) => e.category);
}

/** Repasses do período (exceto estornados) por profissional. */
export function payoutsByProfessional(rows: readonly FinanceRow[], range: DateRange): Slice[] {
  return groupSum(rows.filter((e) => e.type === 'repasse' && e.effective !== 'estornado' && inRange(e.date, range)), (e) => e.professionalId);
}

/** Histórico de baixas: lançamentos pagos, do pagamento mais recente para o mais antigo. */
export function paymentHistory(rows: readonly FinanceRow[], range?: DateRange): FinanceRow[] {
  return rows
    .filter((e) => e.effective === 'pago' && (!range || inRange(e.paidAt ?? e.date, range)))
    .sort((a, b) => (b.paidAt ?? b.date).localeCompare(a.paidAt ?? a.date) || b.id.localeCompare(a.id));
}

/* ------------------------------ Repasses ------------------------------ */

/**
 * Regra de repasse DEMONSTRATIVA. O contrato não define percentuais oficiais da clínica; este
 * valor existe só para a apresentação e deve ser substituído pela regra real (CR 06-financeiro).
 */
export const DEMO_PAYOUT_RULE = {
  percent: 40,
  label: 'Regra demonstrativa: 40% da receita recebida no período',
} as const;

export interface PayoutLine {
  professionalId: ID;
  professionalName: string;
  specialty: Specialty;
  /** Atendimentos finalizados no período. */
  attendances: number;
  /** Receitas pagas vinculadas ao profissional (base de cálculo). `null` = perfil sem acesso ao financeiro geral. */
  base: number | null;
  percent: number;
  /** Repasse calculado pela regra demonstrativa (`null` quando a base é desconhecida). */
  calculated: number | null;
  /** Repasse já lançado para este profissional neste período (não estornado). */
  existing?: FinanceRow;
}

/** Repasses visíveis: todos (admin/financeiro) ou só os do próprio profissional. */
export function selectPayoutRows(s: Database, ctx: AccessContext): FinanceRow[] {
  const repasses = s.financialEntries.filter((e): e is FinancialEntryRecord & { professionalId: ID } => e.type === 'repasse' && Boolean(e.professionalId));
  return toRows(scopeByProfessional(ctx, 'repasses', repasses, ov(s)), todayKey()).sort((a, b) => b.date.localeCompare(a.date));
}

/** Repasse já lançado para o profissional no período (identificado pela data de fechamento). */
export function findPayoutFor(rows: readonly FinanceRow[], professionalId: ID, period: DateRange): FinanceRow | undefined {
  return rows.find((e) => e.type === 'repasse' && e.professionalId === professionalId && e.date === period.to && e.status !== 'estornado');
}

/**
 * Apuração de repasses do período por profissional (escopo aplicado: o profissional só vê a
 * própria linha e nunca a base de faturamento da clínica).
 */
export function selectPayoutStatement(s: Database, ctx: AccessContext, period: DateRange): PayoutLine[] {
  const payouts = selectPayoutRows(s, ctx);
  const seeRevenue = can(ctx, 'financeiro', 'ver', ov(s));
  const revenue = seeRevenue ? toRows(selectFinancialEntries(s, ctx), todayKey()) : [];
  const attendances = selectAttendances(s, ctx).filter((a) => a.status === 'finalizado' && inRange(a.finishedAt, period));
  const professionals = scopeByProfessional(
    ctx,
    'repasses',
    s.professionals.map((p) => ({ ...p, professionalId: p.id })),
    ov(s),
  );
  return professionals
    .map((p): PayoutLine => {
      const baseCents = seeRevenue
        ? sumCents(revenue.filter((e) => e.type === 'receita' && e.effective === 'pago' && e.professionalId === p.id && inRange(e.date, period)))
        : null;
      return {
        professionalId: p.id,
        professionalName: p.name,
        specialty: p.specialty,
        attendances: attendances.filter((a) => a.professionalId === p.id).length,
        base: baseCents === null ? null : fromCents(baseCents),
        percent: DEMO_PAYOUT_RULE.percent,
        calculated: baseCents === null ? null : fromCents(Math.round((baseCents * DEMO_PAYOUT_RULE.percent) / 100)),
        existing: findPayoutFor(payouts, p.id, period),
      };
    })
    .sort((a, b) => a.professionalName.localeCompare(b.professionalName, 'pt-BR'));
}

/* ------------------------- Vínculo com atendimentos ------------------------- */

/** Receita ativa (não estornada) já vinculada ao agendamento, se houver. */
export function findChargeFor(entries: readonly FinancialEntryRecord[], appointmentId: ID): FinancialEntryRecord | undefined {
  return entries.find((e) => e.type === 'receita' && e.appointmentId === appointmentId && e.status !== 'estornado');
}

/**
 * Consultas concluídas ainda sem cobrança. Servem para a equipe lançar a receita manualmente —
 * o contrato não prevê geração automática de cobrança a partir de atendimentos.
 */
export function selectBillableAppointments(s: Database, ctx: AccessContext): AppointmentRecord[] {
  if (!can(ctx, 'financeiro', 'editar', ov(s))) return [];
  return selectAppointments(s, ctx, { statuses: ['concluida'] })
    .filter((a) => !findChargeFor(s.financialEntries, a.id))
    .sort((a, b) => b.start.localeCompare(a.start));
}
