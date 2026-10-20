import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AppError, AppointmentRecord } from '@core';
import { Button, Modal, Select, Switch, Textarea } from '@ds/components';
import { formatDate, formatTime } from '@ds/mocks/clinical';

export interface CancelAppointmentModalProps {
  appointment: AppointmentRecord | null;
  open: boolean;
  onClose: () => void;
  /** Envia ao serviço da Agenda. Devolve o agendamento cancelado ou `undefined` em caso de erro. */
  onConfirm: (appointment: AppointmentRecord, reason: string, notify: boolean) => Promise<AppointmentRecord | undefined>;
  error?: AppError | null;
  saving?: boolean;
}

const REASONS = [
  'Solicitação do paciente',
  'Indisponibilidade do profissional',
  'Conflito de agenda',
  'Problema de saúde do paciente',
  'Outro motivo',
];

export function CancelAppointmentModal({ appointment, open, onClose, onConfirm, error, saving = false }: CancelAppointmentModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [notify, setNotify] = useState(true);
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setReason('');
      setDetails('');
      setNotify(true);
      setLocalError(undefined);
    }
  }, [open]);

  if (!appointment) return null;

  function submit() {
    if (!appointment) return;
    if (!reason) {
      setLocalError('Selecione o motivo do cancelamento.');
      return;
    }
    void onConfirm(appointment, details.trim() ? `${reason} — ${details.trim()}` : reason, notify);
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
            setLocalError(undefined);
          }}
          options={REASONS.map((r) => ({ value: r, label: r }))}
          error={localError ?? error?.fields?.reason}
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
