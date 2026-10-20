import { ConfirmDialog } from '@ds/components';
import type { FinancialEntryRecord } from '@core';
import { formatCurrency } from '@ds/mocks/business';

export interface ReverseEntryDialogProps {
  entry: FinancialEntryRecord | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  loading?: boolean;
}

/** Estorno (lançamento pago) ou cancelamento (em aberto). O registro fica no histórico como "Estornado". */
export function ReverseEntryDialog({ entry, onClose, onConfirm, loading }: ReverseEntryDialogProps) {
  const paid = entry?.status === 'pago';
  return (
    <ConfirmDialog
      open={entry !== null}
      onClose={onClose}
      onConfirm={() => {
        if (entry) onConfirm(entry.id);
      }}
      loading={loading}
      tone="danger"
      title={paid ? 'Estornar lançamento?' : 'Cancelar lançamento?'}
      description={
        entry
          ? `"${entry.description}" (${formatCurrency(entry.amount)}) passará para a situação "Estornado" e deixará de compor os indicadores. ` +
            'O registro continua no histórico. Estorno demonstrativo: nenhum valor é devolvido de fato.'
          : ''
      }
      confirmLabel={paid ? 'Estornar lançamento' : 'Cancelar lançamento'}
      cancelLabel="Voltar"
    />
  );
}
