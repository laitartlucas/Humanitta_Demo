/**
 * Operações de escrita do Financeiro (assinatura padrão `fn(ctx, ...args)`, lançam `AppError`).
 *
 * Compõem `financeService` do core (criação, baixa, exclusão) com as validações e regras que o
 * módulo precisa: centavos inteiros, categorias do modelo, duplicidade, transições de status e
 * vínculo com atendimentos. Edição e estorno ainda não existem no core: até a resposta do
 * CR `docs/change-requests/06-financeiro.md` elas usam o MESMO repositório compartilhado, com a
 * mesma checagem de permissão (`assertCan`) que os serviços do core aplicam. Nenhum store novo.
 */
import {
  assertCan,
  can,
  conflict,
  db,
  financeService,
  forbidden,
  logActivity,
  notFound,
  repositories as r,
  todayKey,
  validation,
  type AccessContext,
  type FinancialEntryRecord,
  type ID,
  type PaymentMethod,
} from '@core';
import { FINANCE_CATEGORIES, PAYMENT_METHOD_LABEL, formatCurrency } from '@ds/mocks/business';
import { fromCents, MAX_ENTRY_CENTS, toCents, type Cents } from './money';
import { addDays, isValidDateKey, type DateRange } from './periods';
import { findChargeFor, findPayoutFor, selectPayoutStatement, toRows, type EntryType } from './selectors';
import { canTransition, effectiveStatus } from './status';

const ov = () => r.clinicSettings.get().permissionOverrides;
const featureOf = (type: EntryType) => (type === 'repasse' ? 'repasses' : 'financeiro');

const TYPE_NOUN: Record<EntryType, string> = { receita: 'receita', despesa: 'despesa', repasse: 'repasse' };

/** Dados do formulário de lançamento. Valor SEMPRE em centavos inteiros. */
export interface EntryDraft {
  type: EntryType;
  description: string;
  category: string;
  amountCents: Cents;
  /** Competência ("AAAA-MM-DD"). */
  date: string;
  dueDate?: string;
  method?: PaymentMethod;
  /** Situação inicial: só `pendente` ou `pago` na criação. */
  status: 'pendente' | 'pago';
  patientId?: ID;
  professionalId?: ID;
  appointmentId?: ID;
}

/** Campos editáveis de um lançamento em aberto (tipo e situação não mudam na edição). */
export type EntryPatch = Omit<EntryDraft, 'type' | 'status'>;

export interface PaymentInput {
  amountCents: Cents;
  method: PaymentMethod;
  paidAt: string;
}

/* ------------------------------ Validação ------------------------------ */

const isMethod = (m: string | undefined): m is PaymentMethod => Boolean(m) && m! in PAYMENT_METHOD_LABEL;

function validateAmount(cents: Cents, f: Record<string, string>): void {
  if (!Number.isInteger(cents) || cents <= 0) f.amount = 'Informe um valor maior que zero.';
  else if (cents > MAX_ENTRY_CENTS) f.amount = 'Valor acima do limite de R$ 1.000.000,00 por lançamento.';
}

/**
 * Valida o rascunho e devolve os vínculos resolvidos (paciente/profissional do atendimento).
 * Lança VALIDATION com mensagens por campo.
 */
function validateDraft(d: EntryDraft, selfId?: ID): Pick<EntryDraft, 'patientId' | 'professionalId'> {
  const f: Record<string, string> = {};
  const description = d.description.trim();
  if (description.length < 3) f.description = 'Informe uma descrição com pelo menos 3 caracteres.';
  else if (description.length > 120) f.description = 'Use no máximo 120 caracteres.';
  if (!(FINANCE_CATEGORIES[d.type] as readonly string[]).includes(d.category)) f.category = 'Escolha uma categoria da lista.';
  validateAmount(d.amountCents, f);
  if (!isValidDateKey(d.date)) f.date = 'Data inválida.';
  if (d.dueDate !== undefined && !isValidDateKey(d.dueDate)) f.dueDate = 'Data de vencimento inválida.';
  else if (d.dueDate && isValidDateKey(d.date) && d.dueDate < d.date) f.dueDate = 'O vencimento não pode ser anterior à data de competência.';
  if (d.method !== undefined && !isMethod(d.method)) f.method = 'Forma de pagamento inválida.';
  if (d.status === 'pago') {
    if (!d.method) f.method = 'Informe a forma de pagamento.';
    if (isValidDateKey(d.date) && d.date > todayKey()) f.date = 'Um lançamento já pago não pode ter data futura.';
  }

  let patientId = d.patientId || undefined;
  let professionalId = d.professionalId || undefined;
  if (d.type === 'despesa' && (patientId || professionalId || d.appointmentId)) f.type = 'Despesas não têm paciente, profissional ou atendimento vinculados.';
  if (d.type === 'repasse') {
    if (patientId || d.appointmentId) f.type = 'Repasses não têm paciente nem atendimento vinculados.';
    if (!professionalId) f.professionalId = 'Selecione o profissional do repasse.';
  }
  if (d.appointmentId) {
    const appt = r.appointments.getById(d.appointmentId);
    if (!appt) f.appointmentId = 'Atendimento não encontrado.';
    else if (appt.status !== 'concluida') f.appointmentId = 'Só é possível cobrar atendimentos concluídos.';
    else {
      const charge = findChargeFor(r.financialEntries.list(), appt.id);
      if (charge && charge.id !== selfId) f.appointmentId = 'Este atendimento já possui uma cobrança ativa.';
      patientId = appt.patientId;
      professionalId = appt.professionalId;
    }
  }
  if (patientId && !r.patients.getById(patientId)) f.patientId = 'Paciente não encontrado.';
  if (professionalId && !r.professionals.getById(professionalId)) f.professionalId = 'Profissional não encontrado.';
  if (Object.keys(f).length) throw validation(f);
  return { patientId, professionalId };
}

