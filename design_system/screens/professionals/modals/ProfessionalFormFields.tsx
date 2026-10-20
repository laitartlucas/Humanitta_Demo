import type { Professional, Specialty } from '@core';
import { useRooms, useSpecialties } from '@core';
import { Input, Select } from '@ds/components';
import type { ProfessionalInput } from '../professionalActions';

export type ProfessionalFormValues = ProfessionalInput;

export type ProfessionalFormErrors = Partial<Record<keyof ProfessionalFormValues | 'accessEmail', string>>;

export const EMPTY_PROFESSIONAL_FORM: ProfessionalFormValues = {
  name: '',
  title: '',
  specialty: '',
  registry: '',
  roomId: '',
};

export function professionalToForm(p: Professional): ProfessionalFormValues {
  return { name: p.name, title: p.title, specialty: p.specialty, registry: p.registry ?? '', roomId: p.roomId ?? '' };
}

/** Validação imediata do formulário (o serviço revalida as mesmas regras). */
export function validateProfessionalForm(v: ProfessionalFormValues): ProfessionalFormErrors {
  const e: ProfessionalFormErrors = {};
  if (v.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Informe nome e sobrenome.';
  if (!v.title.trim()) e.title = 'Informe o cargo ou título profissional.';
  if (!v.specialty) e.specialty = 'Selecione a especialidade.';
  if (!v.roomId) e.roomId = 'Selecione a sala de atendimento.';
  return e;
}

export interface ProfessionalFormFieldsProps {
  idPrefix: string;
  values: ProfessionalFormValues;
  errors: ProfessionalFormErrors;
  onChange: (v: ProfessionalFormValues) => void;
  disabled?: boolean;
}

/** Campos do cadastro. Especialidades e salas vêm das Configurações da clínica (core). */
export function ProfessionalFormFields({ idPrefix, values, errors, onChange, disabled }: ProfessionalFormFieldsProps) {
  const specialties = useSpecialties();
  const rooms = useRooms();
  const set = <K extends keyof ProfessionalFormValues>(k: K, v: ProfessionalFormValues[K]) => onChange({ ...values, [k]: v });
  // Mantém a opção atual visível mesmo se tiver sido desativada nas Configurações.
  const specialtyOptions = specialties
    .filter((s) => s.active || s.id === values.specialty)
    .map((s) => ({ value: s.id, label: s.active ? s.name : `${s.name} (inativa)` }));
  const roomOptions = rooms
    .filter((r) => r.active || r.id === values.roomId)
    .map((r) => ({ value: r.id, label: `${r.name} — ${r.label}${r.active ? '' : ' (inativa)'}` }));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input
          id={`${idPrefix}-name`}
          label="Nome profissional"
          placeholder="Ex.: Dra. Nome Sobrenome"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          disabled={disabled}
          required
        />
      </div>
      <Input
        id={`${idPrefix}-title`}
        label="Título / cargo"
        placeholder="Ex.: Fisioterapeuta"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        disabled={disabled}
        required
      />
      <Select
        id={`${idPrefix}-specialty`}
        label="Especialidade"
        placeholder="Selecione"
        value={values.specialty}
        onChange={(e) => set('specialty', e.target.value as Specialty)}
        options={specialtyOptions}
        error={errors.specialty}
        disabled={disabled}
        required
      />
      <Input
        id={`${idPrefix}-registry`}
        label="Registro profissional"
        placeholder="Ex.: CREFITO 000000"
        hint="Opcional"
        value={values.registry}
        onChange={(e) => set('registry', e.target.value)}
        disabled={disabled}
      />
      <Select
        id={`${idPrefix}-room`}
        label="Sala"
        placeholder="Selecione"
        value={values.roomId}
        onChange={(e) => set('roomId', e.target.value)}
        options={roomOptions}
        error={errors.roomId}
        disabled={disabled}
        required
      />
    </div>
  );
}
