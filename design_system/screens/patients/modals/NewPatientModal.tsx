import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Patient } from '@ds/mocks/types';
import { Button, Checkbox, Modal } from '@ds/components';
import { toDateKey, DEMO_TODAY } from '@ds/mocks/clinical';
import {
  EMPTY_PATIENT_FORM,
  PatientFormFields,
  validatePatientForm,
  type PatientFormErrors,
  type PatientFormValues,
} from './PatientFormFields';

export interface NewPatientModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (patient: Patient) => void;
}

export function NewPatientModal({ open, onClose, onCreate }: NewPatientModalProps) {
  const [values, setValues] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [errors, setErrors] = useState<PatientFormErrors>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(EMPTY_PATIENT_FORM);
      setErrors({});
      setConsent(false);
      setConsentError(false);
      setSaving(false);
    }
  }, [open]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const next = validatePatientForm(values);
    setErrors(next);
    setConsentError(!consent);
    if (Object.keys(next).length > 0 || !consent) return;
    setSaving(true);
    window.setTimeout(() => {
      onCreate({
        id: `pac-${Date.now()}`,
        name: values.name.trim(),
        birthDate: values.birthDate,
        phone: values.phone,
        email: values.email || undefined,
        city: values.city,
        tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
        createdAt: toDateKey(DEMO_TODAY),
        balance: 0,
        status: values.status,
      });
      setSaving(false);
    }, 600);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Novo paciente"
      description="Cadastro administrativo. Informações clínicas ficam no prontuário restrito."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-patient-form" loading={saving}>
            Cadastrar paciente
          </Button>
        </>
      }
    >
      <form id="new-patient-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <PatientFormFields idPrefix="np" values={values} errors={errors} onChange={setValues} disabled={saving} />
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
      </form>
    </Modal>
  );
}
