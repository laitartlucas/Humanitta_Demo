import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-gold-600 text-white shadow-sm hover:bg-gold-700 active:bg-gold-800 focus-visible:border-gold-500',
  secondary:
    'border border-graphite-200 bg-white text-graphite-800 shadow-sm hover:border-graphite-300 hover:bg-graphite-50 active:bg-graphite-100 focus-visible:border-gold-500',
  ghost:
    'border border-transparent bg-transparent text-graphite-700 hover:bg-graphite-50 hover:text-graphite-900 active:bg-graphite-100',
  danger:
    'border border-transparent bg-danger text-white shadow-sm hover:bg-danger-hover active:bg-danger-hover focus-visible:shadow-focus-danger',
  link: 'border border-transparent bg-transparent text-gold-600 underline-offset-4 hover:text-gold-700 hover:underline',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-body-sm gap-1.5',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
};
const LINK_SIZE: Record<ButtonSize, string> = {
  sm: 'text-body-sm gap-1',
  md: 'text-body gap-1.5',
  lg: 'text-[15px] gap-1.5',
};
const ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

/** Botão de ação. Variantes primary/secondary/ghost/danger/link; tamanhos sm 36, md 40, lg 48. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    fullWidth = false,
    disabled,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  const iconSize = ICON[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-sm font-sans font-bold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'link' ? cn('h-auto rounded-xs px-0.5', LINK_SIZE[size]) : SIZE[size],
        VARIANT[variant],
        fullWidth && 'w-full',
        loading && 'cursor-progress disabled:cursor-progress',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size={iconSize - 2} decorative className="text-current" />
      ) : (
        LeftIcon && <LeftIcon size={iconSize} strokeWidth={variant === 'primary' ? 2 : 1.75} aria-hidden="true" />
      )}
      {children}
      {RightIcon && !loading && <RightIcon size={iconSize} strokeWidth={1.75} aria-hidden="true" />}
      {loading && <span className="sr-only">Carregando</span>}
    </button>
  );
});
