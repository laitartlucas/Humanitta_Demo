import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

/** Caixa de seleção com rótulo clicável (alvo ≥ 40px). */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, error, id, className, disabled, type: _type, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? `cb-${autoId.replace(/:/g, '')}`;
  const descId = description ? `${fieldId}-desc` : undefined;
  const errId = error ? `${fieldId}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'group inline-flex min-h-10 items-start gap-3 py-2',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <span className="relative mt-px inline-flex h-5 w-5 shrink-0">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            disabled={disabled}
            aria-describedby={[descId, errId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? true : undefined}
            className={cn(
              'peer h-5 w-5 cursor-[inherit] appearance-none rounded-xs border bg-white transition-colors',
              error ? 'border-danger' : 'border-graphite-300 group-hover:border-gold-500',
              'checked:border-gold-600 checked:bg-gold-600 indeterminate:border-gold-600 indeterminate:bg-gold-600',
              'focus-visible:outline-none focus-visible:shadow-focus',
            )}
            {...rest}
          />
          <Check
            size={14}
            strokeWidth={3}
            aria-hidden="true"
            className="pointer-events-none absolute left-[3px] top-[3px] hidden text-white peer-checked:block"
          />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-semibold text-graphite-900">{label}</span>
          {description && (
            <span id={descId} className="text-body-sm text-graphite-500">
              {description}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p id={errId} className="pl-8 text-caption font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
