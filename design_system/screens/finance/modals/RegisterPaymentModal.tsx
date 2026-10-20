import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@ds/components';
import type { FinancialEntry, PaymentMethod } from '@ds/mocks/types';
import { DEMO_TODAY, PAYMENT_METHOD_LABEL, formatCurrency, formatDateBR } from '@ds/mocks/business';

export interface RegisterPaymentModalProps {
  entry: FinancialEntry | null;
  onClose: () => void;
  onConfirm: (id: string, payment: { method: PaymentMethod; date: string }) => void;
}

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

export function RegisterPaymentModal({ entry, onClose, onConfirm }: RegisterPaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [date, setDate] = useState(DEMO_TODAY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setMethod(entry.method ?? 'pix');
      setDate(DEMO_TODAY);
      setLoading(false);
    }
  }, [entry]);

  const confirm = () => {
    if (!entry) return;
    setLoading(true);
    window.setTimeout(() => {
      onConfirm(entry.id, { method, date });
      setLoading(false);
    }, 500);
  };

  const verb = entry?.type === 'receita' ? 'recebimento' : 'pagamento';

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title={`Registrar ${verb}`}
      description="Confirme a forma e a data da baixa deste lançamento."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} loading={loading}>
            Confirmar {verb}
          </Button>
        </>
      }
    >
      {entry && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3 rounded-md border border-graphite-200 bg-graphite-50 p-4 text-[13px]">
            <div className="col-span-2">
              <dt className="text-graphite-500">Lançamento</dt>
              <dd className="font-semibold text-graphite-900">{entry.description}</dd>
            </div>
            <div>
              <dt className="text-graphite-500">Valor</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-graphite-900">
                {formatCurrency(entry.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-graphite-500">Vencimento</dt>
              <dd className="font-semibold text-graphite-900">{formatDateBR(entry.dueDate ?? entry.date)}</dd>
            </div>
          </dl>
          <Select
            label="Forma de pagamento"
            options={METHOD_OPTIONS}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          />
          <Input label={`Data do ${verb}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
