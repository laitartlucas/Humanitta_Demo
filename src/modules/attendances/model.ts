/**
 * Agente 05 — modelo de leitura do módulo de Atendimentos (funções PURAS: estado + contexto → dados).
 *
 * Compõe os seletores do core (`selectAppointments`, `selectAttendances`, `selectPatients`,
 * `selectMyPatients`, `selectFinancialEntries`) em uma visão única por agendamento. Nada aqui
 * escreve no banco nem cria cópia de entidade: o agendamento continua sendo a fonte do status e o
 * atendimento (`at-<appointmentId>`) guarda os marcos de horário.
 *
 * Também é a API de leitura para o Portal do Profissional (Agente 04) e o Financeiro (Agente 06):
 * importe de `@modules/attendances`.
 */
import { can, selectAppointments, selectAttendances, selectFinancialEntries, selectMyPatients, selectPatients } from '@core';
import type {
  AccessContext,
  AppointmentRecord,
  Attendance,
  Database,
  FinancialEntryRecord,
  ID,
  PaymentStatus,
  Specialty,
} from '@core';
import { SPECIALTY_NAMES, ageFrom } from '@ds/mocks/clinical';

/* ------------------------------------------------------------------ */
/* Etapas do fluxo                                                      */
/* ------------------------------------------------------------------ */

/**
 * Etapa do atendimento vista pela clínica:
 * agendado → na_recepcao (check-in) → em_andamento → concluido · desvios: faltou, cancelado, reagendado.
 */
export type AttendanceStage = 'agendado' | 'na_recepcao' | 'em_andamento' | 'concluido' | 'faltou' | 'cancelado' | 'reagendado';

export const STAGE_LABEL: Record<AttendanceStage, string> = {
  agendado: 'Agendado',
  na_recepcao: 'Na recepção',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  faltou: 'Não compareceu',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
};

/** Etapas que ainda aguardam o início (contam como pendentes). */
export const PENDING_STAGES: AttendanceStage[] = ['agendado', 'na_recepcao'];

/**
 * Etapa a partir do agendamento (fonte do status) e do atendimento (marcos).
 * Um agendamento `reagendada` só é "reagendado" se existir o novo horário ligado a ele
 * (`rescheduledFrom`); caso contrário ele É o novo horário e segue aguardando.
 */
export function stageOf(a: AppointmentRecord, at: Attendance | undefined, superseded: boolean): AttendanceStage {
  switch (a.status) {
    case 'cancelada':
      return 'cancelado';
    case 'faltou':
      return 'faltou';
    case 'concluida':
      return 'concluido';
    case 'em_atendimento':
      return 'em_andamento';
    case 'reagendada':
      if (superseded) return 'reagendado';
      break;
    default:
      break;
  }
  if (at?.status === 'em_andamento') return 'em_andamento';
  if (at?.status === 'finalizado') return 'concluido';
  if (at?.status === 'faltou') return 'faltou';
  if (at?.status === 'cancelado') return 'cancelado';
  return at?.checkInAt ? 'na_recepcao' : 'agendado';
}

/* ------------------------------------------------------------------ */
/* Visão por agendamento                                                */
/* ------------------------------------------------------------------ */

/** Dados administrativos do paciente que o perfil pode ver (nunca CPF, e-mail, endereço ou saldo). */
export interface AttendancePatientInfo {
  id: ID;
  name: string;
  age?: number;
  city?: string;
}

/** Vínculo financeiro (somente perfis com `financeiro ≥ ver`). */
export interface AttendanceBilling {
  entryId: ID;
  status: PaymentStatus;
  amount: number;
}

export interface AttendanceView {
  id: ID;
  /** Agendamento original (Agente 02) — o vínculo nunca é duplicado. */
  appointment: AppointmentRecord;
  attendance?: Attendance;
  stage: AttendanceStage;
  dateKey: string;
  patient: AttendancePatientInfo;
  professionalId: ID;
  professionalName: string;
  specialty: Specialty;
  specialtyName: string;
  service: string;
  roomId: ID;
  roomName: string;
  roomLabel?: string;
  checkInAt?: string;
  startedAt?: string;
  finishedAt?: string;
  /** Duração real (início → fim) em minutos, quando concluído. */
  realDurationMin?: number;
  /** Espera (check-in → início) em minutos. */
  waitMin?: number;
  /** Valor da consulta — `null` para o perfil profissional (o portal nunca exibe preço). */
  price: number | null;
  /** `undefined` = perfil sem acesso ao financeiro; `null` = sem lançamento vinculado. */
  billing?: AttendanceBilling | null;
  /** Id do agendamento que originou este (reagendamento). */
  rescheduledFrom?: ID;
  /** Id do novo agendamento quando este foi reagendado. */
  rescheduledTo?: ID;
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000));
}

