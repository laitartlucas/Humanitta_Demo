import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { FieldFeedback, FieldLabel, describedBy } from './FormField';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightSlot?: ReactNode;
  /** Classe aplicada ao wrapper externo (label + campo). */
  wrapperClassName?: string;
}

/** Classes compartilhadas por Input / Select / Textarea. */
export const controlBase =
  'w-full rounded-sm border bg-white font-sans text-body font-medium text-graphite-900 placeholder:font-normal placeholder:text-graphite-400 transition-[border-color,box-shadow] duration-150 hover:border-graphite-300 focus:outline-none disabled:cursor-not-allowed disabled:bg-graphite-50 disabled:opacity-60 read-only:bg-graphite-50';

export function controlState(error?: string): string {
  return error
    ? 'border-danger hover:border-danger focus:border-danger focus:shadow-focus-danger'
    : 'border-graphite-200 focus:border-gold-500 focus:shadow-focus';
}

/** Campo de texto de 40px com rótulo, ajuda, erro, ícone à esquerda e slot à direita. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon: LeftIcon, rightSlot, id, className, wrapperClassName, required, 'aria-describedby': ariaDescribedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `in-${autoId.replace(/:/g, '')}`;
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error, ariaDescribedBy)}
          className={cn(
            controlBase,
            controlState(error),
            'h-10 px-3',
            LeftIcon && 'pl-10',
            rightSlot ? 'pr-11' : undefined,
            className,
          )}
          {...rest}
        />
        {rightSlot && <div className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</div>}
      </div>
      <FieldFeedback hint={hint} error={error} hintId={`${inputId}-hint`} errorId={`${inputId}-error`} />
    </div>
  );
});
