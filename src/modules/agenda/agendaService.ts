/**
 * Agente 02 — Serviço da Agenda: COMPÕE os serviços do core (`appointmentService`,
 * `attendanceService`) com as regras de `agendaRules` (funcionamento, expediente, almoço,
 * bloqueios, sala). Não grava nada por conta própria: toda escrita passa pelo core, que reaplica
 * a permissão (`agenda_clinica ≥ editar`) e o conflito por profissional.
 *
 * Assinatura padrão dos serviços: `(ctx, ...args)`, lançando `AppError`. Use via `useAction`.
 */
import {
  AppError,
  appointmentService,
  assertCan,
  attendanceService,
  conflict,
  db,
  notFound,
  nowIso,
  todayKey,
  validation,
  type AccessContext,
  type AppointmentRecord,
  type ID,
} from '@core';
import { canReschedule, checkSlot, defaultRoomFor, isOpen, type SlotCheck } from './agendaRules';

type AppointmentInput = appointmentService.AppointmentInput;
type AppointmentPatch = appointmentService.AppointmentPatch;

const state = () => db.getState();
const assertCanEdit = (ctx: AccessContext) => assertCan(ctx, 'agenda_clinica', 'editar', state().clinicSettings.permissionOverrides);

function requireAppointment(id: ID): AppointmentRecord {
  const a = state().appointments.find((x) => x.id === id);
  if (!a) throw notFound('Agendamento');
  return a;
}

const CLOSED_MESSAGE: Partial<Record<AppointmentRecord['status'], string>> = {
  cancelada: 'Esta consulta já foi cancelada.',
  concluida: 'Esta consulta já foi concluída.',
  faltou: 'Esta consulta já foi registrada como falta.',
  reagendada: 'Esta consulta já foi reagendada; altere o novo horário.',
  em_atendimento: 'Esta consulta está em atendimento.',
};

function assertOpen(a: AppointmentRecord) {
  if (!isOpen(a)) throw conflict(CLOSED_MESSAGE[a.status] ?? 'Esta consulta não pode mais ser alterada.');
}

/** Lança CONFLICT (com `fields` para o formulário) se alguma regra de agenda for violada. */
function assertSlotRules(c: SlotCheck) {
  const issues = checkSlot(state(), c);
  if (!issues.length) return;
  const fields: Record<string, string> = {};
  for (const i of issues) fields[i.field] ??= i.message;
  throw new AppError('CONFLICT', issues[0].message, fields);
}

/* ------------------------------ Cadastro ------------------------------ */

export interface AgendaAppointmentInput extends AppointmentInput {
  roomId?: ID;
}

/** Novo agendamento com paciente e profissional da base compartilhada. */
export function createAgendaAppointment(ctx: AccessContext, input: AgendaAppointmentInput): AppointmentRecord {
  assertCanEdit(ctx);
  const s = state();
  const fields: Record<string, string> = {};
  const patient = s.patients.find((p) => p.id === input.patientId);
  const prof = s.professionals.find((p) => p.id === input.professionalId);
  if (!patient) fields.patientId = 'Selecione um paciente.';
  else if (patient.status !== 'ativo') fields.patientId = 'Paciente inativo. Reative o cadastro antes de agendar.';
  if (!prof) fields.professionalId = 'Selecione um profissional.';
  if (!input.service?.trim()) fields.service = 'Selecione o serviço.';
  const service = input.serviceId ? s.services.find((sv) => sv.id === input.serviceId) : undefined;
  if (prof && service && service.specialty !== prof.specialty) fields.service = 'Este serviço não pertence à especialidade do profissional.';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.start ?? '')) fields.start = 'Informe data e horário.';
  if (!(input.durationMin > 0)) fields.durationMin = 'Duração deve ser maior que zero.';
  if (input.price !== undefined && (Number.isNaN(input.price) || input.price < 0)) fields.price = 'Informe um valor válido.';
  const roomId = input.roomId || (prof ? defaultRoomFor(s, prof.id) : undefined);
  if (prof && !roomId) fields.roomId = 'Escolha uma sala ativa para a consulta.';
  if (Object.keys(fields).length) throw validation(fields);

  assertSlotRules({ professionalId: input.professionalId, start: input.start, durationMin: input.durationMin, roomId, notBefore: nowIso() });
  return appointmentService.createAppointment(ctx, { ...input, roomId });
}

/* ------------------------------- Edição ------------------------------- */

export interface AgendaEditPatch extends AppointmentPatch {
  /** Trocar o profissional gera um novo agendamento ligado ao original (`rescheduledFrom`). */
  professionalId?: ID;
}