const ov = (s: Database) => s.clinicSettings.permissionOverrides;

/**
 * Monta as visões de atendimento no escopo do contexto. Profissional: só os próprios
 * agendamentos (seletor do core). Sem acesso a atendimentos → lista vazia.
 */
export function selectAttendanceViews(s: Database, ctx: AccessContext): AttendanceView[] {
  if (!can(ctx, 'atendimentos', 'proprio', ov(s))) return [];
  const appts = selectAppointments(s, ctx);
  const attendances = new Map(selectAttendances(s, ctx).map((at) => [at.appointmentId, at]));
  const successor = new Map<ID, ID>();
  for (const a of s.appointments) if (a.rescheduledFrom) successor.set(a.rescheduledFrom, a.id);

  const fullPatients = can(ctx, 'pacientes_cadastro', 'ver', ov(s)) ? new Map(selectPatients(s, ctx).map((p) => [p.id, p])) : null;
  const minimalPatients = fullPatients ? null : new Map(selectMyPatients(s, ctx).map((p) => [p.id, p]));
  const rooms = new Map(s.rooms.map((r) => [r.id, r]));
  const professionals = new Map(s.professionals.map((p) => [p.id, p]));
  const finance = can(ctx, 'financeiro', 'ver', ov(s)) ? selectFinancialEntries(s, ctx) : null;
  const billingByAppt = new Map<ID, FinancialEntryRecord>();
  finance?.forEach((e) => {
    if (e.type === 'receita' && e.appointmentId && !billingByAppt.has(e.appointmentId)) billingByAppt.set(e.appointmentId, e);
  });
  const isProfessional = ctx.role === 'profissional';

  return appts.map((a): AttendanceView => {
    const at = attendances.get(a.id);
    const superseded = successor.has(a.id) || (a.status === 'reagendada' && hasLaterSibling(s.appointments, a));
    const stage = stageOf(a, at, superseded);
    const full = fullPatients?.get(a.patientId);
    const minimal = minimalPatients?.get(a.patientId);
    const room = rooms.get(a.roomId);
    const entry = billingByAppt.get(a.id);
    return {
      id: a.id,
      appointment: a,
      attendance: at,
      stage,
      dateKey: a.start.slice(0, 10),
      patient: {
        id: a.patientId,
        name: full?.name ?? minimal?.name ?? a.patientName,
        age: full ? ageFrom(full.birthDate) : minimal?.age,
        city: full?.city,
      },
      professionalId: a.professionalId,
      professionalName: professionals.get(a.professionalId)?.name ?? a.professionalName,
      specialty: a.specialty,
      specialtyName: SPECIALTY_NAMES[a.specialty],
      service: a.service,
      roomId: a.roomId,
      roomName: room?.name ?? a.roomId,
      roomLabel: room?.label,
      checkInAt: at?.checkInAt,
      startedAt: at?.startedAt,
      finishedAt: at?.finishedAt,
      realDurationMin: at?.startedAt && at.finishedAt ? minutesBetween(at.startedAt, at.finishedAt) : undefined,
      waitMin: at?.checkInAt && at.startedAt ? minutesBetween(at.checkInAt, at.startedAt) : undefined,
      price: isProfessional ? null : a.price,
      billing: finance ? (entry ? { entryId: entry.id, status: entry.status, amount: entry.amount } : null) : undefined,
      rescheduledFrom: a.rescheduledFrom,
      rescheduledTo: successor.get(a.id),
    };
  });
}

/**
 * Semente da Etapa 1: o original reagendado não tem `rescheduledFrom` no novo horário (que também
 * vem com status `reagendada`). Considera substituído quando existe um horário posterior do mesmo
 * paciente/serviço/profissional também marcado como `reagendada`.
 */
function hasLaterSibling(all: AppointmentRecord[], a: AppointmentRecord): boolean {
  return all.some(
    (b) =>
      b.id !== a.id &&
      b.patientId === a.patientId &&
      b.professionalId === a.professionalId &&
      b.service === a.service &&
      b.start > a.start &&
      b.status === 'reagendada',
  );
}

