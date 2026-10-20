import { cn } from '@ds/foundations/cn';

export interface SpinnerProps {
  /** Diâmetro em px (padrão 20). */
  size?: number;
  /** Texto para leitores de tela (padrão "Carregando"). */
  label?: string;
  className?: string;
  /** Quando true, não anuncia (uso dentro de botões que já têm aria-busy). */
  decorative?: boolean;
}

/** Anel dourado giratório. */
export function Spinner({ size = 20, label = 'Carregando', className, decorative = false }: SpinnerProps) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('animate-spin motion-reduce:animate-[spin_2s_linear_infinite]', className)}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
  if (decorative) return svg;
  return (
    <span role="status" className="inline-flex items-center text-gold-500">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
