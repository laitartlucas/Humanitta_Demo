import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Modal, Select, SegmentedControl, Textarea } from '@ds/components';
import type { FinancialEntry, PaymentMethod, PaymentStatus } from '@ds/mocks/types';
import { DEMO_TODAY, FINANCE_CATEGORIES, PAYMENT_METHOD_LABEL } from '@ds/mocks/business';

type EntryType = FinancialEntry['type'];

export interface NewEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: FinancialEntry) => void;
  defaultType?: EntryType;
}

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'repasse', label: 'Repasse' },
];

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
];

interface FormState {
  type: EntryType;
  description: string;
  category: string;
  amount: string;
  date: string;
  dueDate: string;
  method: PaymentMethod;
  status: PaymentStatus;
  person: string;
  notes: string;
}

function initialState(type: EntryType): FormState {
  return {
    type,
    description: '',
    category: FINANCE_CATEGORIES[type][0],
    amount: '',
    date: DEMO_TODAY,
    dueDate: DEMO_TODAY,
    method: 'pix',
    status: 'pendente',
    person: '',
    notes: '',
  };
}

function isEntryType(v: string): v is EntryType {
  return v === 'receita' || v === 'despesa' || v === 'repasse';
}

export function NewEntryModal({ open, onClose, onSave, defaultType = 'receita' }: NewEntryModalProps) {
  const [form, setForm] = useState<FormState>(() => initialState(defaultType));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(defaultType));
      setErrors({});
    }
  }, [open, defaultType]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parsedAmount = Number(form.amount.replace(/\./g, '').replace(',', '.'));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.description.trim()) next.description = 'Informe uma descrição.';
    if (!form.amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) next.amount = 'Informe um valor maior que zero.';
    if (!form.date) next.date = 'Informe a data.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({
      id: `fe-${Date.now()}`,
      type: form.type,
      description: form.description.trim(),
      category: form.category,
      amount: parsedAmount,
      date: form.date,
      dueDate: form.dueDate || undefined,
      method: form.method,
      status: form.status,
      patientName: form.type === 'receita' && form.person.trim() ? form.person.trim() : undefined,
      professionalName: form.type === 'repasse' && form.person.trim() ? form.person.trim() : undefined,
    });
  };

  const personLabel =
    form.type === 'receita' ? 'Paciente' : form.type === 'repasse' ? 'Profissional' : 'Fornecedor';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo lançamento"
      description="Registre uma receita, despesa ou repasse. Dados de demonstração — nada é salvo."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="new-entry-form">
            Salvar lançamento
          </Button>
        </>
      }
    >
      <form id="new-entry-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-graphite-800">Tipo de lançamento</span>
          <SegmentedControl
            ariaLabel="Tipo de lançamento"
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(v) => {
              if (isEntryType(v)) setForm((f) => ({ ...f, type: v, category: FINANCE_CATEGORIES[v][0] }));
            }}
          />
        </div>
        <Input
          label="Descrição"
          placeholder="Ex.: Sessão de fisioterapia"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Categoria"
            options={FINANCE_CATEGORIES[form.type].map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          />
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
            required
          />
          <Input
            label="Data de competência"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
            required
          />
          <Input
            label="Vencimento"
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
          <Select
            label="Forma de pagamento"
            options={METHOD_OPTIONS}
            value={form.method}
            onChange={(e) => set('method', e.target.value as PaymentMethod)}
          />
          <Select
            label="Situação"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set('status', e.target.value as PaymentStatus)}
          />
        </div>
        <Input
          label={personLabel}
          placeholder={`Nome do(a) ${personLabel.toLowerCase()} (opcional)`}
          value={form.person}
          onChange={(e) => set('person', e.target.value)}
        />
        <Textarea
          label="Observações"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          hint="Visível apenas para a equipe."
        />
      </form>
    </Modal>
  );
}
