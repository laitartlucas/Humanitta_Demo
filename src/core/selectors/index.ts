/**
 * Seletores compartilhados: funções PURAS (state, ctx, args) → dados.
 * Toda leitura com escopo passa por aqui, para que dashboard, agenda, portal e relatórios
 * calculem os números da mesma forma. Use via hooks (`useQuery`) nas telas.
 */
import { toDateKey } from '@ds/mocks/clinical';
import type { PortalAppointment, PortalPatient } from '@ds/mocks/portal';
import { maskPhone } from '@ds/mocks/portal';
import { ageFrom } from '@ds/mocks/clinical';
import type {
  AppointmentRecord,
  AppointmentStatus,
  Attendance,
  ClinicalRecord,
  Database,
  FinancialEntryRecord,
  ID,
  PatientRecord,
  Specialty,
} from '../domain';
import { can, scopeByProfessional, type AccessContext } from '../access/accessContext';
import { DEMO_NOW } from '../clock';

const ov = (s: Database) => s.clinicSettings.permissionOverrides;
const byStart = (a: { start: string }, b: { start: string }) => a.start.localeCompare(b.start);

/* ------------------------------ Lookups ------------------------------ */

export const selectPatientById = (s: Database, id: ID) => s.patients.find((p) => p.id === id);
export const selectProfessionalById = (s: Database, id: ID) => s.professionals.find((p) => p.id === id);
export const selectRoomById = (s: Database, id: ID) => s.rooms.find((r) => r.id === id);
export const selectActiveServices = (s: Database, specialty?: Specialty) =>
  s.services.filter((sv) => sv.active && (!specialty || sv.specialty === specialty));
export const selectActiveSpecialties = (s: Database) => s.specialties.filter((sp) => sp.active);

/* ---------------------------- Agendamentos ---------------------------- */

export interface AppointmentFilters {
  /** "AAAA-MM-DD" inclusive. */
  from?: string;
  to?: string;
  professionalIds?: ID[];
  specialties?: Specialty[];
  roomIds?: ID[];
  statuses?: AppointmentStatus[];
  patientId?: ID;
}

/**
 * Agendamentos visíveis ao contexto: agenda geral (admin/recepção/financeiro) ou
 * somente os próprios (profissional). Sem permissão → lista vazia.
 */
export function selectAppointments(s: Database, ctx: AccessContext, f: AppointmentFilters = {}): AppointmentRecord[] {
  const base = can(ctx, 'agenda_clinica', 'ver', ov(s))
    ? s.appointments
    : scopeByProfessional(ctx, 'agenda_propria', s.appointments, ov(s));
  return base
    .filter((a) => {
      const day = a.start.slice(0, 10);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (f.professionalIds?.length && !f.professionalIds.includes(a.professionalId)) return false;
      if (f.specialties?.length && !f.specialties.includes(a.specialty)) return false;
      if (f.roomIds?.length && !f.roomIds.includes(a.roomId)) return false;
      if (f.statuses?.length && !f.statuses.includes(a.status)) return false;
      if (f.patientId && a.patientId !== f.patientId) return false;
      return true;
    })
    .sort(byStart);
}

export const selectAppointmentsOn = (s: Database, ctx: AccessContext, dateKey: string) =>
  selectAppointments(s, ctx, { from: dateKey, to: dateKey });

/** Visão do portal: sem preço. */
export function toPortalAppointment(a: AppointmentRecord): PortalAppointment {
  const { price: _price, serviceId: _sid, createdAt: _c, updatedAt: _u, cancelReason: _r, rescheduledFrom: _f, ...rest } = a;
  return rest;
}

/* ------------------------------ Pacientes ----------------------------- */