/** Bloqueia o mesmo lançamento registrado duas vezes (duplo clique, cadastro repetido). */
function assertNotDuplicate(d: EntryDraft, links: Pick<EntryDraft, 'patientId' | 'professionalId'>, selfId?: ID): void {
  const description = d.description.trim().toLowerCase();
  const dup = r.financialEntries
    .list()
    .find(
      (e) =>
        e.id !== selfId &&
        e.status !== 'estornado' &&
        e.type === d.type &&
        e.date === d.date &&
        toCents(e.amount) === d.amountCents &&
        e.description.trim().toLowerCase() === description &&
        (e.patientId ?? '') === (links.patientId ?? '') &&
        (e.professionalId ?? '') === (links.professionalId ?? ''),
    );
  if (dup) throw conflict('Já existe um lançamento idêntico (mesmo tipo, descrição, valor, data e vínculos).');
}

/** Exige editar em financeiro OU repasses antes de revelar se o lançamento existe. */
function assertCanWriteAny(ctx: AccessContext): void {
  if (!can(ctx, 'financeiro', 'editar', ov()) && !can(ctx, 'repasses', 'editar', ov())) throw forbidden();
}

function requireEntry(ctx: AccessContext, id: ID): FinancialEntryRecord {
  assertCanWriteAny(ctx);
  const entry = r.financialEntries.getById(id);
  if (!entry) throw notFound('Lançamento');
  assertCan(ctx, featureOf(entry.type), 'editar', ov());
  return entry;
}

/* ------------------------------ Operações ------------------------------ */

export function createFinanceEntry(ctx: AccessContext, d: EntryDraft): FinancialEntryRecord {
  assertCan(ctx, featureOf(d.type), 'editar', ov());
  const links = validateDraft(d);
  assertNotDuplicate(d, links);
  const entry = financeService.createEntry(ctx, {
    type: d.type,
    description: d.description.trim(),
    category: d.category,
    amount: fromCents(d.amountCents),
    date: d.date,
    dueDate: d.dueDate || undefined,
    method: d.method,
    status: d.status,
    patientId: links.patientId,
    professionalId: links.professionalId,
    appointmentId: d.type === 'receita' ? d.appointmentId || undefined : undefined,
  });
  logActivity(ctx, `lançou ${TYPE_NOUN[d.type]} de ${formatCurrency(entry.amount)} — ${entry.description}.`, 'neutral');
  return entry;
}

export function updateFinanceEntry(ctx: AccessContext, id: ID, patch: EntryPatch): FinancialEntryRecord {
  const entry = requireEntry(ctx, id);
  if (!canTransition(entry.status, 'editar')) {
    throw conflict('Só lançamentos pendentes ou vencidos podem ser editados. Para corrigir um lançamento pago, faça o estorno.');
  }
  const draft: EntryDraft = { ...patch, type: entry.type, status: 'pendente' };
  const links = validateDraft(draft, id);
  assertNotDuplicate(draft, links, id);
  const updated = r.financialEntries.update(id, {
    description: draft.description.trim(),
    category: draft.category,
    amount: fromCents(draft.amountCents),
    date: draft.date,
    dueDate: draft.dueDate || undefined,
    method: draft.method,
    patientId: links.patientId,
    patientName: links.patientId ? r.patients.getById(links.patientId)?.name : undefined,
    professionalId: links.professionalId,
    professionalName: links.professionalId ? r.professionals.getById(links.professionalId)?.name : undefined,
    appointmentId: entry.type === 'receita' ? draft.appointmentId || undefined : undefined,
    // Vencimento corrigido para o futuro tira o lançamento da situação "atrasado".
    status: effectiveStatus({ status: 'pendente', date: draft.date, dueDate: draft.dueDate || undefined }, todayKey()),
  });
  logActivity(ctx, `editou o lançamento "${updated.description}".`, 'neutral');
  return updated;
}

