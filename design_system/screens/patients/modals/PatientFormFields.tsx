import type { PatientRecord } from '@core';
import { Input, Select, Textarea } from '@ds/components';
import type { PatientFormInput } from '../data/patientData';

export interface PatientFormValues {
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  city: string;
  tags: string;
  adminNote: string;
  status: PatientRecord['status'];
}

export type PatientFormErrors = Partial<Record<keyof PatientFormValues, string>>;

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  name: '',
  birthDate: '',
  phone: '',
  email: '',
  city: 'Ronda Alta',
  tags: '',
  adminNote: '',
  status: 'ativo',
};

export function patientToForm(p: PatientRecord): PatientFormValues {
  return {
    name: p.name,
    birthDate: p.birthDate,
    phone: p.phone,
    email: p.email ?? '',
    city: p.city,
    tags: p.tags.join(', '),
    adminNote: p.adminNote ?? '',
    status: p.status,
  };
}

/** Valores do formulário → entrada dos comandos de cadastro/edição. */
export function formToInput(v: PatientFormValues): PatientFormInput {
  return {
    name: v.name,
    birthDate: v.birthDate,
    phone: v.phone,
    email: v.email,
    city: v.city,
    tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean),
    adminNote: v.adminNote,
    status: v.status,
  };
}

/**
 * Validação de interface (o serviço revalida). `today` = "AAAA-MM-DD" do relógio da demo.
 */
export function validatePatientForm(v: PatientFormValues, today: string): PatientFormErrors {
  const e: PatientFormErrors = {};
  if (v.name.trim().split(/\s+/).length < 2) e.name = 'Informe nome e sobrenome.';
  if (!v.birthDate) e.birthDate = 'Informe a data de nascimento.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.birthDate)) e.birthDate = 'Data de nascimento inválida.';
  else if (v.birthDate > today) e.birthDate = 'A data de nascimento não pode estar no futuro.';
  else if (Number(today.slice(0, 4)) - Number(v.birthDate.slice(0, 4)) > 120) e.birthDate = 'Confira o ano de nascimento.';
  const phone = v.phone.replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 11) e.phone = 'Telefone com DDD, ex.: (54) 99999-0000.';
  if (v.email && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'E-mail em formato inválido.';
  if (!v.city.trim()) e.city = 'Informe a cidade.';
  if (v.adminNote.length > 280) e.adminNote = 'Use no máximo 280 caracteres.';
  return e;
}

/** Máscara simples de telefone brasileiro. */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const CITIES = ['Ronda Alta', 'Sarandi', 'Rondinha', 'Três Palmeiras', 'Constantina', 'Engenho Velho', 'Pontão', 'Outra'];

export interface PatientFormFieldsProps {
  idPrefix: string;
  values: PatientFormValues;
  errors: PatientFormErrors;
  onChange: (values: PatientFormValues) => void;
  disabled?: boolean;
}

export function PatientFormFields({ idPrefix, values, errors, onChange, disabled }: PatientFormFieldsProps) {
  const set = <K extends keyof PatientFormValues>(k: K, v: PatientFormValues[K]) => onChange({ ...values, [k]: v });
  const cities = CITIES.includes(values.city) ? CITIES : [values.city, ...CITIES];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input
          id={`${idPrefix}-name`}
          label="Nome completo"
          autoComplete="off"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          disabled={disabled}
          required
        />
      </div>
      <Input
        id={`${idPrefix}-birth`}
        type="date"
        label="Data de nascimento"
        value={values.birthDate}
        onChange={(e) => set('birthDate', e.target.value)}
        error={errors.birthDate}
        disabled={disabled}
        required
      />
      <Input
        id={`${idPrefix}-phone`}
        type="tel"
        inputMode="tel"
        label="WhatsApp / telefone"
        placeholder="(54) 99999-0000"
        value={values.phone}
        onChange={(e) => set('phone', maskPhone(e.target.value))}
        error={errors.phone}
        disabled={disabled}
        required
      />
      <Input
        id={`${idPrefix}-email`}
        type="email"
        label="E-mail"
        hint="Opcional"
        value={values.email}
        onChange={(e) => set('email', e.target.value)}
        error={errors.email}
        disabled={disabled}
      />
      <Select
        id={`${idPrefix}-city`}
        label="Cidade"
        value={values.city}
        onChange={(e) => set('city', e.target.value)}
        options={cities.map((c) => ({ value: c, label: c }))}
        error={errors.city}
        disabled={disabled}
      />
      <Input
        id={`${idPrefix}-tags`}
        label="Etiquetas"
        hint="Separe por vírgulas. Ex.: WhatsApp, Plano mensal"
        value={values.tags}
        onChange={(e) => set('tags', e.target.value)}
        disabled={disabled}
      />
      <Select
        id={`${idPrefix}-status`}
        label="Situação"
        value={values.status}
        onChange={(e) => set('status', e.target.value as PatientRecord['status'])}
        options={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'inativo', label: 'Inativo' },
        ]}
        disabled={disabled}
      />
      <div className="sm:col-span-2">
        <Textarea
          id={`${idPrefix}-note`}
          label="Observação administrativa"
          hint="Opcional. Ex.: prefere horários pela manhã. Não registre informações clínicas aqui."
          rows={3}
          maxLength={280}
          value={values.adminNote}
          onChange={(e) => set('adminNote', e.target.value)}
          error={errors.adminNote}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
