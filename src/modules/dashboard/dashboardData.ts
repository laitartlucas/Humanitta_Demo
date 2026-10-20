/**
 * Agente 01 — Dashboard. Composição PURA dos seletores do core em um único modelo de tela.
 *
 * Nada aqui guarda dados: tudo é derivado do `Database` compartilhado + `AccessContext`,
 * então qualquer alteração feita por Agenda, Pacientes ou Financeiro aparece no Dashboard
 * no próximo render (via `useQuery`). Os números seguem as mesmas regras do core
 * (`selectDayOverview`, `selectFinanceTotals`) para não divergir de Relatórios/Financeiro.
 */
import { toDateKey } from '@ds/mocks/clinical';
import {
  can,
  selectAppointments,
  selectFinanceTotals,
  selectFinancialEntries,
  selectPatients,
  type AccessContext,
  type ActivityEvent,
  type AppointmentRecord,
  type AppointmentStatus,
  type Database,
  type Specialty,
} from '@core';

export type DashboardPeriod = 'dia' | 'semana' | 'mes';

export interface DateRange {
  /** "AAAA-MM-DD" inclusive. */
  from: string;
  to: string;
}

export interface AppointmentSummary {
  /** Mesma regra do `selectDayOverview`: tudo menos canceladas. */
  total: number;
  confirmed: number;
  /** Aguardando confirmação (`agendada`). */
  pending: number;
  cancelled: number;
  inProgress: number;
  done: number;
  noShow: number;
}

export interface SpecialtySlice {
  specialty: Specialty;
  label: string;
  value: number;
  color: string;
}

export interface UpcomingAppointment extends AppointmentRecord {
  roomName: string;
}

export interface RevenuePoint {
  /** "AAAA-MM". */
  monthKey: string;
  label: string;
  value: number;
}

export interface DashboardData {
  period: DashboardPeriod;
  range: DateRange;
  previousRange: DateRange;
  appointments: AppointmentSummary;
  previousTotal: number;
  /** `null` = perfil sem `pacientes_cadastro ≥ ver`. */
  patients: { total: number; active: number; newInPeriod: number } | null;
  /** `null` = perfil sem `financeiro ≥ ver` (ex.: recepção). */
  revenue: { value: number; previous: number; receivable: number } | null;
  /** Últimos 12 meses até o mês corrente (receita paga). `null` sem permissão. */
  revenueSeries: RevenuePoint[] | null;
  occupancy: { rate: number; rooms: number; bookedMin: number; capacityMin: number };
  /** Salas livres na próxima hora cheia (só no período "dia"). */
  freeRooms: { hour: number; free: number } | null;
  bySpecialty: SpecialtySlice[];
  upcoming: UpcomingAppointment[];
  activity: ActivityEvent[];
}

const UPCOMING_STATUSES: AppointmentStatus[] = ['agendada', 'confirmada', 'em_atendimento'];
/** Status que não ocupam sala na agenda. */
const FREE_STATUSES: AppointmentStatus[] = ['cancelada', 'reagendada'];

/* ------------------------------ Datas ------------------------------ */

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Intervalo do período que contém `ref` (semana = segunda a domingo). */
export function periodRange(period: DashboardPeriod, ref: Date): DateRange {
  if (period === 'dia') return { from: toDateKey(ref), to: toDateKey(ref) };
  if (period === 'semana') {
    const monday = addDays(ref, -((ref.getDay() + 6) % 7));
    return { from: toDateKey(monday), to: toDateKey(addDays(monday, 6)) };
  }
  return {
    from: toDateKey(new Date(ref.getFullYear(), ref.getMonth(), 1)),
    to: toDateKey(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)),
  };
}

