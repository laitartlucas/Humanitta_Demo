import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@ds/foundations/cn';
import { FieldFeedback, FieldLabel, describedBy } from './FormField';
import { controlBase, controlState } from './Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

/** Área de texto multilinha (mín. 96px), mesmo visual do Input. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, wrapperClassName, required, rows = 4, 'aria-describedby': ariaDescribedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? `ta-${autoId.replace(/:/g, '')}`;
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error, ariaDescribedBy)}
        className={cn(controlBase, controlState(error), 'min-h-24 resize-y px-3 py-2.5 leading-[22px]', className)}
        {...rest}
      />
      <FieldFeedback hint={hint} error={error} hintId={`${fieldId}-hint`} errorId={`${fieldId}-error`} />
    </div>
  );
});
