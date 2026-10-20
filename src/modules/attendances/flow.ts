/**
 * Agente 05 — ações do fluxo de atendimento: agendado → na recepção → em andamento → concluído
 * (desvio: não compareceu).
 *
 * Cada ação COMPÕE o `attendanceService` do core: primeiro revalida permissão, escopo e etapa
 * a partir do banco (nunca do estado da tela), depois delega ao serviço — que reaplica o 403 do
 * "servidor". Assim transições inválidas (iniciar duas vezes, concluir sem iniciar, falta em
 * consulta concluída…) são bloqueadas mesmo que um botão apareça por engano.
 *
 * Assinatura `(ctx, ...args)`: use nas telas com `useAction(attendanceFlow.beginAttendance, …)`.
 */
import { attendanceService, can, conflict, db, forbidden, logActivity, notFound, todayKey } from '@core';
import type { AccessContext, Attendance, ClinicalRecord, ID } from '@core';
import { composeDemoNote, validateDemoNote, type DemoNote } from './clinicalNote';
import { PENDING_STAGES, selectAttendanceView, type AttendanceView } from './model';

const ov = () => db.getState().clinicSettings.permissionOverrides;

/** Atendimento no escopo do contexto; fora do escopo = "não encontrado" (como o RLS faria). */
function requireView(ctx: AccessContext, appointmentId: ID): AttendanceView {
  const view = selectAttendanceView(db.getState(), ctx, appointmentId);
  if (!view) throw notFound('Atendimento');
  return view;
}

function assertResponsible(ctx: AccessContext, view: AttendanceView): void {
  if (ctx.role !== 'profissional' || ctx.professionalId !== view.professionalId) {
    throw forbidden('Somente o profissional responsável pode conduzir este atendimento.');
  }
}

function assertToday(view: AttendanceView, what: string): void {
  if (view.dateKey !== todayKey()) throw conflict(`${what} só pode ser feito no dia da consulta.`);
}

const STAGE_BLOCK: Partial<Record<AttendanceView['stage'], string>> = {
  em_andamento: 'Este atendimento já está em andamento.',
  concluido: 'Este atendimento já foi concluído.',
  faltou: 'A falta do paciente já foi registrada para esta consulta.',
  cancelado: 'A consulta foi cancelada na agenda.',
  reagendado: 'A consulta foi reagendada; use o novo horário.',
};

function assertPending(view: AttendanceView): void {
  if (!PENDING_STAGES.includes(view.stage)) throw conflict(STAGE_BLOCK[view.stage] ?? 'Etapa do atendimento inválida.');
}

/** Recepção/administração registra a chegada do paciente (check-in). */
export function registerArrival(ctx: AccessContext, appointmentId: ID): Attendance {
  if (!can(ctx, 'agenda_clinica', 'editar', ov())) throw forbidden('Seu perfil não registra a chegada de pacientes.');
  const view = requireView(ctx, appointmentId);
  if (view.stage === 'na_recepcao') throw conflict('A chegada deste paciente já foi registrada.');
  assertPending(view);
  assertToday(view, 'O check-in');
  const at = attendanceService.checkIn(ctx, appointmentId);
  logActivity(ctx, `registrou a chegada de ${view.patient.name}.`, 'info');
  return at;
}

/** Profissional responsável inicia o atendimento (registra o horário de início). */
export function beginAttendance(ctx: AccessContext, appointmentId: ID): Attendance {
  const view = requireView(ctx, appointmentId);
  assertResponsible(ctx, view);
  assertPending(view);
  assertToday(view, 'O início do atendimento');
  return attendanceService.startAttendance(ctx, appointmentId);
}

export interface CompletionInput {
  /** Registro demonstrativo opcional, salvo junto com a conclusão. */
  note?: DemoNote;
  fictitiousConfirmed?: boolean;
}

/** Profissional responsável conclui o atendimento em andamento (uma única vez). */
export function completeAttendance(ctx: AccessContext, appointmentId: ID, input: CompletionInput = {}): Attendance {
  const view = requireView(ctx, appointmentId);
  assertResponsible(ctx, view);
  if (view.stage !== 'em_andamento') throw conflict(view.stage === 'concluido' ? STAGE_BLOCK.concluido! : 'Inicie o atendimento antes de concluí-lo.');
  const hasNote = input.note && Object.values(input.note).some((v) => v.trim());
  if (hasNote && input.note) validateDemoNote(input.note, Boolean(input.fictitiousConfirmed));
  return attendanceService.finishAttendance(ctx, appointmentId, hasNote && input.note ? composeDemoNote(input.note) : undefined);
}

/** Paciente não compareceu (recepção/administração ou o próprio profissional). */
export function registerNoShow(ctx: AccessContext, appointmentId: ID): Attendance {
  const view = requireView(ctx, appointmentId);
  if (ctx.role === 'profissional') assertResponsible(ctx, view);
  else if (!can(ctx, 'agenda_clinica', 'editar', ov())) throw forbidden('Seu perfil não registra faltas.');
  assertPending(view);
  if (view.dateKey > todayKey()) throw conflict('Só é possível registrar falta no dia da consulta ou depois.');
  const at = attendanceService.markNoShow(ctx, appointmentId);
  logActivity(ctx, `registrou a falta de ${view.patient.name}.`, 'danger');
  return at;
}

/** Salva/atualiza o registro demonstrativo (somente o profissional responsável, após o início). */
export function saveDemoRecord(ctx: AccessContext, appointmentId: ID, note: DemoNote, fictitiousConfirmed: boolean): ClinicalRecord {
  const view = requireView(ctx, appointmentId);
  assertResponsible(ctx, view);
  if (view.stage !== 'em_andamento' && view.stage !== 'concluido') throw conflict('O registro só pode ser feito após o início do atendimento.');
  validateDemoNote(note, fictitiousConfirmed);
  return attendanceService.saveClinicalRecord(ctx, appointmentId, composeDemoNote(note));
}
