import { cn } from '@ds/foundations/cn';

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  label?: string;
  tone?: 'gold' | 'success' | 'warning';
  /** Mostra o rótulo e a porcentagem acima da barra. */
  showValue?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const TONE = { gold: 'bg-gold-500', success: 'bg-success', warning: 'bg-warning' } as const;

/** Barra de progresso (role="progressbar"). */
export function ProgressBar({ value, label, tone = 'gold', showValue, size = 'md', className }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const visible = showValue ?? Boolean(label);
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {visible && (
        <div className="flex items-center justify-between gap-2 text-caption">
          {label && <span className="font-semibold text-graphite-600">{label}</span>}
          <span className="ml-auto font-bold tabular-nums text-graphite-800">{v}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progresso'}
        className={cn('w-full overflow-hidden rounded-full bg-graphite-100', size === 'md' ? 'h-2' : 'h-1.5')}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', TONE[tone])} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
