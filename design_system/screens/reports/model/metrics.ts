/**
 * Relatórios — cálculos PUROS sobre o banco compartilhado (sem números paralelos).
 *
 * Toda leitura passa pelos seletores com escopo do core (`selectAppointments`, `selectAttendances`,
 * `selectFinancialEntries`, `selectPatients`), então o mesmo perfil vê aqui exatamente o que vê nos
 * demais módulos. Nada de conteúdo clínico: prontuários (`clinicalRecords`) nunca são lidos.
 */
import { can, comparablePeriods, selectAppointments, selectAttendances, selectFinancialEntries, selectPatients, todayKey } from '@core';
import type {
  AccessContext,
  AppointmentRecord,
  AppointmentStatus,
  Attendance,
  Database,
  FinancialEntryRecord,
  ID,
  PaymentMethod,
  Specialty,
} from '@core';
import { SPECIALTY_HEX, SPECIALTY_NAMES } from '@ds/mocks/clinical';
import { PAYMENT_METHOD_LABEL } from '@ds/mocks/business';
import { bucketsOf, daysOf, inRange, lastMonths, parseKey, previousRange, type Bucket, type DateRange } from './period';

/* ------------------------------------------------------------------ */
/* Filtros e acesso                                                     */
/* ------------------------------------------------------------------ */

export interface ReportFilters {
  range: DateRange;
  professionalId?: ID;
  specialty?: Specialty;
  /** Nome do serviço (os agendamentos ainda não têm `serviceId` preenchido). */
  service?: string;
  status?: AppointmentStatus;
}

export interface ReportAccess {
  /** Relatórios de agenda, atendimentos, profissionais. */
  operational: boolean;
  /** Profissional: somente os próprios registros. */
  ownScope: boolean;
  financial: boolean;
  /** Repasses por profissional. */
  payouts: boolean;
  /** Indicadores de cadastro de pacientes. */
  patients: boolean;
  communication: boolean;
}