export function editAgendaAppointment(ctx: AccessContext, id: ID, patch: AgendaEditPatch): AppointmentRecord {
  assertCanEdit(ctx);
  const current = requireAppointment(id);
  assertOpen(current);
  if (patch.durationMin !== undefined && !(patch.durationMin > 0)) throw validation({ durationMin: 'Duração deve ser maior que zero.' });
  if (patch.price !== undefined && (Number.isNaN(patch.price) || patch.price < 0)) throw validation({ price: 'Informe um valor válido.' });

  const { professionalId, ...rest } = patch;
  const profChanged = Boolean(professionalId && professionalId !== current.professionalId);
  const targetProf = profChanged ? (professionalId as ID) : current.professionalId;
  const roomId = rest.roomId ?? (profChanged ? defaultRoomFor(state(), targetProf) ?? current.roomId : current.roomId);
  const durationMin = rest.durationMin ?? current.durationMin;

  // Só revalida o horário quando algo que ocupa agenda mudou (dados antigos fora da regra continuam editáveis).
  if (profChanged || roomId !== current.roomId || durationMin !== current.durationMin) {
    if (profChanged && !state().professionals.some((p) => p.id === targetProf)) throw validation({ professionalId: 'Selecione um profissional.' });
    assertSlotRules({ professionalId: targetProf, start: current.start, durationMin, roomId, ignoreIds: [id] });
  }

  if (!profChanged) return appointmentService.updateAppointment(ctx, id, { ...rest, roomId });
  const moved = appointmentService.rescheduleAppointment(ctx, id, current.start, targetProf);
  return appointmentService.updateAppointment(ctx, moved.id, { ...rest, roomId, durationMin });
}

/* ---------------------------- Reagendamento ---------------------------- */

export interface RescheduleOptions {
  professionalId?: ID;
  roomId?: ID;
}

/** O original fica 'reagendada' e um novo agendamento é criado com `rescheduledFrom`. */
export function rescheduleAgendaAppointment(ctx: AccessContext, id: ID, start: string, opts: RescheduleOptions = {}): AppointmentRecord {
  assertCanEdit(ctx);
  const current = requireAppointment(id);
  if (!canReschedule(state(), current)) assertOpen(current);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start)) throw validation({ start: 'Selecione a nova data e o horário.' });
  const professionalId = opts.professionalId ?? current.professionalId;
  if (start === current.start && professionalId === current.professionalId) {
    throw validation({ start: 'Escolha um horário diferente do atual.' });
  }
  const roomId =
    opts.roomId ?? (professionalId === current.professionalId ? current.roomId : defaultRoomFor(state(), professionalId) ?? current.roomId);
  assertSlotRules({ professionalId, start, durationMin: current.durationMin, roomId, ignoreIds: [id], notBefore: nowIso() });

  const next = appointmentService.rescheduleAppointment(ctx, id, start, professionalId);
  return next.roomId === roomId ? next : appointmentService.updateAppointment(ctx, next.id, { roomId });
}

/* ----------------------- Cancelamento e confirmação ----------------------- */

export function cancelAgendaAppointment(ctx: AccessContext, id: ID, reason: string): AppointmentRecord {
  assertCanEdit(ctx);
  if (!reason?.trim()) throw validation({ reason: 'Selecione o motivo do cancelamento.' });
  const current = requireAppointment(id);
  assertOpen(current);
  return appointmentService.cancelAppointment(ctx, id, reason.trim());
}

export function confirmAgendaAppointment(ctx: AccessContext, id: ID): AppointmentRecord {
  assertCanEdit(ctx);
  const current = requireAppointment(id);
  if (current.status !== 'agendada') {
    throw conflict(current.status === 'confirmada' ? 'Esta consulta já está confirmada.' : CLOSED_MESSAGE[current.status] ?? 'Somente consultas agendadas podem ser confirmadas.');
  }
  return appointmentService.confirmAppointment(ctx, id);
}

/* ------------------------ Recepção (atendimentos) ------------------------ */

/** Registra a chegada do paciente (check-in). Confirma a consulta se ainda estava só agendada. */
export function checkInAgendaAppointment(ctx: AccessContext, id: ID): AppointmentRecord {
  assertCanEdit(ctx);
  const current = requireAppointment(id);
  assertOpen(current);
  if (!current.start.startsWith(todayKey())) throw conflict('O check-in só pode ser registrado no dia da consulta.');
  attendanceService.checkIn(ctx, id);
  return current.status === 'agendada' ? appointmentService.confirmAppointment(ctx, id) : requireAppointment(id);
}

export function markAgendaNoShow(ctx: AccessContext, id: ID): AppointmentRecord {
  assertCanEdit(ctx);
  const current = requireAppointment(id);
  assertOpen(current);
  if (current.start > nowIso()) throw conflict('A falta só pode ser registrada depois do horário da consulta.');
  attendanceService.markNoShow(ctx, id);
  return requireAppointment(id);
}
