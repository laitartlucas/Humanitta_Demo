import { useId } from 'react';
import { cn } from '@ds/foundations/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Esconde o rótulo visualmente (continua acessível). */
  hideLabel?: boolean;
  className?: string;
}

/** Interruptor liga/desliga (role="switch"). */
export function Switch({ checked, onChange, label, description, disabled = false, hideLabel = false, className }: SwitchProps) {
  const id = useId().replace(/:/g, '');
  const labelId = `sw-${id}-label`;
  const descId = description ? `sw-${id}-desc` : undefined;
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-50', className)}>
      {!hideLabel && (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={labelId} className="text-body font-semibold text-graphite-900">
            {label}
          </span>
          {description && (
            <span id={descId} className="text-body-sm text-graphite-500">
              {description}
            </span>
          )}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-label={hideLabel ? label : undefined}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'group relative inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-full',
          'focus-visible:outline-none disabled:cursor-not-allowed',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-150',
            'group-focus-visible:shadow-focus',
            checked
              ? 'border-gold-600 bg-gold-600 group-hover:bg-gold-700'
              : 'border-graphite-300 bg-graphite-200 group-hover:bg-graphite-300',
          )}
        >
          <span
            className={cn(
              'absolute left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-150',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </span>
      </button>
    </div>
  );
}
