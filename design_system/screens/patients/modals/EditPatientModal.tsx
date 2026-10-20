import { useEffect, useState, type FormEvent } from 'react';
import { todayKey, useAction, type PatientRecord } from '@core';
import { Button, Modal } from '@ds/components';
import { savePatient } from '../data/patientData';
import {
  EMPTY_PATIENT_FORM,
  PatientFormFields,
  formToInput,
  patientToForm,
  validatePatientForm,
  type PatientFormErrors,
  type PatientFormValues,
} from './PatientFormFields';

export interface EditPatientModalProps {
  /** Cadastro completo (escopo da clínica). */
  patient: PatientRecord | null;
  open: boolean;
  onClose: () => void;
  /** Chamado com o cadastro atualizado (mesmo ID). */
  onSaved?: (patient: PatientRecord) => void;
}

export function EditPatientModal({ patient, open, onClose, onSaved }: EditPatientModalProps) {
  const [values, setValues] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [errors, setErrors] = useState<PatientFormErrors>({});
  const save = useAction(savePatient, { success: 'Cadastro atualizado' });

  useEffect(() => {
    if (open && patient) {
      setValues(patientToForm(patient));
      setErrors({});
    }
    // Recarrega só ao abrir: edições de outra tela não sobrescrevem o rascunho em andamento.
  }, [open, patient?.id]);

  useEffect(() => {
    if (save.error?.fields) setErrors((prev) => ({ ...prev, ...save.error?.fields }));
  }, [save.error]);

  if (!patient) return null;

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!patient) return;
    const next = validatePatientForm(values, todayKey());
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const updated = await save.run(patient.id, formToInput(values));
    if (updated) onSaved?.(updated);
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
          <Button variant="secondary" onClick={onClose} disabled={save.loading}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-patient-form" loading={save.loading}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="edit-patient-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {save.error && !save.error.fields && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
            {save.error.message}
          </p>
        )}
        <PatientFormFields
          idPrefix="ep"
          values={values}
          errors={errors}
          onChange={(v) => {
            setValues(v);
            if (save.error) save.clearError();
          }}
          disabled={save.loading}
        />
        <p className="text-xs text-graphite-500">
          O identificador ({patient.id}) e os agendamentos vinculados são mantidos. Nome alterado aparece na Agenda e no Portal.
        </p>
      </form>
    </Modal>
  );
}
