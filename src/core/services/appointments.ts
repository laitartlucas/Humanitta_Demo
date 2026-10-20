/**
 * Serviço de agendamentos (Agenda da clínica + Portal). Permissões espelham PERMISSIONS.md §3:
 * criar/reagendar/cancelar = agenda_clinica ≥ editar (admin, recepção).
 */
import type { AppointmentRecord, AppointmentStatus, ID } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { conflict, forbidden, validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';
import { nowIso } from '../clock';
import { logActivity } from './activity';

const ov = () => r.clinicSettings.get().permissionOverrides;

export interface AppointmentInput {
  patientId: ID;
  professionalId: ID;
  /** Nome do serviço (as telas usam o nome; `serviceId` é opcional). */
  service: string;
  serviceId?: ID;
  /** ISO local "AAAA-MM-DDTHH:mm:00". */
  start: string;
  durationMin: number;
  roomId?: ID;
  price?: number;
  notes?: string;
  channel?: AppointmentRecord['channel'];
  status?: Extract<AppointmentStatus, 'agendada' | 'confirmada'>;
}

const toMin = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const toMinT = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Consultas ativas e bloqueios aprovados que colidem com o horário pedido. */
export function findConflicts(professionalId: ID, start: string, durationMin: number, ignoreId?: ID) {
  const day = start.slice(0, 10);
  const s = toMin(start);
  const e = s + durationMin;
  const appointments = r.appointments
    .list()
    .filter(
      (a) =>
        a.id !== ignoreId &&
        a.professionalId === professionalId &&
        a.start.startsWith(day) &&
        !['cancelada', 'faltou', 'reagendada'].includes(a.status) &&
        toMin(a.start) < e &&
        toMin(a.start) + a.durationMin > s,
    );
  const blocks = r.blockRequests
    .list()
    .filter(
      (b) =>
        b.professionalId === professionalId &&
        b.kind === 'bloqueio' &&
        b.status === 'aprovada' &&
        b.date === day &&
        toMinT(b.start) < e &&
        toMinT(b.end) > s,
    );
  return { appointments, blocks };
}

function validate(input: AppointmentInput) {
  const fields: Record<string, string> = {};
  if (!r.patients.getById(input.patientId)) fields.patientId = 'Selecione um paciente.';
  if (!r.professionals.getById(input.professionalId)) fields.professionalId = 'Selecione um profissional.';
  if (!input.service.trim()) fields.service = 'Informe o serviço.';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.start)) fields.start = 'Data e horário inválidos.';
  if (!(input.durationMin > 0)) fields.durationMin = 'Duração deve ser maior que zero.';
  if (Object.keys(fields).length) throw validation(fields);
}

function assertNoConflict(professionalId: ID, start: string, durationMin: number, ignoreId?: ID) {
  const c = findConflicts(professionalId, start, durationMin, ignoreId);
  if (c.appointments.length) throw conflict(`Horário ocupado: ${c.appointments[0].patientName} já está agendado(a) neste período.`);
  if (c.blocks.length) throw conflict('Horário bloqueado na agenda do profissional.');
}

export function createAppointment(ctx: AccessContext, input: AppointmentInput): AppointmentRecord {
  assertCan(ctx, 'agenda_clinica', 'editar', ov());
  validate(input);
  assertNoConflict(input.professionalId, input.start, input.durationMin);
  const patient = r.patients.require(input.patientId);
  const prof = r.professionals.require(input.professionalId);
  const ts = nowIso();
  const appt = r.appointments.create({
    id: newId('ag'),
    patientId: patient.id,
    patientName: patient.name,
    professionalId: prof.id,
    professionalName: prof.name,
    specialty: prof.specialty,
    service: input.service.trim(),
    serviceId: input.serviceId,
    roomId: input.roomId ?? prof.roomId ?? 'sala-7',
    start: input.start,
    durationMin: input.durationMin,
    status: input.status ?? 'agendada',
    price: input.price ?? 0,
    notes: input.notes,
    channel: input.channel ?? 'presencial',
    createdAt: ts,
    updatedAt: ts,
  });
  logActivity(ctx, `agendou ${patient.name} com ${prof.name}.`, 'info');
  return appt;
}

export type AppointmentPatch = Partial<Pick<AppointmentInput, 'service' | 'serviceId' | 'roomId' | 'price' | 'notes' | 'channel' | 'durationMin'>>;

export function updateAppointment(ctx: AccessContext, id: ID, patch: AppointmentPatch): AppointmentRecord {
  assertCan(ctx, 'agenda_clinica', 'editar', ov());
  const current = r.appointments.require(id);
  if (patch.durationMin && patch.durationMin !== current.durationMin) {
    assertNoConflict(current.professionalId, current.start, patch.durationMin, id);
  }
  return r.appointments.update(id, { ...patch, updatedAt: nowIso() });
}

/** Reagenda: marca o original como 'reagendada' e cria o novo horário ligado a ele. */
export function rescheduleAppointment(ctx: AccessContext, id: ID, start: string, professionalId?: ID): AppointmentRecord {
  assertCan(ctx, 'agenda_clinica', 'editar', ov());
  const current = r.appointments.require(id);
  const profId = professionalId ?? current.professionalId;
  assertNoConflict(profId, start, current.durationMin, id);
  r.appointments.update(id, { status: 'reagendada', updatedAt: nowIso() });
  const next = createAppointment(ctx, {
    patientId: current.patientId,
    professionalId: profId,
    service: current.service,
    serviceId: current.serviceId,
    start,
    durationMin: current.durationMin,
    price: current.price,
    notes: current.notes,
    channel: current.channel,
  });
  return r.appointments.update(next.id, { rescheduledFrom: id });
}

export function cancelAppointment(ctx: AccessContext, id: ID, reason: string): AppointmentRecord {
  assertCan(ctx, 'agenda_clinica', 'editar', ov());
  const current = r.appointments.require(id);
  if (current.status === 'concluida') throw conflict('Atendimento já concluído não pode ser cancelado.');
  const updated = r.appointments.update(id, { status: 'cancelada', cancelReason: reason, updatedAt: nowIso() });
  logActivity(ctx, `cancelou a consulta de ${current.patientName}.`, 'danger');
  return updated;
}

/** Confirmação (recepção / Assistente IA) — não altera horário. */
export function confirmAppointment(ctx: AccessContext, id: ID): AppointmentRecord {
  assertCan(ctx, 'agenda_clinica', 'editar', ov());
  const current = r.appointments.require(id);
  if (current.status !== 'agendada' && current.status !== 'reagendada') throw forbidden('Somente consultas agendadas podem ser confirmadas.');
  return r.appointments.update(id, { status: 'confirmada', updatedAt: nowIso() });
}
