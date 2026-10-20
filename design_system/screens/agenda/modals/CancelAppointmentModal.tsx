import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Appointment } from '@ds/mocks/types';
import { Button, Modal, Select, Switch, Textarea } from '@ds/components';
import { formatDate, formatTime } from '@ds/mocks/clinical';

export interface CancelAppointmentModalProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (appointment: Appointment, reason: string, notify: boolean) => void;
}

const REASONS = [
  'Solicitação do paciente',
  'Indisponibilidade do profissional',
  'Conflito de agenda',
  'Problema de saúde do paciente',
  'Outro motivo',
];

export function CancelAppointmentModal({ appointment, open, onClose, onConfirm }: CancelAppointmentModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setDetails('');
      setNotify(true);
      setError(undefined);
      setSaving(false);
    }
  }, [open]);

  if (!appointment) return null;

  function submit() {
    if (!appointment) return;
    if (!reason) {
      setError('Selecione o motivo do cancelamento.');
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      onConfirm(appointment, details ? `${reason} — ${details}` : reason, notify);
      setSaving(false);
    }, 500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Cancelar consulta"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Manter consulta
          </Button>
          <Button variant="danger" onClick={submit} loading={saving}>
            Cancelar consulta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-md bg-danger-bg p-3 text-sm text-danger">
          <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          <p>
            A consulta de <strong>{appointment.patientName}</strong> em {formatDate(appointment.start)} às{' '}
            {formatTime(appointment.start)} será cancelada e o horário ficará livre.
          </p>
        </div>
        <Select
          id="cancel-reason"
          label="Motivo"
          placeholder="Selecione o motivo"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(undefined);
          }}
          options={REASONS.map((r) => ({ value: r, label: r }))}
          error={error}
          required
        />
        <Textarea
          id="cancel-details"
          label="Detalhes (opcional)"
          rows={2}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <Switch
          checked={notify}
          onChange={setNotify}
          label="Avisar paciente pelo WhatsApp"
          description="Envia mensagem com opção de remarcar (simulação)."
        />
      </div>
    </Modal>
  );
}
