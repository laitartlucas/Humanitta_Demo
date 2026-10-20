import { useMemo, useState } from 'react';
import { CalendarCheck, FileSpreadsheet, FileText, Percent, TrendingUp, UserX, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  DataTable,
  FilterChip,
  KpiCard,
  LineChart,
  SegmentedControl,
  Select,
  SPECIALTY_LABEL,
  SpecialtyTag,
  useToast,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import {
  appointmentsBySpecialty,
  formatCurrency,
  formatDateBR,
  HEATMAP_DAYS,
  HEATMAP_HOURS,
  monthlyAppointments,
  peakHeatmap,
  professionalProductivity,
  reportKpis,
  reportLibrary,
  reportMonths,
} from '@ds/mocks/business';
import type { ProfessionalProductivity, ReportDefinition } from '@ds/mocks/business';

type Period = 'mes' | 'trimestre' | 'semestre' | 'ano';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'mes', label: 'Mês' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Ano' },
];

const PERIOD_CAPTION: Record<Period, string> = {
  mes: 'Outubro de 2026 vs. setembro de 2026',
  trimestre: 'Ago–out/2026 vs. mai–jul/2026',
  semestre: 'Mai–out/2026 vs. nov/2025–abr/2026',
  ano: 'Jan–out/2026 vs. jan–out/2025',
};

/** Fator multiplicador fictício para simular agregação por período. */
const PERIOD_FACTOR: Record<Period, number> = { mes: 1, trimestre: 2.94, semestre: 5.71, ano: 9.12 };

const KPI_ICON: Record<string, LucideIcon> = {
  consultas: CalendarCheck,
  faturamento: Wallet,
  ocupacao: Percent,
  noshow: UserX,
};

const KPI_TONE: Record<string, 'gold' | 'success' | 'warning' | 'ai'> = {
  consultas: 'gold',
  faturamento: 'success',
  ocupacao: 'ai',
  noshow: 'warning',
};

const PERCENT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const INT = new Intl.NumberFormat('pt-BR');

function isPeriod(v: string): v is Period {
  return v === 'mes' || v === 'trimestre' || v === 'semestre' || v === 'ano';
}

type ReportCategory = ReportDefinition['category'] | 'Todos';
const CATEGORIES: ReportCategory[] = ['Todos', 'Atendimento', 'Financeiro', 'Pacientes', 'Comunicação'];

const HEAT_LEVELS = ['bg-graphite-50', 'bg-gold-50', 'bg-gold-100', 'bg-gold-200', 'bg-gold-300', 'bg-gold-500'];

function heatClass(v: number, max: number): string {
  if (v === 0) return HEAT_LEVELS[0];
  const idx = Math.min(HEAT_LEVELS.length - 1, Math.max(1, Math.ceil((v / max) * (HEAT_LEVELS.length - 1))));
  return HEAT_LEVELS[idx];
}

