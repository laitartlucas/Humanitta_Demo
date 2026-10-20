import { cn } from '@ds/foundations/cn';
import { defaultFormat, niceMax, useElementWidth } from './internal';

export interface BarChartDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface BarChartProps {
  data: BarChartDatum[];
  formatValue?: (v: number) => string;
  /** Formato dos rótulos do eixo Y (padrão compacto: "40 mil"). */
  formatAxis?: (v: number) => string;
  height?: number;
  ariaLabel: string;
  className?: string;
}

export function compactNumber(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString('pt-BR');
}

const PAD = { left: 48, right: 4, top: 24, bottom: 28 };

/** Barras verticais em SVG. Barra em destaque = gold-500; demais = gold-200. */
export function BarChart({
  data,
  formatValue = defaultFormat,
  formatAxis = compactNumber,
  height = 240,
  ariaLabel,
  className,
}: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = Math.max(10, height - PAD.top - PAD.bottom);
  const n = Math.max(1, data.length);
  const slot = plotW / n;
  const barW = Math.min(56, slot * 0.62);
  const ticks = [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
  const showValues = slot >= 46;
  const labelEvery = slot < 28 ? Math.ceil(28 / slot) : 1;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible font-sans">
        <desc>{data.map((d) => `${d.label}: ${formatValue(d.value)}`).join('; ')}</desc>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? '#DFDBD3' : '#ECE9E3'}
              strokeDasharray={t === 0 ? undefined : '4 4'}
            />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#77736B">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const top = y(Math.max(0, d.value));
          const h = Math.max(0, PAD.top + plotH - top);
          const r = Math.min(6, barW / 2, h);
          const x0 = cx - barW / 2;
          const base = PAD.top + plotH;
          const path = `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${base} Z`;
          return (
            <g key={`${d.label}-${i}`}>
              <path d={path} fill={d.highlight ? '#B5832F' : '#EBD4A6'} />
              {(showValues || d.highlight) && (
                <text
                  x={cx}
                  y={top - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={d.highlight ? '#6F4D1D' : '#5B5852'}
                >
                  {formatValue(d.value)}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#5B5852">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
