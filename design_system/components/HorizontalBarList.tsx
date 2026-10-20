import { cn } from '@ds/foundations/cn';
import { defaultFormat } from './internal';

export interface HorizontalBarListProps {
  data: { label: string; value: number; color: string }[];
  formatValue?: (v: number) => string;
  className?: string;
}

/**
 * Lista ranqueada com barras horizontais (ex.: consultas por especialidade).
 * O valor está sempre em texto; a barra é decorativa.
 */
export function HorizontalBarList({ data, formatValue = defaultFormat, className }: HorizontalBarListProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {data.map((d) => (
        <li key={d.label} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-body-sm">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="mr-auto truncate font-semibold text-graphite-800">{d.label}</span>
            <span className="font-bold tabular-nums text-graphite-900">{formatValue(d.value)}</span>
          </div>
          <div aria-hidden="true" className="h-1.5 rounded-full bg-graphite-50">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, backgroundColor: d.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
