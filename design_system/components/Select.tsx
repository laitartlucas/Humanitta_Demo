import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { FieldFeedback, FieldLabel, describedBy } from './FormField';
import { controlBase, controlState } from './Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
  /** Tamanho do controle: md 40px (padrão) ou sm 36px (filtros). */
  controlSize?: 'sm' | 'md';
}

/** Select nativo estilizado (acessível por teclado e leitores de tela). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    options,
    placeholder,
    id,
    className,
    wrapperClassName,
    required,
    controlSize = 'md',
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? `sel-${autoId.replace(/:/g, '')}`;
  const isControlled = rest.value !== undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error, ariaDescribedBy)}
          defaultValue={!isControlled && rest.defaultValue === undefined && placeholder ? '' : undefined}
          className={cn(
            controlBase,
            controlState(error),
            'cursor-pointer appearance-none pl-3 pr-10',
            controlSize === 'md' ? 'h-10' : 'h-9 text-body-sm',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-graphite-500"
        />
      </div>
      <FieldFeedback hint={hint} error={error} hintId={`${fieldId}-hint`} errorId={`${fieldId}-error`} />
    </div>
  );
});
