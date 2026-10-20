import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { ProgressBar } from './ProgressBar';

export interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: 'gold' | 'warning' | 'success' | 'ai';
  delta?: { value: string; trend: 'up' | 'down'; caption?: string };
  /** 0–100: mostra barra de progresso abaixo do número. */
  progress?: number;
  footer?: ReactNode;
  /** Texto curto à direita do rótulo quando não há ícone (ex.: "7 salas"). */
  meta?: string;
  /** Quando a queda é boa (ex.: faltas), inverte a cor do delta. */
  invertDelta?: boolean;
  loading?: boolean;
  className?: string;
}

const TONE = {
  gold: 'bg-gold-50 text-gold-600',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-success-bg text-success',
  ai: 'bg-ai-bg text-ai',
} as const;

/** Indicador: overline, número Cormorant, delta com tendência ou progresso. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'gold',
  delta,
  progress,
  footer,
  meta,
  invertDelta = false,
  loading = false,
  className,
}: KpiCardProps) {
  const positive = delta ? (delta.trend === 'up') !== invertDelta : true;
  const TrendIcon = delta?.trend === 'down' ? TrendingDown : TrendingUp;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-md border border-graphite-200 bg-white p-5 shadow-sm',
        className,
      )}
      aria-busy={loading || undefined}
    >
      <div className="flex min-h-9 items-center justify-between gap-3">
        <span className="text-overline uppercase text-graphite-500">{label}</span>
        {Icon ? (
          <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm', TONE[tone])}>
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : (
          meta && <span className="text-caption font-bold text-graphite-600">{meta}</span>
        )}
      </div>
      {loading ? (
        <span aria-hidden="true" className="hm-shimmer block h-[34px] w-28 rounded-xs" />
      ) : (
        <span className="font-display text-kpi tabular-nums text-graphite-900 xl:text-[40px]">{value}</span>
      )}
      {progress !== undefined && <ProgressBar value={progress} label={`${label}: ${Math.round(progress)}%`} showValue={false} />}
      {delta && (
        <span className="inline-flex flex-wrap items-center gap-1.5 text-caption text-graphite-600">
          <span className={cn('inline-flex items-center gap-0.5 font-bold', positive ? 'text-success' : 'text-danger')}>
            <TrendIcon size={14} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">{delta.trend === 'up' ? 'Alta de' : 'Queda de'}</span>
            {delta.value}
          </span>
          {delta.caption && <span>{delta.caption}</span>}
        </span>
      )}
      {footer && <div className="text-caption">{footer}</div>}
    </div>
  );
}
