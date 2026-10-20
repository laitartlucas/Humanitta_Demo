import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  /** Versão compacta para dentro de cards/tabelas. */
  compact?: boolean;
}

/** Estado vazio: anel dourado fino + ícone, título Cormorant 22, texto e CTA. */
export function EmptyState({ icon: Icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-3 px-4 py-8' : 'gap-4 px-6 py-14',
        className,
      )}
    >
      <span aria-hidden="true" className="relative inline-flex h-[76px] w-[76px] items-center justify-center">
        <svg width="76" height="76" viewBox="0 0 76 76" className="absolute inset-0">
          <circle cx="38" cy="38" r="36" fill="#FBF6EC" stroke="#DDB872" strokeWidth="1.5" />
          <path d="M38 2a36 36 0 0 1 36 36" fill="none" stroke="#B5832F" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <Icon size={28} strokeWidth={1.5} className="relative text-gold-600" />
      </span>
      <div className="flex max-w-[420px] flex-col gap-1.5">
        <h3 className="font-display text-[22px] font-semibold leading-7 text-graphite-900">{title}</h3>
        <p className="text-body text-graphite-500">{description}</p>
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
