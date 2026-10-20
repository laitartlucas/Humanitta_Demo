import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@ds/foundations/cn';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: 'none' | 'md' | 'lg';
  /** Elemento semântico do contêiner (padrão div). */
  as?: 'div' | 'section' | 'article';
}

const PAD = { none: '', md: 'p-5', lg: 'p-6' } as const;

/** Superfície branca: borda graphite-200, raio 12, sombra sm. */
export function Card({ title, description, action, padding = 'lg', as = 'div', className, children, ...rest }: CardProps) {
  const Tag = as;
  const hasHeader = Boolean(title || description || action);
  return (
    <Tag
      className={cn(
        'flex min-w-0 flex-col rounded-md border border-graphite-200 bg-white shadow-sm',
        PAD[padding],
        padding !== 'none' && 'gap-5',
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <div className={cn('flex flex-wrap items-start gap-3', padding === 'none' && 'px-6 pb-4 pt-5')}>
          <div className="mr-auto flex min-w-0 flex-col gap-0.5">
            {title && <h3 className="text-[15px] font-bold leading-6 text-graphite-900">{title}</h3>}
            {description && <p className="text-body-sm text-graphite-500">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