/** Período anterior equivalente: mesmo dia da semana passada, semana passada ou mês passado. */
export function previousPeriodRange(period: DashboardPeriod, ref: Date): DateRange {
  if (period === 'mes') return periodRange('mes', new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
  return periodRange(period, addDays(ref, -7));
}

/* ---------------------------- Agregações ---------------------------- */

export function summarizeAppointments(list: AppointmentRecord[]): AppointmentSummary {
  const count = (st: AppointmentStatus) => list.filter((a) => a.status === st).length;
  return {
    total: list.filter((a) => a.status !== 'cancelada').length,
    confirmed: count('confirmada'),
    pending: count('agendada'),
    cancelled: count('cancelada'),
    inProgress: count('em_atendimento'),
    done: count('concluida'),
    noShow: count('faltou'),
  };
}

/**
 * Ocupação = minutos agendados ÷ (salas ativas × minutos de funcionamento dos dias abertos).
 * Horário de funcionamento vem de `clinicSettings.hours` (descontando o almoço).
 */
export function computeOccupancy(s: Database, list: AppointmentRecord[], range: DateRange) {
  const rooms = s.rooms.filter((r) => r.active).length;
  let openMin = 0;
  for (let d = keyToDate(range.from); toDateKey(d) <= range.to; d = addDays(d, 1)) {
    const h = s.clinicSettings.hours.find((x) => x.weekday === d.getDay());
    if (!h?.open) continue;
    const lunch = h.lunchStart && h.lunchEnd ? minutesOf(h.lunchEnd) - minutesOf(h.lunchStart) : 0;
    openMin += minutesOf(h.end) - minutesOf(h.start) - lunch;
  }
  const capacityMin = rooms * openMin;
  const bookedMin = list.filter((a) => !FREE_STATUSES.includes(a.status)).reduce((t, a) => t + a.durationMin, 0);
  const rate = capacityMin > 0 ? Math.min(100, Math.round((bookedMin / capacityMin) * 100)) : 0;
  return { rate, rooms, bookedMin, capacityMin };
}

/** Salas ativas sem consulta na próxima hora cheia de `ref` (dentro do expediente). */
export function computeFreeRooms(s: Database, dayList: AppointmentRecord[], ref: Date) {
  const hour = ref.getHours() + 1;
  const h = s.clinicSettings.hours.find((x) => x.weekday === ref.getDay());
  if (!h?.open || hour * 60 >= minutesOf(h.end)) return null;
  const at = hour * 60;
  const busy = new Set(
    dayList
      .filter((a) => !FREE_STATUSES.includes(a.status))
      .filter((a) => {
        const start = minutesOf(a.start.slice(11, 16));
        return start <= at && at < start + a.durationMin;
      })
      .map((a) => a.roomId),
  );
  const active = s.rooms.filter((r) => r.active);
  return { hour, free: active.filter((r) => !busy.has(r.id)).length };
}

const MONTH_SHORT = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

/** Receita paga por mês (mesma regra de `selectFinanceTotals`), 12 meses até `ref`. */
export function revenueByMonth(s: Database, ctx: AccessContext, ref: Date, months = 12): RevenuePoint[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth() - (months - 1 - i), 1);
    const monthKey = toDateKey(d).slice(0, 7);
    return { monthKey, label: MONTH_SHORT(d), value: selectFinanceTotals(s, ctx, monthKey).revenue };
  });
}

const paidRevenueIn = (s: Database, ctx: AccessContext, range: DateRange) =>
  selectFinancialEntries(s, ctx)
    .filter((e) => e.type === 'receita' && e.status === 'pago' && e.date >= range.from && e.date <= range.to)
    .reduce((t, e) => t + e.amount, 0);

const receivableIn = (s: Database, ctx: AccessContext, range: DateRange) =>
  selectFinancialEntries(s, ctx)
    .filter((e) => e.type === 'receita' && e.status === 'pendente' && e.date >= range.from && e.date <= range.to)
    .reduce((t, e) => t + e.amount, 0);

/* ------------------------------ Dashboard ----------------------------- */

/**
 * Modelo completo do Dashboard administrativo para o perfil do contexto.
 * Devolve `null` se o perfil não tem `dashboard_clinica ≥ ver` (ex.: profissional).
 * Nunca lê prontuário: só agenda, cadastro, financeiro (se permitido) e o feed de atividades.
 */
export function selectDashboard(
  s: Database,
  ctx: AccessContext,
  period: DashboardPeriod,
  ref: Date,
): DashboardData | null {
  const overrides = s.clinicSettings.permissionOverrides;
  if (!can(ctx, 'dashboard_clinica', 'ver', overrides)) return null;

  const range = periodRange(period, ref);
  const previousRange = previousPeriodRange(period, ref);
  const list = selectAppointments(s, ctx, range);
  const previous = selectAppointments(s, ctx, previousRange);

  const patientList = selectPatients(s, ctx);
  const patients = can(ctx, 'pacientes_cadastro', 'ver', overrides)
    ? {
        total: patientList.length,
        active: patientList.filter((p) => p.status === 'ativo').length,
        newInPeriod: patientList.filter((p) => p.createdAt >= range.from && p.createdAt <= range.to).length,
      }
    : null;

  const canFinance = can(ctx, 'financeiro', 'ver', overrides);
  const revenue = canFinance
    ? { value: paidRevenueIn(s, ctx, range), previous: paidRevenueIn(s, ctx, previousRange), receivable: receivableIn(s, ctx, range) }
    : null;

  const specialtyCounts = new Map<Specialty, number>();
  for (const a of list) {
    if (a.status === 'cancelada') continue;
    specialtyCounts.set(a.specialty, (specialtyCounts.get(a.specialty) ?? 0) + 1);
  }
  const bySpecialty = Array.from(specialtyCounts, ([specialty, value]) => {
    const sp = s.specialties.find((x) => x.id === specialty);
    return { specialty, value, label: sp?.name ?? specialty, color: sp?.colorHex ?? '#8F8A80' };
  }).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));

  const nowMs = ref.getTime();
  const roomName = (id: string) => s.rooms.find((r) => r.id === id)?.name ?? '—';
  const upcoming = list
    .filter((a) => UPCOMING_STATUSES.includes(a.status))
    .filter((a) => new Date(a.start).getTime() + a.durationMin * 60000 >= nowMs)
    .slice(0, 6)
    .map((a) => ({ ...a, roomName: roomName(a.roomId) }));

  return {
    period,
    range,
    previousRange,
    appointments: summarizeAppointments(list),
    previousTotal: summarizeAppointments(previous).total,
    patients,
    revenue,
    revenueSeries: canFinance ? revenueByMonth(s, ctx, ref) : null,
    occupancy: computeOccupancy(s, list, range),
    freeRooms: period === 'dia' ? computeFreeRooms(s, list, ref) : null,
    bySpecialty,
    upcoming,
    activity: [...s.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
  };
}
