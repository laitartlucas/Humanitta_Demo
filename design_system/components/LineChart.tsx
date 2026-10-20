import { useState, type MouseEvent } from 'react';
import { cn } from '@ds/foundations/cn';
import { compactNumber } from './BarChart';
import { defaultFormat, niceMax, useElementWidth } from './internal';

export interface LineChartSeries {
  name: string;
  color: string;
  points: number[];
  dashed?: boolean;
}

export interface LineChartProps {
  labels: string[];
  series: LineChartSeries[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
  /** Formato do eixo Y (padrão compacto). */
  formatAxis?: (v: number) => string;
  /** Mostra a legenda (padrão: quando há mais de uma série). */
  showLegend?: boolean;
  className?: string;
}

const PAD = { left: 48, right: 12, top: 16, bottom: 28 };

/** Linhas em SVG com grade tracejada, legenda e tooltip ao passar o mouse. */
export function LineChart({
  labels,
  series,
  height = 240,
  formatValue = defaultFormat,
  ariaLabel,
  formatAxis = compactNumber,
  showLegend,
  className,
}: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.points);
  const max = niceMax(Math.max(0, ...all));
  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = Math.max(10, height - PAD.top - PAD.bottom);
  const n = Math.max(1, labels.length);
  const step = n > 1 ? plotW / (n - 1) : 0;
  const x = (i: number) => PAD.left + (n > 1 ? step * i : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
  const labelEvery = step > 0 && step < 36 ? Math.ceil(36 / step) : 1;
  const legend = showLegend ?? series.length > 1;

  function onMove(e: MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - rect.left;
    const i = n > 1 ? Math.round(rel / step) : 0;
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const desc = series
    .map((s) => `${s.name}: ${s.points.map((p, i) => `${labels[i] ?? i} ${formatValue(p)}`).join(', ')}`)
    .join('. ');

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <div ref={ref} className="relative w-full">
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible font-sans">
          <desc>{desc}</desc>
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
          {labels.map((l, i) =>
            i % labelEvery === 0 ? (
              <text key={`${l}-${i}`} x={x(i)} y={height - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#5B5852">
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="#C7C2B9" strokeDasharray="3 3" />
          )}
          {series.map((s) => {
            const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p)}`).join(' ');
            return (
              <g key={s.name}>
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '6 5' : undefined}
                />
                {s.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(p)}
                    r={hover === i ? 4.5 : n <= 12 ? 3 : 0}
                    fill="#FFFFFF"
                    stroke={s.color}
                    strokeWidth={2}
                  />
                ))}
              </g>
            );
          })}
          <rect
            x={PAD.left - step / 2}
            y={PAD.top}
            width={plotW + step}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 min-w-[140px] rounded-sm border border-graphite-200 bg-white px-3 py-2 shadow-md"
            style={{
              top: PAD.top,
              left: Math.min(Math.max(x(hover) + 12, 0), Math.max(0, width - 160)),
            }}
          >
            <p className="mb-1 text-caption font-bold text-graphite-500">{labels[hover]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-2 text-body-sm">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="mr-auto text-graphite-600">{s.name}</span>
                <span className="font-bold tabular-nums text-graphite-900">{formatValue(s.points[hover] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      {legend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.name} className="inline-flex items-center gap-2 text-caption text-graphite-600">
              <svg width="18" height="8" aria-hidden="true">
                <line x1="1" x2="17" y1="4" y2="4" stroke={s.color} strokeWidth="2.25" strokeLinecap="round" strokeDasharray={s.dashed ? '4 3' : undefined} />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
