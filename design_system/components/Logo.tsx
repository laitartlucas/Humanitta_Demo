import { useId } from 'react';
import { cn } from '@ds/foundations/cn';

export interface LogoProps {
  /** full = símbolo + wordmark; mark = só o símbolo. */
  variant?: 'full' | 'mark';
  /** light = para fundos claros; dark = para a sidebar/fundos escuros. */
  tone?: 'light' | 'dark';
  /** Tamanho do símbolo em px (padrão 40). */
  size?: number;
  /** Linha abaixo do wordmark (padrão "Gestão"; use "Saúde Integral" em contextos institucionais). */
  subtitle?: string;
  className?: string;
}

/** Símbolo Humanittá: anel fino dourado + duas figuras (pequena à esquerda, maior à direita). */
export function LogoMark({
  size = 40,
  title = 'Humanittá',
  decorative = false,
}: {
  size?: number;
  title?: string;
  decorative?: boolean;
}) {
  const gid = `hm-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DDB872" />
          <stop offset=".55" stopColor="#CC9B47" />
          <stop offset="1" stopColor="#B5832F" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="none" stroke="#CC9B47" strokeWidth="2" />
      <circle cx="24" cy="31" r="3.6" fill={`url(#${gid})`} />
      <path d="M20 39.5c0-2.6 1.8-4.3 4-4.3s4 1.7 4 4.3V47c-4.4 0-8-3.2-8-7.5z" fill={`url(#${gid})`} />
      <circle cx="38.5" cy="19.5" r="4.6" fill={`url(#${gid})`} />
      <path d="M31.5 31c0-3.3 2.7-5.6 6-5.6h6.5V40c0 4.6-3.7 8-8.3 8h-4.2z" fill={`url(#${gid})`} />
    </svg>
  );
}

/** Logo completo: símbolo + "Humanittá" (Josefin Sans 300, espaçado) + overline dourado. */
export function Logo({ variant = 'full', tone = 'light', size = 40, subtitle = 'Gestão', className }: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={cn('inline-flex', className)}>
        <LogoMark size={size} title={`Humanittá ${subtitle}`} />
      </span>
    );
  }
  const wordSize = Math.round(size * 0.55);
  const subSize = Math.max(9, Math.round(size * 0.25));
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark size={size} decorative />
      <span className="flex flex-col gap-0.5">
        <span
          className={cn('font-brand font-light leading-none tracking-[.08em]', tone === 'dark' ? 'text-sidebar-strong' : 'text-graphite-500')}
          style={{ fontSize: wordSize }}
        >
          Humanittá
        </span>
        <span
          className={cn('font-sans font-bold uppercase leading-none tracking-[.24em]', tone === 'dark' ? 'text-gold-300' : 'text-gold-600')}
          style={{ fontSize: subSize }}
        >
          {subtitle}
        </span>
      </span>
    </span>
  );
}