export function selectAttendanceView(s: Database, ctx: AccessContext, appointmentId: ID): AttendanceView | undefined {
  return selectAttendanceViews(s, ctx).find((v) => v.id === appointmentId);
}

/* ------------------------------------------------------------------ */
/* Filtros, ordenação e indicadores                                    */
/* ------------------------------------------------------------------ */

export type StageGroup = 'todos' | 'aguardando' | 'em_atendimento' | 'finalizados' | 'cancelados';

export const STAGE_GROUP_LABEL: Record<StageGroup, string> = {
  todos: 'Todos',
  aguardando: 'Aguardando',
  em_atendimento: 'Em atendimento',
  finalizados: 'Finalizados',
  cancelados: 'Cancelados/faltas',
};

export const STAGE_GROUP_ORDER: StageGroup[] = ['todos', 'aguardando', 'em_atendimento', 'finalizados', 'cancelados'];

const GROUP_MATCH: Record<StageGroup, (s: AttendanceStage) => boolean> = {
  todos: () => true,
  aguardando: (s) => PENDING_STAGES.includes(s),
  em_atendimento: (s) => s === 'em_andamento',
  finalizados: (s) => s === 'concluido',
  cancelados: (s) => s === 'cancelado' || s === 'faltou' || s === 'reagendado',
};

export const matchesGroup = (v: AttendanceView, g: StageGroup) => GROUP_MATCH[g](v.stage);

