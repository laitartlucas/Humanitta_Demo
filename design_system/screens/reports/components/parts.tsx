import type { ReactNode } from 'react';
import { BarChart3, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DataTable, EmptyState, HorizontalBarList, KpiCard, SpecialtyTag } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { formatCurrency } from '@ds/mocks/business';
import {
  HEATMAP_HOURS_COUNT,
  HEATMAP_START_HOUR,
  type DistributionRow,
  type ProfessionalRow,
} from '../model';

export const INT = new Intl.NumberFormat('pt-BR');
const PERCENT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

/** Percentual de uma razão 0..1; "—" quando não há base para o cálculo. */
export function fmtRatio(v: number | null): string {
  return v === null ? '—' : PERCENT.format(v);
}

/** Cores dos gráficos — mesmas da tela original (dourado 500 e grafite 400). */
export const CHART_GOLD = '#B5832F';
export const CHART_GRAPHITE = '#9E998F';
export const CHART_SUCCESS = '#2E7351';
export const CHART_DANGER = '#A93B30';
export const CHART_WARNING = '#9A5F0E';
export const CHART_INFO = '#2D5F88';

export interface KpiProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: 'gold' | 'warning' | 'success' | 'ai';
  /** Variação percentual vs. período anterior; null = sem base; undefined = não comparar. */
  deltaPct?: number | null;
  /** Quando cair é bom (faltas, cancelamentos, despesas). */
  invert?: boolean;
  loading?: boolean;
  footer?: ReactNode;
}

