import type { Specialty } from '@ds/mocks/types';
import { SPECIALTY_COLORS } from '@ds/foundations/tokens';
import { cn } from '@ds/foundations/cn';

export interface SpecialtyTagProps {
  specialty: Specialty;
  variant?: 'dot' | 'chip';
  className?: string;
}

export const SPECIALTY_LABEL: Record<Specialty, string> = {
  odontologia: 'Odontologia',
  fonoaudiologia: 'Fonoaudiologia',
  estetica: 'Estética Avançada',
  psicologia: 'Psicologia',
  quiropraxia: 'Quiropraxia',
  podologia: 'Podologia',
  fisioterapia: 'Fisioterapia',
  nutricao: 'Nutrição',
};

export const SPECIALTY_COLOR: Record<Specialty, string> = SPECIALTY_COLORS;

/**
 * Marcador de especialidade. A cor fica só no ponto; o texto é sempre grafite (contraste AA).
 */
export function SpecialtyTag({ specialty, variant = 'dot', className }: SpecialtyTagProps) {
  const dot = (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: SPECIALTY_COLOR[specialty] }}
    />
  );
  if (variant === 'chip') {
    return (
      <span
        className={cn(
          'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-graphite-200 bg-white px-2.5 text-[12px] font-bold text-graphite-700',
          className,
        )}
      >
        {dot}
        {SPECIALTY_LABEL[specialty]}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-graphite-600', className)}>
      {dot}
      {SPECIALTY_LABEL[specialty]}
    </span>
  );
}
