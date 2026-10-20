import type { LucideIcon } from 'lucide-react';
import { CalendarOff } from 'lucide-react';
import { Button, Tooltip } from '@ds/components';
import type { ButtonSize, ButtonVariant } from '@ds/components';
import { cn } from '@ds/foundations/cn';

export interface RequestChangeButtonProps {
  /** Permissão 'solicitar' ativa para o perfil (UI). */
  enabled: boolean;
  onClick: () => void;
  label?: string;
  icon?: LucideIcon;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  /** Explicação exibida quando desabilitado. */
  disabledReason?: string;
}

export const REQUEST_DISABLED_REASON =
  'A administração desativou as solicitações de bloqueio para o seu perfil. Fale com a recepção para ajustar sua agenda.';

/**
 * Botão "Solicitar bloqueio/alteração". Quando a permissão está desativada, continua focável
 * (aria-disabled) para que o Tooltip com a explicação seja alcançável por teclado.
 */
export function RequestChangeButton({
  enabled,
  onClick,
  label = 'Solicitar bloqueio',
  icon = CalendarOff,
  variant = 'secondary',
  size = 'md',
  fullWidth,
  className,
  disabledReason = REQUEST_DISABLED_REASON,
}: RequestChangeButtonProps) {
  if (enabled) {
    return (
      <Button variant={variant} size={size} leftIcon={icon} onClick={onClick} fullWidth={fullWidth} className={className}>
        {label}
      </Button>
    );
  }
  return (
    <Tooltip content={disabledReason}>
      <Button
        variant={variant}
        size={size}
        leftIcon={icon}
        aria-disabled="true"
        fullWidth={fullWidth}
        onClick={(e) => e.preventDefault()}
        className={cn('cursor-not-allowed opacity-50', className)}
      >
        {label}
      </Button>
    </Tooltip>
  );
}