/** KpiCard com comparação de períodos já formatada (e tratamento de "sem base"). */
export function Kpi({ label, value, icon, tone, deltaPct, invert = false, loading, footer }: KpiProps) {
  const hasDelta = typeof deltaPct === 'number';
  return (
    <KpiCard
      label={label}
      value={value}
      icon={icon}
      tone={tone}
      loading={loading}
      invertDelta={invert}
      delta={
        hasDelta
          ? {
              value: `${deltaPct > 0 ? '+' : ''}${deltaPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
              trend: deltaPct >= 0 ? 'up' : 'down',
              caption: 'vs. período anterior',
            }
          : undefined
      }
      footer={
        footer ??
        (deltaPct === null ? <span className="text-[12px] text-graphite-500">Sem base no período anterior</span> : undefined)
      }
    />
  );
}

/** Estado vazio compacto para dentro de cards de gráfico. */
export function ChartEmpty({ title = 'Sem dados no período', description = 'Ajuste o período ou os filtros para ver este indicador.' }: { title?: string; description?: string }) {
  return <EmptyState compact icon={BarChart3} title={title} description={description} />;
}

/** Observação discreta (escopo, LGPD, filtros que não se aplicam). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-[12px] text-graphite-500', className)}>
      <Info size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Distribution({
  rows,
  format = (v: number) => INT.format(v),
  limit = 8,
}: {
  rows: DistributionRow[];
  format?: (v: number) => string;
  limit?: number;
}) {
  if (rows.length === 0) return <ChartEmpty />;
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((t, r) => t + r.value, 0);
  const data = shown.map((r) => ({ label: r.label, value: r.value, color: r.color ?? CHART_GOLD }));
  if (rest > 0) data.push({ label: `Outros (${rows.length - limit})`, value: rest, color: CHART_GRAPHITE });
  return <HorizontalBarList data={data} formatValue={format} />;
}

/* ------------------------------ Mapa de calor ------------------------------ */

const HEAT_LEVELS = ['bg-graphite-50', 'bg-gold-50', 'bg-gold-100', 'bg-gold-200', 'bg-gold-300', 'bg-gold-500'];
const HEAT_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HEAT_HOURS = Array.from({ length: HEATMAP_HOURS_COUNT }, (_, i) => `${String(HEATMAP_START_HOUR + i).padStart(2, '0')}h`);

function heatClass(v: number, max: number): string {
  if (v === 0 || max === 0) return HEAT_LEVELS[0];
  const idx = Math.min(HEAT_LEVELS.length - 1, Math.max(1, Math.ceil((v / max) * (HEAT_LEVELS.length - 1))));
  return HEAT_LEVELS[idx];
}

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat());
  let peak: { d: number; h: number; v: number } | null = null;
  grid.forEach((row, d) =>
    row.forEach((v, h) => {
      if (v > 0 && (!peak || v > peak.v)) peak = { d, h, v };
    }),
  );
  const peakInfo = peak as { d: number; h: number; v: number } | null;
  if (max === 0) return <ChartEmpty description="Nenhuma consulta agendada entre segunda e sábado, das 08h às 18h, no período." />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1">
          <caption className="sr-only">Mapa de calor de consultas por dia da semana e hora</caption>
          <thead>
            <tr>
              <th scope="col" className="w-12" />
              {HEAT_HOURS.map((h) => (
                <th key={h} scope="col" className="text-center text-[11px] font-semibold text-graphite-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, di) => (
              <tr key={HEAT_DAYS[di]}>
                <th scope="row" className="pr-2 text-left text-[12px] font-semibold text-graphite-600">
                  {HEAT_DAYS[di]}
                </th>
                {row.map((v, hi) => (
                  <td key={hi} className="p-0">
                    <div
                      className={cn(
                        'flex h-10 items-center justify-center rounded-xs text-[12px] font-semibold tabular-nums',
                        heatClass(v, max),
                        v / max > 0.8 ? 'text-white' : 'text-graphite-700',
                      )}
                      title={`${HEAT_DAYS[di]} ${HEAT_HOURS[hi]}: ${v} ${v === 1 ? 'consulta' : 'consultas'}`}
                    >
                      {v > 0 ? v : <span className="text-graphite-300" aria-label="sem consultas">–</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-graphite-500" aria-hidden="true">
        <span>Menos</span>
        {HEAT_LEVELS.map((c) => (
          <span key={c} className={cn('h-3 w-6 rounded-xs border border-graphite-200', c)} />
        ))}
        <span>Mais</span>
        {peakInfo && (
          <span className="ml-auto">
            Pico: {HEAT_DAYS[peakInfo.d].toLowerCase()}, {HEAT_HOURS[peakInfo.h]} ({peakInfo.v} {peakInfo.v === 1 ? 'consulta' : 'consultas'})
          </span>
        )}
      </div>
    </>
  );
}

/* ------------------------- Produtividade (tabela) ------------------------- */

export function ProductivityTable({ rows, showRevenue, loading }: { rows: ProfessionalRow[]; showRevenue: boolean; loading?: boolean }) {
  return (
    <DataTable<ProfessionalRow>
      caption="Produtividade por profissional no período"
      rowKey={(r) => r.id}
      rows={rows}
      loading={loading}
      empty={<ChartEmpty title="Nenhum profissional no filtro" description="Ajuste os filtros de profissional ou especialidade." />}
      columns={[
        {
          key: 'name',
          header: 'Profissional',
          render: (r) => (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 font-semibold text-graphite-900">
                {r.name}
                {r.isDemo && (
                  <span className="rounded-full bg-graphite-100 px-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-graphite-500">Demo</span>
                )}
                {!r.active && (
                  <span className="rounded-full bg-warning-bg px-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-warning">Inativo</span>
                )}
              </span>
              <SpecialtyTag specialty={r.specialty} variant="dot" />
            </div>
          ),
        },
        { key: 'appointments', header: 'Consultas', align: 'right', render: (r) => <span className="tabular-nums">{INT.format(r.appointments)}</span> },
        { key: 'done', header: 'Realizadas', align: 'right', hideBelow: 'md', render: (r) => <span className="tabular-nums">{INT.format(r.done)}</span> },
        ...(showRevenue
          ? [
              {
                key: 'revenue',
                header: 'Faturamento',
                align: 'right' as const,
                hideBelow: 'md' as const,
                render: (r: ProfessionalRow) => <span className="tabular-nums">{formatCurrency(r.revenue ?? 0)}</span>,
              },
            ]
          : []),
        {
          key: 'occupancy',
          header: 'Ocupação',
          hideBelow: 'md',
          render: (r) =>
            r.occupancy === null ? (
              <span className="text-[12px] text-graphite-500">Sem expediente no período</span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-graphite-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, r.occupancy * 100)}%` }} />
                </div>
                <span className="tabular-nums text-graphite-700">{fmtRatio(r.occupancy)}</span>
              </div>
            ),
        },
        { key: 'noshow', header: 'Faltas', align: 'right', hideBelow: 'lg', render: (r) => <span className="tabular-nums">{fmtRatio(r.noShowRate)}</span> },
      ]}
    />
  );
}
