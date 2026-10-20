import { cn } from '@ds/foundations/cn';

export interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  /** Diâmetro em px (padrão 180). */
  size?: number;
  /** Mostra a legenda ao lado (padrão true). */
  showLegend?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

/** Rosca em SVG com valor central (Cormorant) e legenda com valores e %. */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 180,
  showLegend = true,
  formatValue = (v) => v.toLocaleString('pt-BR'),
  className,
}: DonutChartProps) {
  const stroke = Math.max(14, Math.round(size * 0.12));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const gap = data.filter((d) => d.value > 0).length > 1 ? 2 : 0;
  let acc = 0;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const aria = `${centerLabel}: ${centerValue}. ${data.map((d) => `${d.label} ${formatValue(d.value)} (${pct(d.value)}%)`).join('; ')}`;

  return (
    <div className={cn('flex flex-wrap items-center gap-6', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={aria}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5F3EF" strokeWidth={stroke} />
          {total > 0 &&
            data.map((d) => {
              const len = (Math.max(0, d.value) / total) * c;
              const dash = Math.max(0, len - gap);
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-acc}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              acc += len;
              return el;
            })}
        </svg>
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="max-w-[72%] text-center font-display font-semibold leading-none text-graphite-900"
            style={{ fontSize: Math.max(16, Math.min(28, ((size - stroke * 2) * 0.72) / Math.max(4, centerValue.length) * 1.7)) }}
          >
            {centerValue}
          </span>
          <span className="mt-1 max-w-[70%] text-caption text-graphite-500">{centerLabel}</span>
        </div>
      </div>
      {showLegend && (
        <ul className="flex min-w-[160px] flex-1 flex-col gap-2" aria-hidden="true">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-body-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="mr-auto truncate font-semibold text-graphite-700">{d.label}</span>
              <span className="font-bold tabular-nums text-graphite-900">{formatValue(d.value)}</span>
              <span className="w-10 text-right tabular-nums text-graphite-500">{pct(d.value)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
