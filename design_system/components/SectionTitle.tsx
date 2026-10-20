import type { ReactNode } from 'react';
import { cn } from '@ds/foundations/cn';

export interface SectionTitleProps {
  overline?: string;
  title: string;
  action?: ReactNode;
  /** Nível do título (padrão h3). */
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/** Título de seção: overline opcional (caption uppercase) + título Manrope 700 + ação à direita. */
export function SectionTitle({ overline, title, action, as = 'h3', className }: SectionTitleProps) {
  const Heading = as;
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="mr-auto flex min-w-0 flex-col gap-1">
        {overline && <span className="text-overline uppercase text-gold-600">{overline}</span>}
        <Heading className="text-[18px] font-bold leading-6 text-graphite-900">{title}</Heading>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
