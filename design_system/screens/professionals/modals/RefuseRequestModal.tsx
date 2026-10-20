import { useEffect, useState } from 'react';
import type { BlockRequestRecord } from '@core';
import { Button, Modal, Textarea } from '@ds/components';

export interface RefuseRequestModalProps {
  request: BlockRequestRecord | null;
  open: boolean;
  loading?: boolean;
  /** Erro do serviço para o campo do motivo. */
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Recusa de solicitação de bloqueio/disponibilidade — o motivo é obrigatório e aparece para o profissional. */
export function RefuseRequestModal({ request, open, loading = false, error, onClose, onConfirm }: RefuseRequestModalProps) {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setReason('');
      setLocalError(undefined);
    }
  }, [open]);

  function confirm() {
    if (!reason.trim()) {
      setLocalError('Informe o motivo da recusa.');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <Modal
      open={open && Boolean(request)}
      onClose={onClose}
      size="sm"
      dismissible={!loading}
      title="Recusar solicitação"
      description="O profissional verá o motivo no Portal. Não inclua dados de pacientes."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} loading={loading}>
            Recusar
          </Button>
        </>
      }
    >
      <Textarea
        label="Motivo da recusa"
        rows={3}
        maxLength={280}
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={localError ?? error}
        hint={`${reason.length}/280`}
      />
    </Modal>
  );
}
