import type { Patient } from '@ds/mocks/types';
import { Input, Select } from '@ds/components';

export interface PatientFormValues {
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  city: string;
  tags: string;
  status: Patient['status'];
}

export type PatientFormErrors = Partial<Record<keyof PatientFormValues, string>>;

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  name: '',
  birthDate: '',
  phone: '',
  email: '',
  city: 'Ronda Alta',
  tags: '',
  status: 'ativo',
};

export function patientToForm(p: Patient): PatientFormValues {
  return {
    name: p.name,
    birthDate: p.birthDate,
    phone: p.phone,
    email: p.email ?? '',
    city: p.city,
    tags: p.tags.join(', '),
    status: p.status,
  };
}

export function validatePatientForm(v: PatientFormValues): PatientFormErrors {
  const e: PatientFormErrors = {};
  if (v.name.trim().split(/\s+/).length < 2) e.name = 'Informe nome e sobrenome.';
  if (!v.birthDate) e.birthDate = 'Informe a data de nascimento.';
  if (v.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone com DDD, ex.: (54) 99999-0000.';
  if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'E-mail em formato inválido.';
  if (!v.city.trim()) e.city = 'Informe a cidade.';
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
        options={CITIES.map((c) => ({ value: c, label: c }))}
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
        onChange={(e) => set('status', e.target.value as Patient['status'])}
        options={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'inativo', label: 'Inativo' },
        ]}
        disabled={disabled}
      />
    </div>
  );
}