/**
 * Registra a baixa (recebimento de receita ou pagamento de despesa/repasse). O valor informado
 * precisa ser igual ao valor em aberto — pagamento parcial não está previsto no modelo.
 */
export function registerFinancePayment(ctx: AccessContext, id: ID, p: PaymentInput): FinancialEntryRecord {
  assertCan(ctx, 'financeiro', 'editar', ov());
  const entry = r.financialEntries.getById(id);
  if (!entry) throw notFound('Lançamento');
  if (entry.status === 'pago') throw conflict('Este lançamento já está pago. O pagamento duplicado foi bloqueado.');
  if (entry.status === 'estornado') throw conflict('Lançamento estornado não pode receber pagamento.');
  const f: Record<string, string> = {};
  validateAmount(p.amountCents, f);
  if (!f.amount && p.amountCents !== toCents(entry.amount)) {
    f.amount = `O valor deve ser igual ao valor em aberto (${formatCurrency(entry.amount)}). Pagamento parcial não está disponível.`;
  }
  if (!isMethod(p.method)) f.method = 'Selecione a forma de pagamento.';
  if (!isValidDateKey(p.paidAt)) f.paidAt = 'Data de pagamento inválida.';
  else if (p.paidAt > todayKey()) f.paidAt = 'A data do pagamento não pode ser futura.';
  if (Object.keys(f).length) throw validation(f);
  return financeService.registerPayment(ctx, id, p.method, p.paidAt);
}

/** Cancela (em aberto) ou estorna (pago) um lançamento. O registro permanece para auditoria. */
export function reverseFinanceEntry(ctx: AccessContext, id: ID): FinancialEntryRecord {
  const entry = requireEntry(ctx, id);
  if (!canTransition(entry.status, 'estornar')) throw conflict('Este lançamento já está estornado.');
  const updated = r.financialEntries.update(id, { status: 'estornado' });
  const verb = entry.status === 'pago' ? 'estornou' : 'cancelou';
  logActivity(ctx, `${verb} o lançamento "${entry.description}" (${formatCurrency(entry.amount)}).`, 'warning');
  return updated;
}

/** Exclui um lançamento em aberto. Pagos/estornados ficam para auditoria (use o estorno). */
export function deleteFinanceEntry(ctx: AccessContext, id: ID): void {
  const entry = requireEntry(ctx, id);
  if (!canTransition(entry.status, 'excluir')) {
    throw conflict('Lançamentos pagos ou estornados não podem ser excluídos. Utilize o estorno para manter o histórico.');
  }
  financeService.deleteEntry(ctx, id);
  logActivity(ctx, `excluiu o lançamento "${entry.description}".`, 'neutral');
}

export interface PayoutRequest {
  professionalId: ID;
  period: DateRange;
  periodLabel: string;
}

/**
 * Gera o repasse do profissional para um período FECHADO pela regra demonstrativa.
 * Um repasse por profissional e período (data = fim do período): nunca duplica.
 */
export function generatePayout(ctx: AccessContext, req: PayoutRequest): FinancialEntryRecord {
  assertCan(ctx, 'repasses', 'editar', ov());
  assertCan(ctx, 'financeiro', 'ver', ov());
  const today = todayKey();
  if (!isValidDateKey(req.period.from) || !isValidDateKey(req.period.to) || req.period.from > req.period.to) {
    throw validation({ period: 'Período inválido.' });
  }
  if (req.period.to >= today) throw conflict('O período ainda está em andamento. Gere o repasse após o fechamento.');
  const professional = r.professionals.getById(req.professionalId);
  if (!professional) throw notFound('Profissional');
  const existing = findPayoutFor(toRows(r.financialEntries.list(), today), professional.id, req.period);
  if (existing) throw conflict(`Já existe repasse de ${professional.name} para ${req.periodLabel}.`);
  const line = selectPayoutStatement(db.getState(), ctx, req.period).find((l) => l.professionalId === professional.id);
  const amountCents = line?.calculated == null ? 0 : toCents(line.calculated);
  if (amountCents <= 0) throw validation({ amount: 'Não há receita recebida no período para calcular o repasse.' });
  return createFinanceEntry(ctx, {
    type: 'repasse',
    description: `Repasse ${req.periodLabel} — ${professional.title}`.slice(0, 120),
    category: FINANCE_CATEGORIES.repasse[0],
    amountCents,
    date: req.period.to,
    dueDate: addDays(today, 5),
    method: 'pix',
    status: 'pendente',
    professionalId: professional.id,
  });
}