export interface AttendanceFilters {
  /** "AAAA-MM-DD"; vazio = todas as datas. */
  dateKey?: string;
  professionalId?: ID;
  specialty?: Specialty | '';
  roomId?: ID;
  /** Busca por paciente (também casa serviço e profissional). */
  query?: string;
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filterAttendances(list: AttendanceView[], f: AttendanceFilters): AttendanceView[] {
  const q = normalizeText((f.query ?? '').trim());
  return list.filter(
    (v) =>
      (!f.dateKey || v.dateKey === f.dateKey) &&
      (!f.professionalId || v.professionalId === f.professionalId) &&
      (!f.specialty || v.specialty === f.specialty) &&
      (!f.roomId || v.roomId === f.roomId) &&
      (!q || normalizeText(`${v.patient.name} ${v.service} ${v.professionalName}`).includes(q)),
  );
}

export type AttendanceSort = 'horario' | 'horario_desc' | 'paciente' | 'profissional' | 'status';

export const SORT_LABEL: Record<AttendanceSort, string> = {
  horario: 'Horário (mais cedo)',
  horario_desc: 'Horário (mais tarde)',
  paciente: 'Paciente (A–Z)',
  profissional: 'Profissional (A–Z)',
  status: 'Etapa do atendimento',
};

const STAGE_RANK: Record<AttendanceStage, number> = {
  em_andamento: 0,
  na_recepcao: 1,
  agendado: 2,
  concluido: 3,
  faltou: 4,
  reagendado: 5,
  cancelado: 6,
};

export function sortAttendances(list: AttendanceView[], sort: AttendanceSort): AttendanceView[] {
  const byStart = (a: AttendanceView, b: AttendanceView) => a.appointment.start.localeCompare(b.appointment.start);
  const cmp: Record<AttendanceSort, (a: AttendanceView, b: AttendanceView) => number> = {
    horario: byStart,
    horario_desc: (a, b) => byStart(b, a),
    paciente: (a, b) => a.patient.name.localeCompare(b.patient.name, 'pt-BR') || byStart(a, b),
    profissional: (a, b) => a.professionalName.localeCompare(b.professionalName, 'pt-BR') || byStart(a, b),
    status: (a, b) => STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || byStart(a, b),
  };
  return [...list].sort(cmp[sort]);
}

export interface AttendanceIndicators {
  /** Programados no dia (exceto cancelados e reagendados). */
  total: number;
  done: number;
  inProgress: number;
  /** Agendados + na recepção. */
  pending: number;
  waiting: number;
  noShow: number;
}

export function computeIndicators(list: AttendanceView[]): AttendanceIndicators {
  const count = (pred: (v: AttendanceView) => boolean) => list.filter(pred).length;
  return {
    total: count((v) => v.stage !== 'cancelado' && v.stage !== 'reagendado'),
    done: count((v) => v.stage === 'concluido'),
    inProgress: count((v) => v.stage === 'em_andamento'),
    pending: count((v) => PENDING_STAGES.includes(v.stage)),
    waiting: count((v) => v.stage === 'na_recepcao'),
    noShow: count((v) => v.stage === 'faltou'),
  };
}

export interface HistoryStats {
  finished: number;
  avgDuration: number;
  avgWait: number;
  noShows: number;
}

/** Finalizados entre `from` e `to` (inclusive), mais recentes primeiro. */
export function historyBetween(list: AttendanceView[], from: string, to: string): AttendanceView[] {
  return list
    .filter((v) => v.stage === 'concluido' && v.dateKey >= from && v.dateKey <= to)
    .sort((a, b) => (b.finishedAt ?? b.appointment.start).localeCompare(a.finishedAt ?? a.appointment.start));
}

export function historyStats(list: AttendanceView[], from: string, to: string): HistoryStats {
  const done = historyBetween(list, from, to);
  const avg = (vals: number[]) => (vals.length ? Math.round(vals.reduce((t, n) => t + n, 0) / vals.length) : 0);
  return {
    finished: done.length,
    avgDuration: avg(done.flatMap((v) => (v.realDurationMin !== undefined ? [v.realDurationMin] : []))),
    avgWait: avg(done.flatMap((v) => (v.waitMin !== undefined ? [v.waitMin] : []))),
    noShows: list.filter((v) => v.stage === 'faltou' && v.dateKey >= from && v.dateKey <= to).length,
  };
}

/** "AAAA-MM-DD" deslocado em `days` dias. */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/* ------------------------------------------------------------------ */
/* Integração com o Financeiro (Agente 06)                              */
/* ------------------------------------------------------------------ */

/**
 * Atendimentos concluídos ainda SEM receita vinculada (`FinancialEntryRecord.appointmentId`).
 * Só para perfis com `financeiro ≥ ver`. O Financeiro usa esta lista para gerar a cobrança uma
 * única vez por agendamento — este módulo nunca cria lançamentos.
 */
export function selectUnbilledFinishedAttendances(s: Database, ctx: AccessContext): AttendanceView[] {
  if (!can(ctx, 'financeiro', 'ver', ov(s))) return [];
  return selectAttendanceViews(s, ctx).filter((v) => v.stage === 'concluido' && v.billing === null);
}

/* ------------------------------------------------------------------ */
/* Ações disponíveis (INTERFACE — o fluxo e o core revalidam)          */
/* ------------------------------------------------------------------ */

export interface AttendanceActionsAvailability {
  checkIn: boolean;
  start: boolean;
  finish: boolean;
  noShow: boolean;
  /** Pode ler/escrever o registro demonstrativo (somente o profissional responsável). */
  record: boolean;
  /** Explicação quando o início/conclusão cabe a outra pessoa. */
  conductHint?: string;
  /** Outro atendimento do mesmo profissional em andamento (bloqueia o início). */
  busyWith?: string;
}

/**
 * Mesmas regras de `flow.ts`, para decidir o que mostrar. Nunca é a única barreira:
 * o fluxo revalida a partir do banco e o core reaplica o 403.
 */
export function availableActions(
  v: AttendanceView,
  ctx: AccessContext,
  s: Pick<Database, 'clinicSettings'>,
  today: string,
  running?: AttendanceView,
): AttendanceActionsAvailability {
  const overrides = s.clinicSettings.permissionOverrides;
  const responsible = ctx.role === 'profissional' && ctx.professionalId === v.professionalId;
  const desk = can(ctx, 'agenda_clinica', 'editar', overrides);
  const pending = PENDING_STAGES.includes(v.stage);
  const isToday = v.dateKey === today;
  const busy = running && running.id !== v.id ? running : undefined;
  return {
    checkIn: desk && v.stage === 'agendado' && isToday,
    start: responsible && pending && isToday && !busy,
    finish: responsible && v.stage === 'em_andamento',
    noShow: (responsible || (ctx.role !== 'profissional' && desk)) && pending && v.dateKey <= today,
    record: responsible && can(ctx, 'registro_clinico', 'proprio', overrides) && (v.stage === 'em_andamento' || v.stage === 'concluido'),
    conductHint: responsible ? undefined : `Início e conclusão são feitos por ${v.professionalName} no Portal do Profissional.`,
    busyWith: busy ? busy.patient.name : undefined,
  };
}

/** Atendimento em andamento por profissional (no máximo um, regra do core). */
export function runningByProfessional(list: AttendanceView[]): Map<ID, AttendanceView> {
  const m = new Map<ID, AttendanceView>();
  for (const v of list) if (v.stage === 'em_andamento') m.set(v.professionalId, v);
  return m;
}
