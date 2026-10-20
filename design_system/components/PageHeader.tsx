import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
  /** Nível do título (padrão h2 — o h1 da página fica no Header do AppShell). */
  as?: 'h1' | 'h2';
  className?: string;
}

/** Cabeçalho de seção de página: breadcrumb, título display, subtítulo e ações à direita. */
export function PageHeader({ title, subtitle, actions, breadcrumb, as = 'h2', className }: PageHeaderProps) {
  const Heading = as;
  return (
    <div className={cn('flex flex-wrap items-end gap-4', className)}>
      <div className="mr-auto flex min-w-0 flex-col gap-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Trilha de navegação">
            <ol className="flex flex-wrap items-center gap-1 text-caption text-graphite-500">
              {breadcrumb.map((b, i) => (
                <li key={`${b}-${i}`} className="inline-flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />}
                  <span aria-current={i === breadcrumb.length - 1 ? 'page' : undefined}>{b}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <Heading className="font-display text-[30px] font-semibold leading-[36px] text-graphite-900 md:text-display-lg">
          {title}
        </Heading>
        {subtitle && <p className="text-body text-graphite-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
