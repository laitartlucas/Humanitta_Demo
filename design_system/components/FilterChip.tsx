import { Check, X } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Quando presente, mostra botão "remover filtro" (x). */
  onRemove?: () => void;
  count?: number;
  disabled?: boolean;
  className?: string;
}

/** Chip de filtro alternável (aria-pressed), com contador e remoção opcionais. */
export function FilterChip({ label, active = false, onClick, onRemove, count, disabled, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-full border text-[13px] font-bold transition-colors',
        active
          ? 'border-gold-300 bg-gold-50 text-gold-700'
          : 'border-graphite-200 bg-white text-graphite-700 hover:border-graphite-300 hover:bg-graphite-50',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex h-full items-center gap-1.5 rounded-full pl-3 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed',
          onRemove ? 'pr-1.5' : 'pr-3',
        )}
      >
        {active && <Check size={14} strokeWidth={2.25} aria-hidden="true" />}
        {label}
        {count !== undefined && (
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums',
              active ? 'bg-gold-100 text-gold-700' : 'bg-graphite-100 text-graphite-600',
            )}
          >
            {count}
          </span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remover filtro ${label}`}
          className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-graphite-900/[.06] focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed"
        >
          <X size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
