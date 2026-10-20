import { useEffect, useState, type FormEvent } from 'react';
import type { Professional } from '@core';
import { useAction } from '@core';
import { Button, Modal } from '@ds/components';
import { updateProfessional } from '../professionalActions';
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
  /** Chamado com o cadastro atualizado no core (o modal já mostra o toast). */
  onSave?: (professional: Professional) => void;
}

export function EditProfessionalModal({ professional, open, onClose, onSave }: EditProfessionalModalProps) {
  const save = useAction(updateProfessional, { success: 'Perfil atualizado' });
  const [values, setValues] = useState<ProfessionalFormValues>(EMPTY_PROFESSIONAL_FORM);
  const [errors, setErrors] = useState<ProfessionalFormErrors>({});

  useEffect(() => {
    if (open && professional) {
      setValues(professionalToForm(professional));
      setErrors({});
      save.clearError();
    }
    // Só ao abrir: o cadastro muda após salvar e não deve sobrescrever o formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, professional?.id]);

  if (!professional) return null;

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!professional) return;
    const next = validateProfessionalForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const updated = await save.run(professional.id, values);
    if (!updated) return;
    onSave?.(updated);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      dismissible={!save.loading}
      title="Editar profissional"
      description={professional.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.loading}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-professional-form" loading={save.loading}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="edit-professional-form" onSubmit={handleSubmit} noValidate>
        <ProfessionalFormFields
          idPrefix="epf"
          values={values}
          errors={{ ...save.error?.fields, ...errors }}
          onChange={setValues}
          disabled={save.loading}
        />
      </form>
    </Modal>
  );
}
