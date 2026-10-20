import { useEffect, useState, type FormEvent } from 'react';
import type { Patient } from '@ds/mocks/types';
import { Button, Modal } from '@ds/components';
import {
  EMPTY_PATIENT_FORM,
  PatientFormFields,
  patientToForm,
  validatePatientForm,
  type PatientFormErrors,
  type PatientFormValues,
} from './PatientFormFields';

export interface EditPatientModalProps {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

export function EditPatientModal({ patient, open, onClose, onSave }: EditPatientModalProps) {
  const [values, setValues] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [errors, setErrors] = useState<PatientFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && patient) {
      setValues(patientToForm(patient));
      setErrors({});
      setSaving(false);
    }
  }, [open, patient]);

  if (!patient) return null;

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!patient) return;
    const next = validatePatientForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    window.setTimeout(() => {
      onSave({
        ...patient,
        name: values.name.trim(),
        birthDate: values.birthDate,
        phone: values.phone,
        email: values.email || undefined,
        city: values.city,
        tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: values.status,
      });
      setSaving(false);
    }, 500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Editar paciente"
      description={patient.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-patient-form" loading={saving}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="edit-patient-form" onSubmit={handleSubmit} noValidate>
        <PatientFormFields idPrefix="ep" values={values} errors={errors} onChange={setValues} disabled={saving} />
      </form>
    </Modal>
  );
}
