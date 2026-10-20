import {
  Activity,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  RefreshCw,
  UserX,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AppointmentStatus } from '@ds/mocks/types';
import { Badge, type BadgeTone } from './Badge';

export interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  em_atendimento: 'Em atendimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  faltou: 'Faltou',
  reagendada: 'Reagendada',
};

export const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  agendada: 'info',
  confirmada: 'success',
  em_atendimento: 'gold',
  concluida: 'neutral',
  cancelada: 'danger',
  faltou: 'warning',
  reagendada: 'violet',
};

export const STATUS_ICON: Record<AppointmentStatus, LucideIcon> = {
  agendada: CalendarClock,
  confirmada: CheckCircle2,
  em_atendimento: Activity,
  concluida: CheckCheck,
  cancelada: XCircle,
  faltou: UserX,
  reagendada: RefreshCw,
};

/** Status de consulta — sempre ícone + texto + cor. */
export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONE[status]} icon={STATUS_ICON[status]} size={size} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
