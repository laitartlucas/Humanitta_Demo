import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export type IconButtonVariant = 'ghost' | 'secondary' | 'dark';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Rótulo acessível obrigatório (vira aria-label). */
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
  /** Ponto de notificação (vermelho). */
  badge?: boolean;
  /** Estado selecionado/pressionado (aria-pressed). */
  selected?: boolean;
}

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: 'border border-transparent bg-transparent text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900 active:bg-graphite-100',
  secondary:
    'border border-graphite-200 bg-white text-graphite-700 hover:border-graphite-300 hover:bg-graphite-50 hover:text-graphite-900 active:bg-graphite-100',
  dark: 'border border-transparent bg-transparent text-sidebar-icon hover:bg-white/[.06] hover:text-sidebar-strong active:bg-white/10',
};

/** Botão só-ícone (40×40 md / 36×36 sm). Sempre com aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', badge = false, selected, type = 'button', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-sm transition-colors duration-150',
        size === 'md' ? 'h-10 w-10' : 'h-9 w-9',
        'focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-gold-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        selected && variant !== 'dark' && 'border-gold-300 bg-gold-50 text-gold-700',
        selected && variant === 'dark' && 'bg-gold-300/[.12] text-gold-100',
        className,
      )}
      {...rest}
    >
      <Icon size={size === 'md' ? 20 : 18} strokeWidth={1.75} aria-hidden="true" />
      {badge && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-[9px] top-2 h-2 w-2 rounded-full border-2 bg-danger',
            variant === 'dark' ? 'border-graphite-900' : 'border-white',
          )}
        />
      )}
    </button>
  );
});
