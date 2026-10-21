import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge, Button, Input, Modal, Select, SegmentedControl, Textarea } from '@ds/components';
import type { AppointmentRecord, FinancialEntryRecord, PatientRecord, PaymentMethod, Professional } from '@core';
import { FINANCE_CATEGORIES, PAYMENT_METHOD_LABEL, formatCurrency, formatDateBR } from '@ds/mocks/business';
import { centsToInput, parseCurrencyInput, toCents, type EntryDraft } from '@modules/finance/domain';

type EntryType = FinancialEntryRecord['type'];

export interface NewEntryModalProps {
  open: boolean;
  onClose: () => void;
  /** Recebe o rascunho validado no cliente; a validação definitiva é do serviço. */
  onSave: (draft: EntryDraft) => void;
  defaultType?: EntryType;
  /** Lançamento em edição (tipo e situação não mudam). Ausente = novo lançamento. */
  entry?: FinancialEntryRecord | null;
  /** "Hoje" da demonstração ("AAAA-MM-DD"). */
  today: string;
  patients: PatientRecord[];
  professionals: Professional[];
  /** Consultas concluídas ainda sem cobrança (para vincular a receita). */
  billable: AppointmentRecord[];
  /** Tipos que o perfil pode lançar (financeiro → receita/despesa; repasses → repasse). */
  allowedTypes: EntryType[];
  saving?: boolean;
  /** Erros por campo devolvidos pelo serviço (`AppError.fields`). */
  serverErrors?: Record<string, string>;
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

const STATUS_OPTIONS: { value: EntryDraft['status']; label: string }[] = [
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
  status: EntryDraft['status'];
  appointmentId: string;
  patientId: string;
  professionalId: string;
  notes: string;
}

function initialState(type: EntryType, today: string, entry?: FinancialEntryRecord | null): FormState {
  if (entry) {
    return {
      type: entry.type,
      description: entry.description,
      category: entry.category,
      amount: centsToInput(toCents(entry.amount)),
      date: entry.date,
      dueDate: entry.dueDate ?? '',
      method: entry.method ?? 'pix',
      status: 'pendente',
      appointmentId: entry.appointmentId ?? '',
      patientId: entry.patientId ?? '',
      professionalId: entry.professionalId ?? '',
      notes: '',
    };
  }
  return {
    type,
    description: '',
    category: FINANCE_CATEGORIES[type][0],
    amount: '',
    date: today,
    dueDate: today,
    method: 'pix',
    status: 'pendente',
    appointmentId: '',
    patientId: '',
    professionalId: '',
    notes: '',
  };
}

function isEntryType(v: string): v is EntryType {
  return v === 'receita' || v === 'despesa' || v === 'repasse';
}

const TYPE_LABEL: Record<EntryType, string> = { receita: 'Receita', despesa: 'Despesa', repasse: 'Repasse' };

export function NewEntryModal({
  open,
  onClose,
  onSave,
  defaultType = 'receita',
  entry,
  today,
  patients,
  professionals,
  billable,
  allowedTypes,
  saving = false,
  serverErrors,
}: NewEntryModalProps) {
  const editing = Boolean(entry);
  const firstType = allowedTypes.includes(defaultType) ? defaultType : allowedTypes[0] ?? 'receita';
  const [form, setForm] = useState<FormState>(() => initialState(firstType, today, entry));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(firstType, today, entry));
      setErrors({});
    }
  }, [open, firstType, today, entry]);

  useEffect(() => {
    if (serverErrors) setErrors(serverErrors);
  }, [serverErrors]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Na edição, o atendimento já vinculado continua disponível na lista.
  const appointmentOptions = useMemo(() => {
    const list = [...billable];
    if (entry?.appointmentId && !list.some((a) => a.id === entry.appointmentId)) {
      const linked = { id: entry.appointmentId, label: `Atendimento vinculado (${entry.patientName ?? 'paciente'})` };
      return [{ value: '', label: 'Sem atendimento vinculado' }, { value: linked.id, label: linked.label }];
    }
    return [
      { value: '', label: 'Sem atendimento vinculado' },
      ...list.map((a) => ({
        value: a.id,
        label: `${formatDateBR(a.start)} · ${a.patientName} · ${a.service}${a.price > 0 ? ` · ${formatCurrency(a.price)}` : ''}`,
      })),
    ];
  }, [billable, entry]);

  const pickAppointment = (id: string) => {
    const appt = billable.find((a) => a.id === id);
    setErrors((e) => ({ ...e, appointmentId: undefined }));
    if (!appt) {
      setForm((f) => ({ ...f, appointmentId: id }));
      return;
    }
    const day = appt.start.slice(0, 10);
    setForm((f) => ({
      ...f,
      appointmentId: appt.id,
      patientId: appt.patientId,
      professionalId: appt.professionalId,
      description: f.description.trim() ? f.description : appt.service,
      amount: appt.price > 0 ? centsToInput(toCents(appt.price)) : f.amount,
      date: day,
      dueDate: f.dueDate && f.dueDate >= day ? f.dueDate : day,
    }));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cents = parseCurrencyInput(form.amount);
    const next: Record<string, string> = {};
    if (!form.description.trim()) next.description = 'Informe uma descrição.';
    if (cents === null || cents <= 0) next.amount = 'Informe um valor maior que zero (ex.: 250,00).';
    if (!form.date) next.date = 'Informe a data.';
    if (form.dueDate && form.date && form.dueDate < form.date) next.dueDate = 'O vencimento não pode ser anterior à data de competência.';
    if (form.type === 'repasse' && !form.professionalId) next.professionalId = 'Selecione o profissional do repasse.';
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null) return;
    onSave({
      type: form.type,
      description: form.description.trim(),
      category: form.category,
      amountCents: cents,
      date: form.date,
      dueDate: form.dueDate || undefined,
      method: form.method,
      status: form.status,
      appointmentId: form.type === 'receita' ? form.appointmentId || undefined : undefined,
      patientId: form.type === 'receita' ? form.patientId || undefined : undefined,
      professionalId: form.type !== 'despesa' ? form.professionalId || undefined : undefined,
    });
  };

  const linkedToAppointment = form.type === 'receita' && Boolean(form.appointmentId);
  const typeOptions = TYPE_OPTIONS.filter((o) => allowedTypes.includes(o.value));
  const patientOptions = [{ value: '', label: 'Sem paciente vinculado' }, ...patients.map((p) => ({ value: p.id, label: p.name }))];
  const professionalOptions = [
    { value: '', label: form.type === 'repasse' ? 'Selecione o profissional' : 'Sem profissional vinculado' },
    ...professionals.map((p) => ({ value: p.id, label: `${p.name} — ${p.title}` })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={editing ? 'Editar lançamento' : 'Novo lançamento'}
      description={
        editing
          ? 'Ajuste os dados do lançamento em aberto. Dados de demonstração.'
          : 'Registre uma receita, despesa ou repasse. Dados de demonstração — valores fictícios.'
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-entry-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Salvar lançamento'}
          </Button>
        </>
      }
    >
      <form id="new-entry-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-graphite-800">Tipo de lançamento</span>
          {editing || typeOptions.length === 1 ? (
            <div>
              <Badge tone="neutral">{TYPE_LABEL[form.type]}</Badge>
            </div>
          ) : (
            <SegmentedControl
              ariaLabel="Tipo de lançamento"
              options={typeOptions}
              value={form.type}
              onChange={(v) => {
                if (isEntryType(v)) setForm((f) => ({ ...f, type: v, category: FINANCE_CATEGORIES[v][0], appointmentId: '', patientId: '', professionalId: '' }));
              }}
            />
          )}
          {errors.type && <p className="text-xs text-danger">{errors.type}</p>}
        </div>

        {form.type === 'receita' && (
          <Select
            label="Atendimento relacionado"
            options={appointmentOptions}
            value={form.appointmentId}
            onChange={(e) => pickAppointment(e.target.value)}
            error={errors.appointmentId}
            hint="Consultas concluídas ainda sem cobrança. Paciente, profissional e valor são preenchidos a partir do atendimento."
          />
        )}

        <Input
          label="Descrição"
          placeholder="Ex.: Sessão de fisioterapia"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          maxLength={120}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Categoria"
            options={FINANCE_CATEGORIES[form.type].map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            error={errors.category}
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
            min={form.date || undefined}
            onChange={(e) => set('dueDate', e.target.value)}
            error={errors.dueDate}
          />
          <Select
            label="Forma de pagamento"
            options={METHOD_OPTIONS}
            value={form.method}
            onChange={(e) => set('method', e.target.value as PaymentMethod)}
            error={errors.method}
          />
          {editing ? (
            <Input label="Situação" value="Em aberto" readOnly hint="Para quitar, use “Registrar pagamento”." />
          ) : (
            <Select
              label="Situação"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => set('status', e.target.value === 'pago' ? 'pago' : 'pendente')}
            />
          )}
        </div>

        {form.type === 'receita' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Paciente"
              options={patientOptions}
              value={form.patientId}
              onChange={(e) => set('patientId', e.target.value)}
              error={errors.patientId}
              disabled={linkedToAppointment}
            />
            <Select
              label="Profissional"
              options={professionalOptions}
              value={form.professionalId}
              onChange={(e) => set('professionalId', e.target.value)}
              error={errors.professionalId}
              disabled={linkedToAppointment}
            />
          </div>
        )}
        {form.type === 'repasse' && (
          <Select
            label="Profissional"
            options={professionalOptions}
            value={form.professionalId}
            onChange={(e) => set('professionalId', e.target.value)}
            error={errors.professionalId}
            required
          />
        )}

        <Textarea
          label="Observações"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          disabled
          hint="Disponível quando o campo de observações for incluído no modelo compartilhado."
        />
      </form>
    </Modal>
  );
}