export function selectReportAccess(s: Database, ctx: AccessContext): ReportAccess {
  const ov = s.clinicSettings.permissionOverrides;
  const financial = can(ctx, 'relatorios_financeiros', 'ver', ov) && can(ctx, 'financeiro', 'ver', ov);
  return {
    operational: can(ctx, 'relatorios_operacionais', 'proprio', ov),
    ownScope: !can(ctx, 'relatorios_operacionais', 'ver', ov),
    financial,
    payouts: financial && can(ctx, 'repasses', 'ver', ov),
    patients: can(ctx, 'relatorios_operacionais', 'ver', ov) && can(ctx, 'pacientes_cadastro', 'ver', ov),
    communication: can(ctx, 'whatsapp', 'ver', ov),
  };
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                          */
/* ------------------------------------------------------------------ */

export interface Comparison {
  current: number;
  previous: number;
  /** Variação percentual; null quando não há base de comparação (anterior = 0). */
  deltaPct: number | null;
}

export function compare(current: number, previous: number): Comparison {
  if (previous === 0) return { current, previous, deltaPct: current === 0 ? 0 : null };
  return { current, previous, deltaPct: ((current - previous) / previous) * 100 };
}

/** Razão segura: null quando o denominador é zero (nunca NaN/Infinity). */
export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export interface DistributionRow {
  id: string;
  label: string;
  value: number;
  color?: string;
}

function distribution<T>(items: T[], key: (i: T) => string, label: (k: string) => string, weight: (i: T) => number = () => 1): DistributionRow[] {
  const acc = new Map<string, number>();
  for (const i of items) acc.set(key(i), (acc.get(key(i)) ?? 0) + weight(i));
  return Array.from(acc, ([id, value]) => ({ id, label: label(id), value }))
    .filter((r) => r.value !== 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
}

const sum = <T>(items: T[], f: (i: T) => number) => items.reduce((t, i) => t + f(i), 0);

/** Status que não representam uma consulta efetiva (o reagendamento gera um novo registro). */
const NOT_BOOKED: AppointmentStatus[] = ['cancelada', 'reagendada'];

/* ------------------------------------------------------------------ */
/* Agendamentos                                                         */
/* ------------------------------------------------------------------ */

/** Agendamentos do período com todos os filtros, no escopo do perfil. */
export function selectReportAppointments(s: Database, ctx: AccessContext, f: ReportFilters, range: DateRange = f.range, withStatus = true): AppointmentRecord[] {
  return selectAppointments(s, ctx, {
    from: range.from,
    to: range.to,
    professionalIds: f.professionalId ? [f.professionalId] : undefined,
    specialties: f.specialty ? [f.specialty] : undefined,
    statuses: withStatus && f.status ? [f.status] : undefined,
  }).filter((a) => !f.service || a.service === f.service);
}

export interface AppointmentMetrics {
  /** Agendamentos efetivos (exclui os originais reagendados, para não contar duas vezes). */
  total: number;
  scheduled: number;
  confirmed: number;
  inProgress: number;
  done: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  cancelRate: number | null;
  /** Faltas sobre consultas que já deveriam ter ocorrido (concluídas + faltas). */
  noShowRate: number | null;
  byStatus: DistributionRow[];
  byProfessional: DistributionRow[];
  bySpecialty: DistributionRow[];
  byService: DistributionRow[];
}

export function computeAppointmentMetrics(list: AppointmentRecord[], professionalName: (id: ID) => string): AppointmentMetrics {
  const count = (st: AppointmentStatus) => list.filter((a) => a.status === st).length;
  const effective = list.filter((a) => a.status !== 'reagendada');
  const done = count('concluida');
  const noShow = count('faltou');
  const cancelled = count('cancelada');
  return {
    total: effective.length,
    scheduled: count('agendada'),
    confirmed: count('confirmada'),
    inProgress: count('em_atendimento'),
    done,
    cancelled,
    noShow,
    rescheduled: count('reagendada'),
    cancelRate: ratio(cancelled, effective.length),
    noShowRate: ratio(noShow, done + noShow),
    byStatus: distribution(list, (a) => a.status, (k) => k),
    byProfessional: distribution(effective, (a) => a.professionalId, professionalName),
    bySpecialty: distribution(effective, (a) => a.specialty, (k) => SPECIALTY_NAMES[k as Specialty] ?? k).map((r) => ({
      ...r,
      color: SPECIALTY_HEX[r.id as Specialty],
    })),
    byService: distribution(effective, (a) => a.service, (k) => k),
  };
}

/* ------------------------------------------------------------------ */
/* Atendimentos                                                         */
/* ------------------------------------------------------------------ */

export interface AttendanceMetrics {
  /** Atendimentos registrados (check-in, em andamento, finalizados, faltas, cancelados). */
  registered: number;
  finished: number;
  inProgress: number;
  /** Check-in feito, aguardando o profissional. */
  waiting: number;
  /** Consultas previstas no período que ainda não tiveram atendimento iniciado. */
  toDo: number;
  noShow: number;
  cancelled: number;
  /** Finalizados ÷ atendimentos encerrados (finalizados + faltas + cancelados). */
  completionRate: number | null;
  byProfessional: DistributionRow[];
  byService: DistributionRow[];
}

export function computeAttendanceMetrics(
  appointments: AppointmentRecord[],
  attendances: Attendance[],
  professionalName: (id: ID) => string,
): AttendanceMetrics {
  const apptById = new Map(appointments.map((a) => [a.id, a]));
  const mine = attendances.filter((at) => apptById.has(at.appointmentId));
  const withAttendance = new Set(mine.map((at) => at.appointmentId));
  const count = (st: Attendance['status']) => mine.filter((at) => at.status === st).length;
  const finished = count('finalizado');
  const noShow = count('faltou');
  const cancelled = count('cancelado');
  const done = mine.filter((at) => at.status === 'finalizado');
  return {
    registered: mine.length,
    finished,
    inProgress: count('em_andamento'),
    waiting: count('aguardando'),
    toDo: appointments.filter((a) => (a.status === 'agendada' || a.status === 'confirmada') && !withAttendance.has(a.id)).length,
    noShow,
    cancelled,
    completionRate: ratio(finished, finished + noShow + cancelled),
    byProfessional: distribution(done, (at) => at.professionalId, professionalName),
    byService: distribution(done, (at) => apptById.get(at.appointmentId)?.service ?? '—', (k) => k),
  };
}

/* ------------------------------------------------------------------ */
/* Financeiro                                                           */
/* ------------------------------------------------------------------ */

/** Lançamentos do período (data de competência) no escopo do perfil. Profissional/especialidade filtram pelo vínculo. */
export function selectReportEntries(s: Database, ctx: AccessContext, f: ReportFilters, range: DateRange = f.range): FinancialEntryRecord[] {
  const specialtyPros = f.specialty ? new Set(s.professionals.filter((p) => p.specialty === f.specialty).map((p) => p.id)) : null;
  return selectFinancialEntries(s, ctx).filter((e) => {
    if (!inRange(e.date, range)) return false;
    if (f.professionalId && e.professionalId !== f.professionalId) return false;
    if (specialtyPros && !(e.professionalId && specialtyPros.has(e.professionalId))) return false;
    return true;
  });
}

export interface PayoutRow {
  id: ID;
  label: string;
  paid: number;
  pending: number;
}

export interface FinanceMetrics {
  /** Receitas pagas (mesma regra de `selectFinanceTotals`). */
  revenue: number;
  expenses: number;
  payouts: number;
  /** Receitas − despesas − repasses (todos pagos). */
  result: number;
  /** Receitas pendentes (a receber). */
  receivable: number;
  /** Receitas atrasadas. */
  overdueReceivables: number;
  /** Tudo que está atrasado (receitas, despesas e repasses) — mesma regra do core. */
  overdue: number;
  refunded: number;
  /** Quantidade de recebimentos pagos / pendentes / atrasados. */
  receivedCount: number;
  pendingCount: number;
  overdueCount: number;
  byMethod: DistributionRow[];
  byCategory: DistributionRow[];
  payoutsByProfessional: PayoutRow[] | null;
}

export function computeFinanceMetrics(entries: FinancialEntryRecord[], professionalName: (id: ID) => string, includePayouts: boolean): FinanceMetrics {
  const pick = (type: FinancialEntryRecord['type'], status: FinancialEntryRecord['status']) => entries.filter((e) => e.type === type && e.status === status);
  const paidRevenue = pick('receita', 'pago');
  const revenue = sum(paidRevenue, (e) => e.amount);
  const expenses = sum(pick('despesa', 'pago'), (e) => e.amount);
  const payouts = sum(pick('repasse', 'pago'), (e) => e.amount);
  const pendingRevenue = pick('receita', 'pendente');
  const lateRevenue = pick('receita', 'atrasado');

  let payoutsByProfessional: PayoutRow[] | null = null;
  if (includePayouts) {
    const rows = new Map<ID, PayoutRow>();
    for (const e of entries) {
      if (e.type !== 'repasse' || !e.professionalId || e.status === 'estornado') continue;
      const row = rows.get(e.professionalId) ?? { id: e.professionalId, label: professionalName(e.professionalId), paid: 0, pending: 0 };
      if (e.status === 'pago') row.paid += e.amount;
      else row.pending += e.amount;
      rows.set(e.professionalId, row);
    }
    payoutsByProfessional = Array.from(rows.values()).sort((a, b) => b.paid + b.pending - (a.paid + a.pending));
  }

  return {
    revenue,
    expenses,
    payouts,
    result: revenue - expenses - payouts,
    receivable: sum(pendingRevenue, (e) => e.amount),
    overdueReceivables: sum(lateRevenue, (e) => e.amount),
    overdue: sum(entries.filter((e) => e.status === 'atrasado'), (e) => e.amount),
    refunded: sum(pick('receita', 'estornado'), (e) => e.amount),
    receivedCount: paidRevenue.length,
    pendingCount: pendingRevenue.length,
    overdueCount: lateRevenue.length,
    byMethod: distribution(paidRevenue, (e) => e.method ?? 'nao_informado', (k) => PAYMENT_METHOD_LABEL[k as PaymentMethod] ?? 'Não informado', (e) => e.amount),
    byCategory: distribution(paidRevenue, (e) => e.category, (k) => k, (e) => e.amount),
    payoutsByProfessional,
  };
}

/* ------------------------------------------------------------------ */
/* Pacientes (somente cadastro — nenhum dado clínico)                   */
/* ------------------------------------------------------------------ */

export interface PatientMetrics {
  total: number;
  active: number;
  inactive: number;
  newInPeriod: Comparison;
  /** Pacientes distintos com consulta concluída no período (respeita os filtros de agenda). */
  attended: number;
  /** Novos cadastros por mês (últimos 6 meses até o fim do período). */
  monthly: { label: string; value: number }[];
}

/* ------------------------------------------------------------------ */
/* Profissionais                                                        */
/* ------------------------------------------------------------------ */

export interface ProfessionalRow {
  id: ID;
  name: string;
  specialty: Specialty;
  isDemo: boolean;
  /** Ativo = há usuário vinculado com situação "ativo" (Configurações › Usuários). */
  active: boolean;
  appointments: number;
  done: number;
  noShowRate: number | null;
  /** Receitas pagas vinculadas ao profissional (somente com acesso financeiro). */
  revenue: number | null;
  bookedMin: number;
  availableMin: number;
  /** Minutos agendados ÷ minutos de expediente no período; null sem expediente cadastrado. */
  occupancy: number | null;
}

/** Minutos de expediente de um profissional no intervalo, pelo `workingHours` do cadastro. */
export function availableMinutes(workingHours: { weekday: number; start: string; end: string }[], range: DateRange): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return daysOf(range).reduce((total, key) => {
    const wd = parseKey(key).getDay();
    return total + sum(workingHours.filter((w) => w.weekday === wd), (w) => Math.max(0, toMin(w.end) - toMin(w.start)));
  }, 0);
}

/* ------------------------------------------------------------------ */
/* Relatório completo                                                    */
/* ------------------------------------------------------------------ */

export interface EvolutionSeries {
  labels: string[];
  current: number[];
  previous: number[];
}

export interface ReportData {
  access: ReportAccess;
  range: DateRange;
  /** Intervalo anterior usado nas VARIAÇÕES (mês em andamento: mesmos dias do mês anterior). */
  previous: DateRange;
  /** Intervalo atual usado nas variações (mês em andamento: 1º dia → hoje; senão = range). */
  compared: DateRange;
  /** Anterior fechado, para o gráfico de evolução dia a dia (mês anterior inteiro). */
  previousChart: DateRange;
  appointments: AppointmentMetrics;
  /** Métricas no intervalo `compared` (base das variações). */
  appointmentsCompared: AppointmentMetrics;
  appointmentsPrevious: AppointmentMetrics;
  appointmentsEvolution: EvolutionSeries;
  attendances: AttendanceMetrics;
  attendancesPrevious: AttendanceMetrics;
  attendancesCompared: AttendanceMetrics;
  /** Atendimentos finalizados por mês (últimos 6 meses). */
  attendancesMonthly: { label: string; value: number }[];
  finance: FinanceMetrics | null;
  financePrevious: FinanceMetrics | null;
  financeCompared: FinanceMetrics | null;
  financeEvolution: { labels: string[]; revenue: number[]; costs: number[] } | null;
  financeMonthly: { label: string; revenue: number; costs: number }[] | null;
  patients: PatientMetrics | null;
  professionals: ProfessionalRow[];
  /** Ocupação geral (todos os profissionais filtrados). */
  occupancy: Comparison & { currentRatio: number | null; previousRatio: number | null; /** Ocupação no intervalo `compared`. */ comparedRatio: number | null };
  /** [dia da semana seg..sáb][hora 08..17] → consultas. */
  heatmap: number[][];
  /** Quantidade de registros considerados (para estados vazios). */
  isEmpty: boolean;
}

export const HEATMAP_WEEKDAYS = [1, 2, 3, 4, 5, 6];
export const HEATMAP_START_HOUR = 8;
export const HEATMAP_HOURS_COUNT = 10;

function evolution(buckets: Bucket[], prevBuckets: Bucket[], current: AppointmentRecord[], previous: AppointmentRecord[]): EvolutionSeries {
  const countIn = (list: AppointmentRecord[], b: Bucket | undefined) => (b ? list.filter((a) => inRange(a.start, b)).length : 0);
  const cur = current.filter((a) => a.status !== 'reagendada');
  const prev = previous.filter((a) => a.status !== 'reagendada');
  return {
    labels: buckets.map((b) => b.label),
    current: buckets.map((b) => countIn(cur, b)),
    previous: buckets.map((_, i) => countIn(prev, prevBuckets[i])),
  };
}

function heatmapOf(list: AppointmentRecord[]): number[][] {
  const grid = HEATMAP_WEEKDAYS.map(() => Array.from({ length: HEATMAP_HOURS_COUNT }, () => 0));
  for (const a of list) {
    if (NOT_BOOKED.includes(a.status)) continue;
    const d = new Date(a.start);
    const row = HEATMAP_WEEKDAYS.indexOf(d.getDay());
    const col = d.getHours() - HEATMAP_START_HOUR;
    if (row >= 0 && col >= 0 && col < HEATMAP_HOURS_COUNT) grid[row][col] += 1;
  }
  return grid;
}

export function buildReport(s: Database, ctx: AccessContext, f: ReportFilters, today: string = todayKey()): ReportData {
  const access = selectReportAccess(s, ctx);
  const range = f.range;
  // Agente 09: mês em andamento compara 1–hoje com os mesmos dias do mês anterior (regra única do core).
  const comparison = comparablePeriods(range, today);
  const prevRange = comparison.previous;
  const cmpRange = comparison.current;
  const chartPrevRange = previousRange(range);
  const profName = (id: ID) => s.professionals.find((p) => p.id === id)?.name ?? 'Profissional removido';

  const appts = access.operational ? selectReportAppointments(s, ctx, f, range) : [];
  const apptsPrev = access.operational ? selectReportAppointments(s, ctx, f, prevRange) : [];
  // Atendimentos: mesmos filtros, exceto o status do agendamento (o ciclo do atendimento tem status próprio).
  const apptsNoStatus = access.operational ? selectReportAppointments(s, ctx, f, range, false) : [];
  const apptsNoStatusPrev = access.operational ? selectReportAppointments(s, ctx, f, prevRange, false) : [];
  const apptsCmp = !comparison.partial ? appts : access.operational ? selectReportAppointments(s, ctx, f, cmpRange) : [];
  const apptsNoStatusCmp = !comparison.partial ? apptsNoStatus : access.operational ? selectReportAppointments(s, ctx, f, cmpRange, false) : [];
  const apptsChartPrev = !comparison.partial ? apptsPrev : access.operational ? selectReportAppointments(s, ctx, f, chartPrevRange) : [];
  const attendances = access.operational ? selectAttendances(s, ctx) : [];

  const monthlyBuckets = lastMonths(range.to, 6);
  const attendanceFilters = { ...f, status: undefined };
  const apptsMonthly = access.operational
    ? selectReportAppointments(s, ctx, attendanceFilters, { from: monthlyBuckets[0].from, to: monthlyBuckets[monthlyBuckets.length - 1].to }, false)
    : [];
  const monthlyApptIds = new Map(apptsMonthly.map((a) => [a.id, a]));
  const attendancesMonthly = monthlyBuckets.map((b) => ({
    label: b.label,
    value: attendances.filter((at) => {
      const a = monthlyApptIds.get(at.appointmentId);
      return at.status === 'finalizado' && a && inRange(a.start, b);
    }).length,
  }));

  /* Financeiro */
  let finance: FinanceMetrics | null = null;
  let financePrevious: FinanceMetrics | null = null;
  let financeCompared: FinanceMetrics | null = null;
  let financeEvolution: ReportData['financeEvolution'] = null;
  let financeMonthly: ReportData['financeMonthly'] = null;
  if (access.financial) {
    const entries = selectReportEntries(s, ctx, f, range);
    finance = computeFinanceMetrics(entries, profName, access.payouts);
    financePrevious = computeFinanceMetrics(selectReportEntries(s, ctx, f, prevRange), profName, false);
    financeCompared = comparison.partial ? computeFinanceMetrics(selectReportEntries(s, ctx, f, cmpRange), profName, false) : finance;
    const paidIn = (list: FinancialEntryRecord[], b: Bucket, types: FinancialEntryRecord['type'][]) =>
      sum(list.filter((e) => e.status === 'pago' && types.includes(e.type) && inRange(e.date, b)), (e) => e.amount);
    const buckets = bucketsOf(range);
    financeEvolution = {
      labels: buckets.map((b) => b.label),
      revenue: buckets.map((b) => paidIn(entries, b, ['receita'])),
      costs: buckets.map((b) => paidIn(entries, b, ['despesa', 'repasse'])),
    };
    const monthlyEntries = selectReportEntries(s, ctx, f, { from: monthlyBuckets[0].from, to: monthlyBuckets[monthlyBuckets.length - 1].to });
    financeMonthly = monthlyBuckets.map((b) => ({
      label: b.label,
      revenue: paidIn(monthlyEntries, b, ['receita']),
      costs: paidIn(monthlyEntries, b, ['despesa', 'repasse']),
    }));
  }

  /* Pacientes */
  let patients: PatientMetrics | null = null;
  if (access.patients) {
    const list = selectPatients(s, ctx);
    const createdIn = (r: DateRange) => list.filter((p) => inRange(p.createdAt, r)).length;
    patients = {
      total: list.length,
      active: list.filter((p) => p.status === 'ativo').length,
      inactive: list.filter((p) => p.status === 'inativo').length,
      newInPeriod: compare(createdIn(range), createdIn(prevRange)),
      attended: new Set(apptsNoStatus.filter((a) => a.status === 'concluida').map((a) => a.patientId)).size,
      monthly: monthlyBuckets.map((b) => ({ label: b.label, value: createdIn(b) })),
    };
  }

  /* Profissionais */
  const activeUserPros = new Set(s.users.filter((u) => u.status === 'ativo' && u.professionalId).map((u) => u.professionalId as ID));
  const revenueEntries = access.financial ? selectReportEntries(s, ctx, f, range) : [];
  const visiblePros = s.professionals.filter((p) => {
    if (f.professionalId && p.id !== f.professionalId) return false;
    if (f.specialty && p.specialty !== f.specialty) return false;
    if (access.ownScope && p.id !== ctx.professionalId) return false;
    return access.operational;
  });
  const bookedOf = (list: AppointmentRecord[], id: ID) => sum(list.filter((a) => a.professionalId === id && !NOT_BOOKED.includes(a.status)), (a) => a.durationMin);
  const professionals: ProfessionalRow[] = visiblePros
    .map((p) => {
      const mine = apptsNoStatus.filter((a) => a.professionalId === p.id);
      const done = mine.filter((a) => a.status === 'concluida').length;
      const noShow = mine.filter((a) => a.status === 'faltou').length;
      const availableMin = availableMinutes(p.workingHours, range);
      const bookedMin = bookedOf(apptsNoStatus, p.id);
      return {
        id: p.id,
        name: p.name,
        specialty: p.specialty,
        isDemo: p.isDemo,
        active: activeUserPros.has(p.id),
        appointments: mine.filter((a) => a.status !== 'reagendada').length,
        done,
        noShowRate: ratio(noShow, done + noShow),
        revenue: access.financial
          ? sum(revenueEntries.filter((e) => e.type === 'receita' && e.status === 'pago' && e.professionalId === p.id), (e) => e.amount)
          : null,
        bookedMin,
        availableMin,
        occupancy: ratio(bookedMin, availableMin),
      };
    })
    .sort((a, b) => b.appointments - a.appointments || a.name.localeCompare(b.name, 'pt-BR'));

  const totalAvailable = (r: DateRange) => sum(visiblePros, (p) => availableMinutes(p.workingHours, r));
  const totalBooked = (list: AppointmentRecord[]) => sum(visiblePros, (p) => bookedOf(list, p.id));
  const occCur = ratio(totalBooked(apptsNoStatus), totalAvailable(range));
  const occPrev = ratio(totalBooked(apptsNoStatusPrev), totalAvailable(prevRange));
  const occCmp = comparison.partial ? ratio(totalBooked(apptsNoStatusCmp), totalAvailable(cmpRange)) : occCur;

  return {
    access,
    range,
    previous: prevRange,
    compared: cmpRange,
    previousChart: chartPrevRange,
    appointments: computeAppointmentMetrics(appts, profName),
    appointmentsCompared: computeAppointmentMetrics(apptsCmp, profName),
    appointmentsPrevious: computeAppointmentMetrics(apptsPrev, profName),
    appointmentsEvolution: evolution(bucketsOf(range), bucketsOf(chartPrevRange), appts, apptsChartPrev),
    attendances: computeAttendanceMetrics(apptsNoStatus, attendances, profName),
    attendancesPrevious: computeAttendanceMetrics(apptsNoStatusPrev, attendances, profName),
    attendancesCompared: computeAttendanceMetrics(apptsNoStatusCmp, attendances, profName),
    attendancesMonthly,
    finance,
    financePrevious,
    financeCompared,
    financeEvolution,
    financeMonthly,
    patients,
    professionals,
    occupancy: {
      ...compare(occCur ?? 0, occPrev ?? 0),
      deltaPct: occCmp === null || occPrev === null ? null : compare(occCmp, occPrev).deltaPct,
      currentRatio: occCur,
      previousRatio: occPrev,
      comparedRatio: occCmp,
    },
    heatmap: heatmapOf(appts),
    isEmpty: appts.length === 0 && apptsNoStatus.length === 0 && (finance === null || revenueEntries.length === 0),
  };
}

/** Opções de filtro derivadas do banco (somente o que o perfil enxerga). */
export function selectReportFilterOptions(s: Database, ctx: AccessContext) {
  const access = selectReportAccess(s, ctx);
  const visible = access.operational ? selectAppointments(s, ctx) : [];
  const pros = access.ownScope ? s.professionals.filter((p) => p.id === ctx.professionalId) : s.professionals;
  return {
    professionals: [...pros].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name })),
    specialties: s.specialties.map((sp) => ({ value: sp.id, label: sp.name })),
    services: Array.from(new Set(visible.map((a) => a.service)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((name) => ({ value: name, label: name })),
  };
}
