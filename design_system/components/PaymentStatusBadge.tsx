import { AlertTriangle, CheckCircle2, Clock, Undo2, type LucideIcon } from 'lucide-react';
import type { PaymentStatus } from '@ds/mocks/types';
import { Badge, type BadgeTone } from './Badge';

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  estornado: 'Estornado',
};

const TONE: Record<PaymentStatus, BadgeTone> = {
  pago: 'success',
  pendente: 'warning',
  atrasado: 'danger',
  estornado: 'neutral',
};

const ICON: Record<PaymentStatus, LucideIcon> = {
  pago: CheckCircle2,
  pendente: Clock,
  atrasado: AlertTriangle,
  estornado: Undo2,
};

/** Status de pagamento — ícone + texto + cor. */
export function PaymentStatusBadge({ status, size = 'md', className }: PaymentStatusBadgeProps) {
  return (
    <Badge tone={TONE[status]} icon={ICON[status]} size={size} className={className}>
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
