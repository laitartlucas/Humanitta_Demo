import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export interface FieldLabelProps {
  htmlFor?: string;
  id?: string;
  required?: boolean;
  children: ReactNode;
}

/** Rótulo de campo (13px / 600, acima do controle). */
export function FieldLabel({ htmlFor, id, required, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} id={id} className="text-body-sm font-semibold text-graphite-800">
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
      {required && <span className="sr-only"> (obrigatório)</span>}
    </label>
  );
}

export interface FieldFeedbackProps {
  hintId?: string;
  errorId?: string;
  hint?: string;
  error?: string;
}

/** Texto de ajuda (graphite-500) ou erro (danger + ícone). */
export function FieldFeedback({ hintId, errorId, hint, error }: FieldFeedbackProps) {
  if (error) {
    return (
      <p id={errorId} className="flex items-start gap-1.5 text-caption font-semibold text-danger">
        <AlertCircle size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p id={hintId} className="text-caption font-medium text-graphite-500">
        {hint}
      </p>
    );
  }
  return null;
}

/** Ids auxiliares para aria-describedby. */
export function describedBy(id: string, hint?: string, error?: string, extra?: string): string | undefined {
  const ids = [error ? `${id}-error` : hint ? `${id}-hint` : undefined, extra].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

/**
 * Agrupador genérico: rótulo + controle + ajuda/erro.
 * Use com controles customizados; Input/Select/Textarea já embutem o próprio rótulo.
 */
export function FormField({ label, htmlFor, hint, error, required, children, className }: FormFieldProps) {
  const baseId = htmlFor ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      {children}
      <FieldFeedback hint={hint} error={error} hintId={`${baseId}-hint`} errorId={`${baseId}-error`} />
    </div>
  );
}
