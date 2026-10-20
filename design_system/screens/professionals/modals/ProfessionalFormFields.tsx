import type { Professional, Specialty } from '@ds/mocks/types';
import { Input, Select } from '@ds/components';
import { ALL_SPECIALTIES, ROOM_USAGE, SPECIALTY_NAMES, rooms } from '@ds/mocks/clinical';

export interface ProfessionalFormValues {
  name: string;
  title: string;
  specialty: Specialty | '';
  registry: string;
  roomId: string;
}

export type ProfessionalFormErrors = Partial<Record<keyof ProfessionalFormValues, string>>;

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

export function validateProfessionalForm(v: ProfessionalFormValues): ProfessionalFormErrors {
  const e: ProfessionalFormErrors = {};
  if (v.name.trim().split(/\s+/).length < 2) e.name = 'Informe nome e sobrenome.';
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

export function ProfessionalFormFields({ idPrefix, values, errors, onChange, disabled }: ProfessionalFormFieldsProps) {
  const set = <K extends keyof ProfessionalFormValues>(k: K, v: ProfessionalFormValues[K]) => onChange({ ...values, [k]: v });
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
        options={ALL_SPECIALTIES.map((s) => ({ value: s, label: SPECIALTY_NAMES[s] }))}
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
        options={rooms.map((r) => ({ value: r.id, label: `${r.name} — ${ROOM_USAGE[r.id]}` }))}
        error={errors.roomId}
        disabled={disabled}
        required
      />
    </div>
  );
}
