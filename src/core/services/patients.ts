import type { ID, PatientRecord } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { AppError, conflict, validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';
import { todayKey } from '../clock';
import { logActivity } from './activity';

const ov = () => r.clinicSettings.get().permissionOverrides;

export type PatientInput = Pick<PatientRecord, 'name' | 'birthDate' | 'phone' | 'city'> &
  Partial<Pick<PatientRecord, 'email' | 'tags' | 'adminNote' | 'alerts'>>;

const digits = (phone: string) => phone.replace(/\D/g, '');

/** Telefone já usado por outro cadastro (CR 03 §2). */
function assertUniquePhone(phone: string | undefined, ignoreId?: string) {
  if (!phone) return;
  const d = digits(phone);
  const other = r.patients.list().find((p) => p.id !== ignoreId && digits(p.phone) === d);
  if (other) throw new AppError('CONFLICT', `Telefone já cadastrado para ${other.name}.`, { phone: 'Telefone já cadastrado.' });
}

function validate(input: Partial<PatientInput>, partial: boolean) {
  const f: Record<string, string> = {};
  if ((!partial || input.name !== undefined) && !input.name?.trim()) f.name = 'Informe o nome completo.';
  if ((!partial || input.phone !== undefined) && !/\d{4}-?\d{4}$/.test(input.phone ?? '')) f.phone = 'Telefone inválido.';
  if ((!partial || input.birthDate !== undefined) && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate ?? '')) f.birthDate = 'Data de nascimento inválida.';
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) f.email = 'E-mail em formato inválido.';
  if (Object.keys(f).length) throw validation(f);
}

export function createPatient(ctx: AccessContext, input: PatientInput): PatientRecord {
  assertCan(ctx, 'pacientes_cadastro', 'editar', ov());
  validate(input, false);
  assertUniquePhone(input.phone);
  const patient = r.patients.create({
    id: newId('pac'),
    ...input,
    name: input.name.trim(),
    tags: input.tags ?? [],
    createdAt: todayKey(),
    balance: 0,
    status: 'ativo',
  });
  logActivity(ctx, `cadastrou novo paciente: ${patient.name}.`, 'gold');
  return patient;
}

export function updatePatient(ctx: AccessContext, id: ID, patch: Partial<PatientInput & Pick<PatientRecord, 'status'>>): PatientRecord {
  assertCan(ctx, 'pacientes_cadastro', 'editar', ov());
  validate(patch, true);
  assertUniquePhone(patch.phone, id);
  const updated = r.patients.update(id, patch);
  if (patch.name) {
    // Mantém os nomes desnormalizados coerentes em todos os módulos (CR 03 §3).
    r.appointments.list().filter((a) => a.patientId === id).forEach((a) => r.appointments.update(a.id, { patientName: updated.name }));
    r.financialEntries.list().filter((e) => e.patientId === id).forEach((e) => r.financialEntries.update(e.id, { patientName: updated.name }));
  }
  if (patch.name || patch.phone) {
    r.conversations
      .list()
      .filter((c) => c.patientId === id)
      .forEach((c) => r.conversations.update(c.id, { contactName: updated.name, phone: updated.phone }));
  }
  return updated;
}

/** Exclusão só sem histórico; com histórico, inative (status 'inativo'). */
export function deletePatient(ctx: AccessContext, id: ID): void {
  assertCan(ctx, 'pacientes_cadastro', 'editar', ov());
  if (r.appointments.list().some((a) => a.patientId === id)) {
    throw conflict('Paciente com histórico de consultas não pode ser excluído. Inative o cadastro.');
  }
  r.patients.remove(id);
}
