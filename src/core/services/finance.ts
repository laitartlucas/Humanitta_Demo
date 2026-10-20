import type { FinancialEntryRecord, ID, PaymentMethod } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { conflict, validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';
import { todayKey } from '../clock';
import { formatCurrency } from '@ds/mocks/clinical';
import { logActivity } from './activity';

const ov = () => r.clinicSettings.get().permissionOverrides;

export type FinancialEntryInput = Omit<FinancialEntryRecord, 'id' | 'patientName' | 'professionalName' | 'paidAt'>;

export function createEntry(ctx: AccessContext, input: FinancialEntryInput): FinancialEntryRecord {
  assertCan(ctx, input.type === 'repasse' ? 'repasses' : 'financeiro', 'editar', ov());
  const f: Record<string, string> = {};
  if (!input.description.trim()) f.description = 'Informe a descrição.';
  if (!(input.amount > 0)) f.amount = 'Informe um valor maior que zero.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) f.date = 'Data inválida.';
  if (Object.keys(f).length) throw validation(f);
  if (input.type === 'receita' && input.appointmentId) {
    // Uma única receita ativa por atendimento (evita cobrança duplicada; CR 06 §3).
    const appt = r.appointments.require(input.appointmentId);
    if (appt.status !== 'concluida') throw conflict('Só é possível lançar receita de atendimento concluído.');
    const dup = r.financialEntries
      .list()
      .find((e) => e.type === 'receita' && e.appointmentId === input.appointmentId && e.status !== 'estornado');
    if (dup) throw conflict('Este atendimento já possui uma receita lançada.');
  }
  return r.financialEntries.create({
    ...input,
    id: newId('fe'),
    patientName: input.patientId ? r.patients.getById(input.patientId)?.name : undefined,
    professionalName: input.professionalId ? r.professionals.getById(input.professionalId)?.name : undefined,
    paidAt: input.status === 'pago' ? input.date : undefined,
  });
}

export function registerPayment(ctx: AccessContext, id: ID, method: PaymentMethod, paidAt = todayKey()): FinancialEntryRecord {
  assertCan(ctx, 'financeiro', 'editar', ov());
  const entry = r.financialEntries.require(id);
  if (entry.status === 'pago') throw conflict('Este lançamento já está pago.');
  if (entry.status === 'estornado') throw conflict('Lançamento estornado não pode receber pagamento.');
  const updated = r.financialEntries.update(id, { status: 'pago', method, paidAt });
  if (entry.type === 'receita' && entry.patientId) {
    const p = r.patients.getById(entry.patientId);
    if (p) r.patients.update(p.id, { balance: Math.max(0, p.balance - entry.amount) });
  }
  logActivity(ctx, `registrou pagamento de ${formatCurrency(entry.amount)}${entry.patientName ? ` — ${entry.patientName}` : ''}.`, 'success');
  return updated;
}

export function deleteEntry(ctx: AccessContext, id: ID): void {
  assertCan(ctx, 'financeiro', 'editar', ov());
  r.financialEntries.remove(id);
}
