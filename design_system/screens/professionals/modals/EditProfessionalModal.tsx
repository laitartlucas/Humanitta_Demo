import { useEffect, useState, type FormEvent } from 'react';
import type { Professional, Specialty } from '@ds/mocks/types';
import { Button, Modal } from '@ds/components';
import {
  EMPTY_PROFESSIONAL_FORM,
  ProfessionalFormFields,
  professionalToForm,
  validateProfessionalForm,
  type ProfessionalFormErrors,
  type ProfessionalFormValues,
} from './ProfessionalFormFields';

export interface EditProfessionalModalProps {
  professional: Professional | null;
  open: boolean;
  onClose: () => void;
  onSave: (professional: Professional) => void;
}

export function EditProfessionalModal({ professional, open, onClose, onSave }: EditProfessionalModalProps) {
  const [values, setValues] = useState<ProfessionalFormValues>(EMPTY_PROFESSIONAL_FORM);
  const [errors, setErrors] = useState<ProfessionalFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && professional) {
      setValues(professionalToForm(professional));
      setErrors({});
      setSaving(false);
    }
  }, [open, professional]);

  if (!professional) return null;

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!professional) return;
    const next = validateProfessionalForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    window.setTimeout(() => {
      onSave({
        ...professional,
        name: values.name.trim(),
        title: values.title.trim(),
        specialty: values.specialty as Specialty,
        registry: values.registry || undefined,
        roomId: values.roomId,
      });
      setSaving(false);
    }, 500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Editar profissional"
      description={professional.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-professional-form" loading={saving}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="edit-professional-form" onSubmit={handleSubmit} noValidate>
        <ProfessionalFormFields idPrefix="epf" values={values} errors={errors} onChange={setValues} disabled={saving} />
      </form>
    </Modal>
  );
}
