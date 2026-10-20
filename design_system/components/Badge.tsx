import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export type BadgeTone = 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'violet';

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const BADGE_TONE: Record<BadgeTone, { cls: string; dot: string }> = {
  neutral: { cls: 'bg-graphite-100 text-graphite-600', dot: 'bg-graphite-600' },
  gold: { cls: 'bg-gold-50 text-gold-600 ring-1 ring-inset ring-gold-100', dot: 'bg-gold-500' },
  success: { cls: 'bg-success-bg text-success', dot: 'bg-success' },
  warning: { cls: 'bg-warning-bg text-warning', dot: 'bg-warning' },
  danger: { cls: 'bg-danger-bg text-danger', dot: 'bg-danger' },
  info: { cls: 'bg-info-bg text-info', dot: 'bg-info' },
  ai: { cls: 'bg-ai-bg text-ai', dot: 'bg-ai' },
  violet: { cls: 'bg-violet-bg text-violet', dot: 'bg-violet' },
};

/** Selo/chip informativo (não interativo). Altura 24 (md) ou 20 (sm), raio full. */
export function Badge({ tone = 'neutral', dot = false, icon: Icon, children, size = 'md', className }: BadgeProps) {
  const t = BADGE_TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-full font-bold leading-none',
        size === 'md' ? 'h-6 gap-1.5 px-2.5 text-[12px]' : 'h-5 gap-1 px-2 text-[11px]',
        t.cls,
        className,
      )}
    >
      {Icon ? (
        <Icon size={size === 'md' ? 13 : 12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      ) : (
        dot && <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
