/**
 * Ciclo de vida do lançamento (DATA_MODELS §4): `pendente → pago` · `atrasado` · `estornado`.
 *
 * O status `atrasado` gravado na semente é estático; aqui ele também é DERIVADO: um lançamento
 * pendente cujo vencimento já passou é tratado como vencido em listas, filtros e indicadores.
 */
import type { FinancialEntryRecord, PaymentStatus } from '@core';

export type EntryAction = 'pagar' | 'editar' | 'estornar' | 'excluir';

/** Situação efetiva na data `today` ("AAAA-MM-DD"). */
export function effectiveStatus(e: Pick<FinancialEntryRecord, 'status' | 'date' | 'dueDate'>, today: string): PaymentStatus {
  if (e.status === 'pendente' && (e.dueDate ?? e.date) < today) return 'atrasado';
  return e.status;
}

/** Em aberto = ainda pode receber pagamento. */
export const isOpen = (s: PaymentStatus): boolean => s === 'pendente' || s === 'atrasado';

/**
 * Transições permitidas:
 * - pagar / editar / excluir: só em aberto (pendente ou vencido);
 * - estornar: em aberto (cancelamento) ou pago (estorno). Estornado é estado final.
 */
export function canTransition(status: PaymentStatus, action: EntryAction): boolean {
  if (action === 'estornar') return status !== 'estornado';
  return isOpen(status);
}
