import { useEffect, useState, type FormEvent } from 'react';
import type { Professional, Specialty } from '@ds/mocks/types';
import { Button, Modal } from '@ds/components';
import {
  EMPTY_PROFESSIONAL_FORM,
  ProfessionalFormFields,
  validateProfessionalForm,
  type ProfessionalFormErrors,
  type ProfessionalFormValues,
} from './ProfessionalFormFields';

export interface NewProfessionalModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (professional: Professional) => void;
}

export function NewProfessionalModal({ open, onClose, onCreate }: NewProfessionalModalProps) {
  const [values, setValues] = useState<ProfessionalFormValues>(EMPTY_PROFESSIONAL_FORM);
  const [errors, setErrors] = useState<ProfessionalFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(EMPTY_PROFESSIONAL_FORM);
      setErrors({});
      setSaving(false);
    }
  }, [open]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const next = validateProfessionalForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    window.setTimeout(() => {
      onCreate({
        id: `prof-${Date.now()}`,
        name: values.name.trim(),
        title: values.title.trim(),
        specialty: values.specialty as Specialty,
        registry: values.registry || undefined,
        isDemo: true,
        roomId: values.roomId,
        workingHours: [1, 2, 3, 4, 5].map((d) => ({ weekday: d as 1 | 2 | 3 | 4 | 5, start: '08:00', end: '17:00' })),
        occupancy: 0,
      });
      setSaving(false);
    }, 600);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Novo profissional"
      description="Cadastro de demonstração. Os horários padrão (seg–sex, 08:00–17:00) podem ser ajustados no perfil."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-professional-form" loading={saving}>
            Cadastrar profissional
          </Button>
        </>
      }
    >
      <form id="new-professional-form" onSubmit={handleSubmit} noValidate>
        <ProfessionalFormFields idPrefix="npf" values={values} errors={errors} onChange={setValues} disabled={saving} />
      </form>
    </Modal>
  );
}
