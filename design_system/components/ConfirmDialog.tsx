import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
}

/** Confirmação de ação (ex.: cancelar consulta, estornar). Tamanho sm. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  tone = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  const Icon = tone === 'danger' ? AlertTriangle : HelpCircle;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-gold-50 text-gold-600',
          )}
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <p className="pt-2 text-body text-graphite-700">{description}</p>
      </div>
    </Modal>
  );
}