/** Cadastro completo — só para quem tem `pacientes_cadastro` ≥ ver. */
export function selectPatients(s: Database, ctx: AccessContext): PatientRecord[] {
  if (!can(ctx, 'pacientes_cadastro', 'ver', ov(s))) return [];
  return [...s.patients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

const WAITING: AppointmentStatus[] = ['agendada', 'confirmada', 'reagendada'];

/** Pacientes do profissional em DADOS MÍNIMOS (DTO do portal; sem saldo, e-mail, CPF ou endereço). */
export function selectMyPatients(s: Database, ctx: AccessContext): PortalPatient[] {
  if (!ctx.professionalId) return [];
  const mine = scopeByProfessional(ctx, 'agenda_propria', s.appointments, ov(s));
  const ids = Array.from(new Set(mine.map((a) => a.patientId)));
  const nowMs = DEMO_NOW.getTime();
  return ids
    .map((id): PortalPatient | undefined => {
      const p = s.patients.find((x) => x.id === id);
      if (!p) return undefined;
      const withP = mine.filter((a) => a.patientId === id);
      const done = withP.filter((a) => a.status === 'concluida').sort((a, b) => b.start.localeCompare(a.start));
      const upcoming = withP
        .filter((a) => WAITING.includes(a.status) && new Date(a.start).getTime() >= nowMs - 30 * 60000)
        .sort(byStart);
      const inProgress = withP.find((a) => a.status === 'em_atendimento');
      return {
        id: p.id,
        name: p.name,
        age: ageFrom(p.birthDate, DEMO_NOW),
        phoneMasked: maskPhone(p.phone),
        nextVisit: (inProgress ?? upcoming[0])?.start,
        lastVisit: done[0]?.start,
        treatment: p.carePlans?.[ctx.professionalId as string] ?? withP[withP.length - 1]?.service ?? 'Acompanhamento',
        visitsWithMe: done.length,
        alerts: p.alerts ?? [],
        adminNote: p.adminNote,
      };
    })
    .filter((p): p is PortalPatient => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/* ---------------------------- Atendimentos ---------------------------- */

export function selectAttendances(s: Database, ctx: AccessContext): Attendance[] {
  return scopeByProfessional(ctx, 'atendimentos', s.attendances, ov(s));
}

/** Prontuário: SOMENTE do próprio profissional. Qualquer outro perfil recebe lista vazia. */
export function selectClinicalRecords(s: Database, ctx: AccessContext, patientId?: ID): ClinicalRecord[] {
  if (ctx.role !== 'profissional') return [];
  return scopeByProfessional(ctx, 'registro_clinico', s.clinicalRecords, ov(s))
    .filter((r) => !patientId || r.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ----------------------------- Financeiro ----------------------------- */

export function selectFinancialEntries(s: Database, ctx: AccessContext): FinancialEntryRecord[] {
  if (!can(ctx, 'financeiro', 'ver', ov(s))) return [];
  return [...s.financialEntries].sort((a, b) => b.date.localeCompare(a.date));
}

export interface FinanceTotals {
  revenue: number;
  expenses: number;
  payouts: number;
  balance: number;
  receivable: number;
  overdue: number;
}

/** Totais calculados a partir dos lançamentos (mesma regra para Financeiro, Dashboard e Relatórios). */
export function selectFinanceTotals(s: Database, ctx: AccessContext, monthKey?: string): FinanceTotals {
  const list = selectFinancialEntries(s, ctx).filter((e) => !monthKey || e.date.startsWith(monthKey));
  const sum = (pred: (e: FinancialEntryRecord) => boolean) => list.filter(pred).reduce((t, e) => t + e.amount, 0);
  const revenue = sum((e) => e.type === 'receita' && e.status === 'pago');
  const expenses = sum((e) => e.type === 'despesa' && e.status === 'pago');
  const payouts = sum((e) => e.type === 'repasse' && e.status === 'pago');
  return {
    revenue,
    expenses,
    payouts,
    balance: revenue - expenses - payouts,
    receivable: sum((e) => e.type === 'receita' && e.status === 'pendente'),
    overdue: sum((e) => e.status === 'atrasado'),
  };
}

/** Repasses do próprio profissional (único dado financeiro visível no portal). */
export function selectMyPayouts(s: Database, ctx: AccessContext): FinancialEntryRecord[] {
  if (!ctx.professionalId || !can(ctx, 'repasses', 'proprio', ov(s))) return [];
  return s.financialEntries.filter((e) => e.type === 'repasse' && e.professionalId === ctx.professionalId);
}

/* ------------------------------ WhatsApp ------------------------------ */

export function selectConversations(s: Database, ctx: AccessContext) {
  if (!can(ctx, 'whatsapp', 'ver', ov(s))) return [];
  return [...s.conversations].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function selectMessages(s: Database, ctx: AccessContext, conversationId: ID) {
  if (!can(ctx, 'whatsapp', 'ver', ov(s))) return [];
  return s.messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.at.localeCompare(b.at));
}

export const selectUnreadCount = (s: Database) => s.conversations.reduce((t, c) => t + c.unread, 0);

/* ------------------------- Solicitações / bloqueios -------------------- */

/** Profissional: as próprias. Quem aprova (admin) ou vê (recepção): todas. */
export function selectBlockRequests(s: Database, ctx: AccessContext) {
  const list =
    ctx.role === 'profissional'
      ? s.blockRequests.filter((r) => r.professionalId === ctx.professionalId)
      : can(ctx, 'bloqueio_horario', 'ver', ov(s))
        ? s.blockRequests
        : [];
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const selectPendingBlockRequests = (s: Database, ctx: AccessContext) =>
  selectBlockRequests(s, ctx).filter((r) => r.status === 'enviada');

/* ------------------------------ Dashboard ----------------------------- */

export interface DayOverview {
  dateKey: string;
  total: number;
  confirmed: number;
  inProgress: number;
  done: number;
  cancelled: number;
  noShow: number;
  /** Receita prevista do dia (somente perfis com acesso ao financeiro; senão null). */
  expectedRevenue: number | null;
}

export function selectDayOverview(s: Database, ctx: AccessContext, dateKey = toDateKey(DEMO_NOW)): DayOverview {
  const list = selectAppointmentsOn(s, ctx, dateKey);
  const count = (st: AppointmentStatus) => list.filter((a) => a.status === st).length;
  return {
    dateKey,
    total: list.filter((a) => a.status !== 'cancelada').length,
    confirmed: count('confirmada'),
    inProgress: count('em_atendimento'),
    done: count('concluida'),
    cancelled: count('cancelada'),
    noShow: count('faltou'),
    expectedRevenue: can(ctx, 'financeiro', 'ver', ov(s))
      ? list.filter((a) => a.status !== 'cancelada').reduce((t, a) => t + a.price, 0)
      : null,
  };
}