export function ReportsScreen() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('mes');
  const [professional, setProfessional] = useState('todos');
  const [category, setCategory] = useState<ReportCategory>('Todos');

  const factor = PERIOD_FACTOR[period];

  const kpis = useMemo(
    () =>
      reportKpis.map((k) => {
        const scale = k.format === 'percent' ? 1 : factor;
        const current = k.current * scale;
        const previous = k.previous * scale;
        const deltaPct = ((current - previous) / previous) * 100;
        const value =
          k.format === 'currency' ? formatCurrency(current) : k.format === 'percent' ? PERCENT.format(current) : INT.format(Math.round(current));
        // Para no-show, queda é positiva — mostramos a tendência real mas a legenda explica.
        return { ...k, value, deltaPct };
      }),
    [factor],
  );

  const heatMax = Math.max(...peakHeatmap.flat());

  const productivity = useMemo(
    () =>
      (professional === 'todos' ? professionalProductivity : professionalProductivity.filter((p) => p.id === professional)).map((p) => ({
        ...p,
        appointments: Math.round(p.appointments * factor),
        revenue: p.revenue * factor,
      })),
    [professional, factor],
  );

  const exportFile = (title: string, format: 'PDF' | 'CSV') =>
    toast({
      tone: 'success',
      title: `Exportação ${format} simulada`,
      description: `"${title}" — na versão final o arquivo seria baixado.`,
    });

  const library = category === 'Todos' ? reportLibrary : reportLibrary.filter((r) => r.category === category);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-graphite-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-graphite-800">Período</span>
          <SegmentedControl
            ariaLabel="Período do relatório"
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(v) => {
              if (isPeriod(v)) setPeriod(v);
            }}
          />
          <span className="text-[12px] text-graphite-500">{PERIOD_CAPTION[period]}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-64">
            <Select
              label="Profissional"
              value={professional}
              onChange={(e) => setProfessional(e.target.value)}
              options={[{ value: 'todos', label: 'Todos os profissionais' }, ...professionalProductivity.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </div>
          <Button variant="secondary" leftIcon={FileText} onClick={() => exportFile('Resumo do período', 'PDF')}>
            Exportar resumo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const improved = k.id === 'noshow' ? k.deltaPct < 0 : k.deltaPct > 0;
          return (
            <KpiCard
              key={k.id}
              label={k.label}
              value={k.value}
              icon={KPI_ICON[k.id]}
              tone={KPI_TONE[k.id]}
              delta={{
                value: `${k.deltaPct > 0 ? '+' : ''}${k.deltaPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
                trend: k.deltaPct >= 0 ? 'up' : 'down',
                caption: 'vs. período anterior',
              }}
              footer={
                <span className={cn('text-[12px] font-semibold', improved ? 'text-success' : 'text-danger')}>
                  {improved ? 'Melhora' : 'Atenção'}
                  {k.id === 'noshow' ? ' — menos faltas é melhor' : ''}
                </span>
              }
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Consultas por mês" description="2026 comparado a 2025">
          <LineChart
            ariaLabel="Consultas por mês em 2026 comparadas a 2025"
            labels={reportMonths}
            height={260}
            formatValue={(v) => INT.format(v)}
            series={[
              { name: '2026', color: '#B5832F', points: monthlyAppointments.current },
              { name: '2025', color: '#9E998F', points: monthlyAppointments.previous, dashed: true },
            ]}
          />
        </Card>
        <Card title="Consultas por especialidade" description="Período selecionado">
          <BarChart
            ariaLabel="Consultas por especialidade"
            height={260}
            formatValue={(v) => INT.format(v)}
            data={appointmentsBySpecialty.map((a, i) => ({
              label: SPECIALTY_LABEL[a.specialty].split(' ')[0],
              value: Math.round(a.value * factor),
              highlight: i === 0,
            }))}
          />
        </Card>
      </div>

      <Card title="Horários de pico" description="Média de consultas por dia da semana e hora">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-1">
            <caption className="sr-only">Mapa de calor de consultas por dia da semana e hora</caption>
            <thead>
              <tr>
                <th scope="col" className="w-12" />
                {HEATMAP_HOURS.map((h) => (
                  <th key={h} scope="col" className="text-center text-[11px] font-semibold text-graphite-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peakHeatmap.map((row, di) => (
                <tr key={HEATMAP_DAYS[di]}>
                  <th scope="row" className="pr-2 text-left text-[12px] font-semibold text-graphite-600">
                    {HEATMAP_DAYS[di]}
                  </th>
                  {row.map((v, hi) => (
                    <td key={hi} className="p-0">
                      <div
                        className={cn(
                          'flex h-10 items-center justify-center rounded-xs text-[12px] font-semibold tabular-nums',
                          heatClass(v, heatMax),
                          v / heatMax > 0.8 ? 'text-white' : 'text-graphite-700',
                        )}
                        title={`${HEATMAP_DAYS[di]} ${HEATMAP_HOURS[hi]}: ${v} consultas`}
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
          <span className="ml-auto">Pico: quinta, 14h–16h</span>
        </div>
      </Card>

      <Card title="Produtividade por profissional" padding="none">
        <DataTable<ProfessionalProductivity>
          caption="Produtividade por profissional no período"
          rowKey={(r) => r.id}
          rows={productivity}
          columns={[
            {
              key: 'name',
              header: 'Profissional',
              render: (r) => (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-semibold text-graphite-900">
                    {r.name}
                    {r.isDemo && (
                      <span className="rounded-full bg-graphite-100 px-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-graphite-500">
                        Demo
                      </span>
                    )}
                  </span>
                  <SpecialtyTag specialty={r.specialty} variant="dot" />
                </div>
              ),
            },
            { key: 'appointments', header: 'Consultas', align: 'right', render: (r) => <span className="tabular-nums">{INT.format(r.appointments)}</span> },
            { key: 'revenue', header: 'Faturamento', align: 'right', hideBelow: 'md', render: (r) => <span className="tabular-nums">{formatCurrency(r.revenue)}</span> },
            {
              key: 'occupancy',
              header: 'Ocupação',
              hideBelow: 'md',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-graphite-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-gold-500" style={{ width: `${r.occupancy * 100}%` }} />
                  </div>
                  <span className="tabular-nums text-graphite-700">{PERCENT.format(r.occupancy)}</span>
                </div>
              ),
            },
            { key: 'noshow', header: 'Faltas', align: 'right', hideBelow: 'lg', render: (r) => <span className="tabular-nums">{PERCENT.format(r.noShowRate)}</span> },
            { key: 'rating', header: 'Satisfação', align: 'right', hideBelow: 'lg', render: (r) => <span className="tabular-nums">{r.rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} / 5</span> },
          ]}
        />
      </Card>

      <Card title="Biblioteca de relatórios" description="Relatórios prontos para exportar">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {CATEGORIES.map((c) => (
            <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {library.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4 transition-colors hover:border-gold-300">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                  <TrendingUp size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-graphite-900">{r.title}</h3>
                  <p className="text-[12px] text-graphite-500">{r.category} · atualizado em {formatDateBR(r.updatedAt)}</p>
                </div>
              </div>
              <p className="flex-1 text-[13px] text-graphite-600">{r.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" leftIcon={FileText} onClick={() => exportFile(r.title, 'PDF')} aria-label={`Exportar ${r.title} em PDF`}>
                  PDF
                </Button>
                <Button size="sm" variant="secondary" leftIcon={FileSpreadsheet} onClick={() => exportFile(r.title, 'CSV')} aria-label={`Exportar ${r.title} em CSV`}>
                  CSV
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-[12px] text-graphite-500">Ambiente de demonstração — métricas fictícias.</p>
    </div>
  );
}
