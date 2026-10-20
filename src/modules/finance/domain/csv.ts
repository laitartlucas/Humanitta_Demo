/**
 * Exportação CSV dos lançamentos AUTORIZADOS e já filtrados na tela. Só campos administrativos:
 * nenhum dado clínico, CPF, telefone ou e-mail sai daqui.
 * Formato pt-BR (separador `;`, decimal com vírgula, BOM para o Excel abrir acentos).
 */
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatDateBR } from '@ds/mocks/business';
import { centsToInput, toCents } from './money';
import type { FinanceRow } from './selectors';

const TYPE_LABEL: Record<FinanceRow['type'], string> = { receita: 'Receita', despesa: 'Despesa', repasse: 'Repasse' };

const HEADER = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Paciente', 'Profissional', 'Vencimento', 'Pagamento', 'Forma', 'Situação', 'Valor (R$)'];

/** Escapa aspas/separadores e neutraliza fórmulas (=, +, -, @) contra injeção em planilhas. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function entriesToCsv(rows: readonly FinanceRow[]): string {
  const lines = rows.map((e) =>
    [
      formatDateBR(e.date),
      TYPE_LABEL[e.type],
      e.description,
      e.category,
      e.patientName ?? '',
      e.professionalName ?? '',
      e.dueDate ? formatDateBR(e.dueDate) : '',
      e.paidAt ? formatDateBR(e.paidAt) : '',
      e.method ? PAYMENT_METHOD_LABEL[e.method] : '',
      PAYMENT_STATUS_LABEL[e.effective],
      centsToInput(toCents(e.amount)),
    ]
      .map(csvCell)
      .join(';'),
  );
  return `﻿${[HEADER.join(';'), ...lines].join('\r\n')}\r\n`;
}
