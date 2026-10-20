import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@ds/mocks/business';

export interface SummaryTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  /** Linha auxiliar (ex.: quantidade de lançamentos). */
  caption?: string;
  /** Destaca o número em vermelho (ex.: valores vencidos). */
  danger?: boolean;
}

export function SummaryTile({ icon: Icon, label, value, caption, danger = false }: SummaryTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[12px] font-semibold text-graphite-500">{label}</span>
        <span className={`text-[18px] font-bold tabular-nums ${danger && value > 0 ? 'text-danger' : 'text-graphite-900'}`}>{formatCurrency(value)}</span>
        {caption && <span className="truncate text-[12px] text-graphite-500">{caption}</span>}
      </div>
    </div>
  );
}
