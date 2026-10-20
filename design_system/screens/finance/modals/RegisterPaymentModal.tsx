import { useEffect, useState } from 'react';
import { Button, Input, Modal, PaymentStatusBadge, Select } from '@ds/components';
import type { PaymentMethod } from '@core';
import { PAYMENT_METHOD_LABEL, formatCurrency, formatDateBR } from '@ds/mocks/business';
import { centsToInput, parseCurrencyInput, toCents, type FinanceRow, type PaymentInput } from '@modules/finance/domain';

export interface RegisterPaymentModalProps {
  entry: FinanceRow | null;
  onClose: () => void;
  onConfirm: (id: string, payment: PaymentInput) => void;
  /** "Hoje" da demonstração ("AAAA-MM-DD"). */
  today: string;
  saving?: boolean;
  /** Erros por campo devolvidos pelo serviço (`AppError.fields`). */
  serverErrors?: Record<string, string>;
}

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

export function RegisterPaymentModal({ entry, onClose, onConfirm, today, saving = false, serverErrors }: RegisterPaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (entry) {
      setMethod(entry.method ?? 'pix');
      setDate(today);
      setAmount(centsToInput(toCents(entry.amount)));
      setErrors({});
    }
  }, [entry, today]);

  useEffect(() => {
    if (serverErrors) setErrors(serverErrors);
  }, [serverErrors]);

  const confirm = () => {
    if (!entry) return;
    const cents = parseCurrencyInput(amount);
    const next: Record<string, string> = {};
    if (cents === null || cents <= 0) next.amount = 'Informe um valor maior que zero.';
    if (!date) next.paidAt = 'Informe a data do pagamento.';
    else if (date > today) next.paidAt = 'A data do pagamento não pode ser futura.';
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null) return;
    onConfirm(entry.id, { amountCents: cents, method, paidAt: date });
  };

  const verb = entry?.type === 'receita' ? 'recebimento' : 'pagamento';

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      dismissible={!saving}
      title={`Registrar ${verb}`}
      description="Confirme o valor, a forma e a data da baixa deste lançamento. Nenhum pagamento real é processado."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirm} loading={saving}>
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
              {(entry.patientName || entry.professionalName) && (
                <dd className="text-graphite-600">{[entry.patientName, entry.professionalName].filter(Boolean).join(' · ')}</dd>
              )}
            </div>
            <div>
              <dt className="text-graphite-500">Valor em aberto</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-graphite-900">
                {formatCurrency(entry.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-graphite-500">Vencimento</dt>
              <dd className="font-semibold text-graphite-900">{formatDateBR(entry.dueDate ?? entry.date)}</dd>
              <dd className="mt-1">
                <PaymentStatusBadge status={entry.effective} size="sm" />
              </dd>
            </div>
          </dl>
          <Input
            label="Valor pago (R$)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((x) => ({ ...x, amount: undefined }));
            }}
            error={errors.amount}
            hint="Deve ser igual ao valor em aberto — pagamento parcial não está disponível."
          />
          <Select
            label="Forma de pagamento"
            options={METHOD_OPTIONS}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            error={errors.method}
          />
          <Input
            label={`Data do ${verb}`}
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((x) => ({ ...x, paidAt: undefined }));
            }}
            error={errors.paidAt}
          />
        </div>
      )}
    </Modal>
  );
}
