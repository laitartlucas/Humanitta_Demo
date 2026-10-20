import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { todayKey, useAction, type PatientRecord } from '@core';
import { Button, Checkbox, Modal } from '@ds/components';
import { registerPatient } from '../data/patientData';
import {
  EMPTY_PATIENT_FORM,
  PatientFormFields,
  formToInput,
  validatePatientForm,
  type PatientFormErrors,
  type PatientFormValues,
} from './PatientFormFields';

export interface NewPatientModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado com o paciente já gravado na base compartilhada. */
  onCreated?: (patient: PatientRecord) => void;
}

export function NewPatientModal({ open, onClose, onCreated }: NewPatientModalProps) {
  const [values, setValues] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [errors, setErrors] = useState<PatientFormErrors>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const create = useAction(registerPatient, { success: 'Paciente cadastrado' });

  useEffect(() => {
    if (open) {
      setValues(EMPTY_PATIENT_FORM);
      setErrors({});
      setConsent(false);
      setConsentError(false);
    }
  }, [open]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const next = validatePatientForm(values, todayKey());
    setErrors(next);
    setConsentError(!consent);
    if (Object.keys(next).length > 0 || !consent) return;
    const created = await create.run(formToInput(values));
    if (created) onCreated?.(created);
  }

  // O erro do serviço (ex.: duplicidade) chega depois do run; reflete nos campos.
  useEffect(() => {
    if (create.error?.fields) setErrors((prev) => ({ ...prev, ...create.error?.fields }));
  }, [create.error]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Novo paciente"
      description="Cadastro administrativo. Informações clínicas ficam no prontuário restrito."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.loading}>
            Cancelar
          </Button>
          <Button type="submit" form="new-patient-form" loading={create.loading}>
            Cadastrar paciente
          </Button>
        </>
      }
    >
      <form id="new-patient-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {create.error && !create.error.fields && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
            {create.error.message}
          </p>
        )}
        <PatientFormFields
          idPrefix="np"
          values={values}
          errors={errors}
          onChange={(v) => {
            setValues(v);
            if (create.error) create.clearError();
          }}
          disabled={create.loading}
        />
        <div className="rounded-md border border-graphite-200 bg-graphite-50 p-3">
          <Checkbox
            id="np-consent"
            label="Paciente autorizou o uso dos dados para agendamento e contato (LGPD)"
            description="Necessário para enviar lembretes pelo WhatsApp."
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              setConsentError(false);
            }}
            aria-invalid={consentError}
          />
          {consentError && (
            <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
              <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
              Registre o consentimento para continuar.
            </p>
          )}
        </div>
        <p className="text-xs text-graphite-500">Demonstração: use apenas dados fictícios. Nunca cadastre dados reais de pacientes.</p>
      </form>
    </Modal>
  );
}
