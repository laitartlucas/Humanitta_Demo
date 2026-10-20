import { ConfirmDialog } from '@ds/components';
import type { FinancialEntry } from '@ds/mocks/types';
import { formatCurrency } from '@ds/mocks/business';

export interface DeleteEntryDialogProps {
  entry: FinancialEntry | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteEntryDialog({ entry, onClose, onConfirm }: DeleteEntryDialogProps) {
  return (
    <ConfirmDialog
      open={entry !== null}
      onClose={onClose}
      onConfirm={() => {
        if (entry) onConfirm(entry.id);
      }}
      tone="danger"
      title="Excluir lançamento?"
      description={
        entry
          ? `"${entry.description}" (${formatCurrency(entry.amount)}) será removido do fluxo de caixa. Esta ação não pode ser desfeita.`
          : ''
      }
      confirmLabel="Excluir lançamento"
    />
  );
}
