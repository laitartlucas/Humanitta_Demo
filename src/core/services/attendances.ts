/**
 * Atendimentos: check-in (recepção), início/fim (somente o profissional responsável) e
 * prontuário (tabela separada, só o profissional responsável lê/escreve).
 */
import type { AppointmentRecord, AppointmentStatus, Attendance, ClinicalRecord, ID } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { conflict, forbidden } from '../errors/AppError';
import { repositories as r } from '../repositories';
import { nowIso, todayKey } from '../clock';
import { logActivity } from './activity';

const ov = () => r.clinicSettings.get().permissionOverrides;
const attendanceId = (appointmentId: ID) => `at-${appointmentId}`;

function ensureAttendance(appointmentId: ID): Attendance {
  const existing = r.attendances.getById(attendanceId(appointmentId));
  if (existing) return existing;
  const a = r.appointments.require(appointmentId);
  return r.attendances.create({
    id: attendanceId(appointmentId),
    appointmentId,
    patientId: a.patientId,
    professionalId: a.professionalId,
    status: 'aguardando',
  });
}

/** Consultas que ainda podem ter check-in, início ou falta ('reagendada' é o registro substituído). */
const PENDING: AppointmentStatus[] = ['agendada', 'confirmada'];

const CLOSED: Partial<Record<AppointmentStatus, string>> = {
  concluida: 'Este atendimento já foi concluído.',
  cancelada: 'Esta consulta foi cancelada.',
  faltou: 'Esta consulta já foi registrada como falta.',
  reagendada: 'Esta consulta foi reagendada; use o novo horário.',
  em_atendimento: 'Este atendimento já está em andamento.',
};

function assertPending(appt: AppointmentRecord) {
  if (!PENDING.includes(appt.status)) throw conflict(CLOSED[appt.status] ?? 'Esta consulta não está aguardando atendimento.');
}

function assertToday(appt: AppointmentRecord, what: string) {
  if (!appt.start.startsWith(todayKey())) throw conflict(`${what} só pode ser registrado(a) no dia da consulta.`);
}

function assertOwn(ctx: AccessContext, professionalId: ID) {
  if (ctx.role !== 'profissional' || ctx.professionalId !== professionalId) {
    throw forbidden('Somente o profissional responsável pode conduzir este atendimento.');
  }
}

/** Recepção registra a chegada do paciente. */
export function checkIn(ctx: AccessContext, appointmentId: ID): Attendance {
  assertCan(ctx, 'agenda_clinica', 'editar', ov());
  const appt = r.appointments.require(appointmentId);
  assertPending(appt);
  assertToday(appt, 'O check-in');
  const at = ensureAttendance(appointmentId);
  if (at.status !== 'aguardando' || at.checkInAt) throw conflict('Check-in já registrado para este atendimento.');
  return r.attendances.update(at.id, { checkInAt: nowIso() });
}

export function startAttendance(ctx: AccessContext, appointmentId: ID): Attendance {
  assertCan(ctx, 'atendimentos', 'proprio', ov());
  const appt = r.appointments.require(appointmentId);
  assertOwn(ctx, appt.professionalId);
  const running = r.attendances.list().find((a) => a.professionalId === appt.professionalId && a.status === 'em_andamento');
  if (running && running.appointmentId !== appointmentId) throw conflict('Finalize o atendimento em andamento antes de iniciar outro.');
  assertPending(appt);
  assertToday(appt, 'O início do atendimento');
  const at = ensureAttendance(appointmentId);
  if (at.status !== 'aguardando') throw conflict('Este atendimento não está aguardando início.');
  r.appointments.update(appointmentId, { status: 'em_atendimento' });
  return r.attendances.update(at.id, { status: 'em_andamento', startedAt: at.startedAt ?? nowIso() });
}

export function finishAttendance(ctx: AccessContext, appointmentId: ID, clinicalSummary?: string): Attendance {
  assertCan(ctx, 'atendimentos', 'proprio', ov());
  const appt = r.appointments.require(appointmentId);
  assertOwn(ctx, appt.professionalId);
  const at = ensureAttendance(appointmentId);
  if (at.status !== 'em_andamento') throw conflict('Este atendimento não está em andamento.');
  const ts = nowIso();
  r.appointments.update(appointmentId, { status: 'concluida' });
  if (clinicalSummary?.trim()) saveClinicalRecord(ctx, appointmentId, clinicalSummary);
  logActivity(ctx, `finalizou atendimento de ${appt.patientName}.`, 'neutral');
  return r.attendances.update(at.id, { status: 'finalizado', finishedAt: ts });
}

export function markNoShow(ctx: AccessContext, appointmentId: ID): Attendance {
  const appt = r.appointments.require(appointmentId);
  if (ctx.role === 'profissional') assertOwn(ctx, appt.professionalId);
  else assertCan(ctx, 'agenda_clinica', 'editar', ov());
  assertPending(appt);
  if (appt.start > nowIso()) throw conflict('A falta só pode ser registrada depois do horário da consulta.');
  const at = ensureAttendance(appointmentId);
  if (at.status !== 'aguardando') throw conflict('Este atendimento não está aguardando.');
  r.appointments.update(appointmentId, { status: 'faltou' });
  return r.attendances.update(at.id, { status: 'faltou' });
}

/** Cria/atualiza o registro clínico. Somente o profissional responsável. */
export function saveClinicalRecord(ctx: AccessContext, appointmentId: ID, summary: string): ClinicalRecord {
  assertCan(ctx, 'registro_clinico', 'proprio', ov());
  const appt = r.appointments.require(appointmentId);
  assertOwn(ctx, appt.professionalId);
  const id = `cr-${appointmentId}`;
  const ts = nowIso();
  const existing = r.clinicalRecords.getById(id);
  if (existing) return r.clinicalRecords.update(id, { summary, updatedAt: ts });
  return r.clinicalRecords.create({
    id,
    attendanceId: attendanceId(appointmentId),
    appointmentId,
    patientId: appt.patientId,
    professionalId: appt.professionalId,
    summary,
    createdAt: ts,
  });
}
