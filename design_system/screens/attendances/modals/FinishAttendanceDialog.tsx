import { useEffect, useState } from 'react';
import { CircleCheckBig, HelpCircle } from 'lucide-react';
import { Button, Modal } from '@ds/components';
import { formatTime } from '@ds/mocks/clinical';
import { emptyDemoNote, parseDemoNote, type DemoNote } from '@modules/attendances/clinicalNote';
import type { AttendanceView } from '@modules/attendances/model';
import { DemoNoteFields } from '../components/DemoRecordPanel';

export interface FinishAttendanceDialogProps {
  view: AttendanceView | null;
  open: boolean;
  onClose: () => void;
  /** Texto atual do registro demonstrativo (para pré-preencher). */
  existingSummary?: string;
  loading?: boolean;
  errors?: Record<string, string>;
  /** Devolve `true` quando concluiu (fecha o diálogo). */
  onConfirm: (note: DemoNote, fictitiousConfirmed: boolean) => Promise<boolean>;
}

/** Confirmação antes de concluir o atendimento, com registro demonstrativo opcional. */
export function FinishAttendanceDialog({ view, open, onClose, existingSummary, loading, errors, onConfirm }: FinishAttendanceDialogProps) {
  const [note, setNote] = useState<DemoNote>(emptyDemoNote);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setNote(existingSummary ? parseDemoNote(existingSummary) : emptyDemoNote());
      setConfirmed(false);
    }
  }, [open, existingSummary]);

  if (!view) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      dismissible={!loading}
      title="Concluir atendimento?"
      description={`${view.patient.name} · ${view.service}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button leftIcon={CircleCheckBig} loading={loading} onClick={async () => (await onConfirm(note, confirmed)) && onClose()}>
            Concluir atendimento
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
            <HelpCircle size={20} strokeWidth={1.75} />
          </span>
          <p className="pt-2 text-body text-graphite-700">
            O horário de conclusão será registrado agora e a consulta passa a <strong>Concluída</strong> na agenda. Esta ação não pode ser desfeita.
            {view.startedAt && ` Atendimento iniciado às ${formatTime(view.startedAt)}.`}
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-bold text-graphite-900">Registro demonstrativo (opcional)</h3>
          <p className="mb-2 text-xs text-graphite-500">Deixe em branco para concluir sem registro. Conteúdo fictício, visível somente a você.</p>
          <DemoNoteFields
            idPrefix={`finish-${view.id}`}
            note={note}
            onChange={setNote}
            confirmed={confirmed}
            onConfirmedChange={setConfirmed}
            errors={errors}
            disabled={loading}
          />
        </div>
      </div>
    </Modal>
  );
}
