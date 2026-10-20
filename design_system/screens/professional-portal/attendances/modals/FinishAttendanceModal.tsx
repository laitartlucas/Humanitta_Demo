import { useEffect, useState } from 'react';
import { CircleCheckBig, Info } from 'lucide-react';
import { Button, Checkbox, Modal, Select, Textarea } from '@ds/components';
import { formatTime, toDateKey } from '@ds/mocks/clinical';
import type { PortalAppointment } from '@ds/mocks/portal';
import { PORTAL_TODAY } from '@ds/mocks/portal';
import { addDays } from '../../../agenda/agendaUtils';
import { weekdayDate } from '../../shared/portalUtils';

export type ReturnInterval = 'sem' | '7' | '15' | '30' | '60' | '180';

export interface FinishAttendanceResult {
  appointmentId: string;
  returnIn: ReturnInterval;
  /** Data sugerida (AAAA-MM-DD) — a recepção confirma com o paciente. */
  suggestedDate?: string;
  noteToReception?: string;
}

export interface FinishAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  appointment: PortalAppointment | null;
  /** Minutos decorridos desde o início. */
  elapsedMin: number;
  onConfirm: (result: FinishAttendanceResult) => void;
}

const RETURN_OPTIONS: { value: ReturnInterval; label: string }[] = [
  { value: 'sem', label: 'Sem retorno' },
  { value: '7', label: 'Em 7 dias' },
  { value: '15', label: 'Em 15 dias' },
  { value: '30', label: 'Em 30 dias' },
  { value: '60', label: 'Em 60 dias' },
  { value: '180', label: 'Em 6 meses' },
];

/** Retorno sugerido por serviço (padrão da demonstração; ajustável). */
export function suggestedReturnFor(service: string): ReturnInterval {
  if (/manuten/i.test(service)) return '30';
  if (/limpeza|profilaxia/i.test(service)) return '180';
  if (/clareamento|avalia/i.test(service)) return '15';
  if (/retorno/i.test(service)) return '60';
  return '30';
}

/** Finalização do atendimento com retorno sugerido para a recepção agendar. */
export function FinishAttendanceModal({ open, onClose, appointment, elapsedMin, onConfirm }: FinishAttendanceModalProps) {
  const [returnIn, setReturnIn] = useState<ReturnInterval>('30');
  const [note, setNote] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open || !appointment) return;
    setReturnIn(suggestedReturnFor(appointment.service));
    setNote('');
    setReviewed(false);
    setError(undefined);
  }, [open, appointment]);

  const suggestedDate = returnIn === 'sem' ? undefined : toDateKey(addDays(PORTAL_TODAY, Number(returnIn)));

  function confirm() {
    if (!appointment) return;
    if (!reviewed) {
      setError('Confirme que revisou o registro clínico antes de finalizar.');
      return;
    }
    onConfirm({ appointmentId: appointment.id, returnIn, suggestedDate, noteToReception: note.trim() || undefined });
  }

  return (
    <Modal
      open={open && Boolean(appointment)}
      onClose={onClose}
      size="md"
      title="Finalizar atendimento"
      description={appointment ? `${appointment.patientName} · ${appointment.service}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar ao atendimento
          </Button>
          <Button leftIcon={CircleCheckBig} onClick={confirm}>
            Finalizar
          </Button>
        </>
      }
    >
      {appointment && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-3 gap-3 rounded-md bg-graphite-50 p-4 text-body-sm">
            <div>
              <dt className="text-caption text-graphite-500">Agendado</dt>
              <dd className="font-bold tabular-nums text-graphite-900">{formatTime(appointment.start)}</dd>
            </div>
            <div>
              <dt className="text-caption text-graphite-500">Duração</dt>
              <dd className="font-bold tabular-nums text-graphite-900">{elapsedMin} min</dd>
            </div>
            <div>
              <dt className="text-caption text-graphite-500">Previsto</dt>
              <dd className="font-bold tabular-nums text-graphite-900">{appointment.durationMin} min</dd>
            </div>
          </dl>

          <Select
            label="Retorno sugerido"
            value={returnIn}
            onChange={(e) => setReturnIn(e.target.value as ReturnInterval)}
            options={RETURN_OPTIONS}
            hint={
              suggestedDate
                ? `Por volta de ${weekdayDate(suggestedDate)}. A recepção confirma a data com o paciente.`
                : 'A recepção não será avisada para agendar retorno.'
            }
          />
          <Textarea
            label="Recado para a recepção (opcional)"
            rows={3}
            maxLength={240}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: preferência de horário pela manhã."
            hint="Visível para a recepção. Não inclua informações clínicas."
          />
          <Checkbox
            label="Revisei o registro clínico deste atendimento"
            description="O registro fica bloqueado para edição após finalizar (correções geram nova versão auditada)."
            checked={reviewed}
            onChange={(e) => {
              setReviewed(e.target.checked);
              if (e.target.checked) setError(undefined);
            }}
            error={error}
          />
          <p className="flex items-start gap-2 text-caption text-graphite-500">
            <Info size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
            Pagamento e emissão de recibo seguem com a recepção — valores não aparecem aqui.
          </p>
        </div>
      )}
    </Modal>
  );
}
