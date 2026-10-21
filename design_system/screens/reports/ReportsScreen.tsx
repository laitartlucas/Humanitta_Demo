import { useDeferredValue, useMemo, useState } from 'react';
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Percent,
  RotateCcw,
  ShieldOff,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  DataTable,
  DonutChart,
  EmptyState,
  FilterChip,
  Input,
  LineChart,
  SegmentedControl,
  Select,
  Tabs,
  useToast,
} from '@ds/components';
import { formatCurrency, formatCurrencyCompact, PAYMENT_METHOD_COLOR } from '@ds/mocks/business';
import { STATUS_NAMES } from '@ds/mocks/clinical';
import type { AppointmentStatus, PaymentMethod, Specialty } from '@ds/mocks/types';
import { db, todayKey, useAccessContext, useQuery } from '@core';
import {
  availableReports,
  buildReport,
  describeRange,
  downloadCsv,
  isPeriodPreset,
  PERIOD_PRESETS,
  resolvePeriod,
  selectReportFilterOptions,
  type PayoutRow,
  type PeriodPreset,
  type ReportCategory,
  type ReportData,
  type ReportDefinition,
  type ReportFilters,
} from './model';
import {
  CHART_DANGER,
  CHART_GOLD,
  CHART_GRAPHITE,
  CHART_INFO,
  CHART_SUCCESS,
  CHART_WARNING,
  ChartEmpty,
  Distribution,
  fmtRatio,
  Heatmap,
  INT,
  Kpi,
  Note,
  ProductivityTable,
} from './components/parts';

export type ReportsTab = 'geral' | 'agendamentos' | 'atendimentos' | 'financeiro' | 'pacientes' | 'profissionais';

export interface ReportsScreenProps {
  /** Aba aberta inicialmente (padrão "geral"). */
  initialTab?: ReportsTab;
}

const STATUS_OPTIONS: AppointmentStatus[] = ['agendada', 'confirmada', 'em_atendimento', 'concluida', 'cancelada', 'faltou', 'reagendada'];
const CATEGORIES: (ReportCategory | 'Todos')[] = ['Todos', 'Atendimento', 'Financeiro', 'Pacientes', 'Comunicação'];

interface FilterState {
  preset: PeriodPreset;
  customFrom: string;
  customTo: string;
  professionalId: string;
  specialty: string;
  service: string;
  status: string;
}

const INITIAL_FILTERS: FilterState = {
  preset: 'mes_atual',
  customFrom: '',
  customTo: '',
  professionalId: '',
  specialty: '',
  service: '',
  status: '',
};

const deltaOf = (cur: number | null, prev: number | null): number | null | undefined => {
  if (cur === null || prev === null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
};

/**
 * Relatórios — indicadores calculados do banco compartilhado (agenda, atendimentos, financeiro,
 * cadastros). Filtros e período atualizam todos os blocos; exportação CSV respeita filtros e perfil.
 */
export function ReportsScreen({ initialTab = 'geral' }: ReportsScreenProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [tab, setTab] = useState<ReportsTab>(initialTab);
  const [category, setCategory] = useState<ReportCategory | 'Todos'>('Todos');

  const today = todayKey();
  const reportFilters = useMemo<ReportFilters>(
    () => ({
      range: resolvePeriod(filters.preset, today, { from: filters.customFrom, to: filters.customTo }),
      professionalId: filters.professionalId || undefined,
      specialty: (filters.specialty || undefined) as Specialty | undefined,
      service: filters.service || undefined,
      status: (filters.status || undefined) as AppointmentStatus | undefined,
    }),
    [filters, today],
  );
  // Filtro aplicado de forma diferida: a tela continua responsiva e mostra "carregando" enquanto recalcula.
  const applied = useDeferredValue(reportFilters);
  const loading = applied !== reportFilters;

  const report = useQuery((s, ctx) => buildReport(s, ctx, applied), [applied]);
  const options = useQuery(selectReportFilterOptions);
  const { access } = report;

  const set = (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch }));
  const activeFilters = [filters.professionalId, filters.specialty, filters.service, filters.status].filter(Boolean).length;

  const library = availableReports(access);
  const visibleLibrary = category === 'Todos' ? library : library.filter((r) => r.category === category);

  const ctx = useAccessContext();
  function exportCsv(def: ReportDefinition) {
    const table = def.build(db.getState(), ctx, reportFilters);
    if (table.rows.length === 0) {
      toast({ tone: 'info', title: 'Nada para exportar', description: `"${def.title}" não tem registros no período e filtros atuais.` });
      return;
    }
    const ok = downloadCsv(table);
    toast(
      ok
        ? { tone: 'success', title: 'CSV gerado', description: `"${def.title}" — ${INT.format(table.rows.length)} linhas, ${describeRange(reportFilters.range)}.` }
        : { tone: 'danger', title: 'Não foi possível concluir', description: 'O navegador bloqueou o download do arquivo.' },
    );
  }
  const summaryDef = library.find((r) => r.id === 'resumo');

  if (!access.operational && !access.financial) {
    return (
      <Card>
        <EmptyState
          icon={ShieldOff}
          title="Relatórios indisponíveis para o seu perfil"
          description="Seu perfil não tem acesso aos relatórios da clínica. Fale com a administração se precisar destes dados."
        />
      </Card>
    );
  }

  const tabs = [
    { id: 'geral', label: 'Visão geral' },
    ...(access.operational ? [{ id: 'agendamentos', label: 'Agendamentos' }, { id: 'atendimentos', label: 'Atendimentos' }] : []),
    ...(access.financial ? [{ id: 'financeiro', label: 'Financeiro' }] : []),
    ...(access.patients ? [{ id: 'pacientes', label: 'Pacientes' }] : []),
    ...(access.operational ? [{ id: 'profissionais', label: 'Profissionais' }] : []),
  ];
  const currentTab = tabs.some((t) => t.id === tab) ? tab : 'geral';

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros ------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 rounded-md border border-graphite-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[13px] font-semibold text-graphite-800">Período</span>
            <div className="overflow-x-auto">
              <SegmentedControl
                ariaLabel="Período do relatório"
                options={PERIOD_PRESETS}
                value={filters.preset}
                onChange={(v) => {
                  if (!isPeriodPreset(v)) return;
                  if (v === 'personalizado' && !filters.customFrom) set({ preset: v, customFrom: reportFilters.range.from, customTo: reportFilters.range.to });
                  else set({ preset: v });
                }}
              />
            </div>
            <span className="text-[12px] text-graphite-500" aria-live="polite">
              {describeRange(report.compared)} vs. {describeRange(report.previous)}
            </span>
          </div>
          {summaryDef && (
            <Button variant="secondary" leftIcon={FileSpreadsheet} onClick={() => exportCsv(summaryDef)}>
              Exportar resumo
            </Button>
          )}
        </div>

        {filters.preset === 'personalizado' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[480px]">
            <Input label="Data inicial" type="date" value={filters.customFrom} max={filters.customTo || undefined} onChange={(e) => set({ customFrom: e.target.value })} />
            <Input label="Data final" type="date" value={filters.customTo} min={filters.customFrom || undefined} onChange={(e) => set({ customTo: e.target.value })} />
          </div>
        )}

        {access.operational && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
            {!access.ownScope && (
              <Select
                label="Profissional"
                controlSize="sm"
                value={filters.professionalId}
                onChange={(e) => set({ professionalId: e.target.value })}
                options={[{ value: '', label: 'Todos os profissionais' }, ...options.professionals]}
              />
            )}
            <Select
              label="Especialidade"
              controlSize="sm"
              value={filters.specialty}
              onChange={(e) => set({ specialty: e.target.value })}
              options={[{ value: '', label: 'Todas as especialidades' }, ...options.specialties]}
            />
            <Select
              label="Serviço"
              controlSize="sm"
              value={filters.service}
              onChange={(e) => set({ service: e.target.value })}
              options={[{ value: '', label: 'Todos os serviços' }, ...options.services]}
            />
            <Select
              label="Status do agendamento"
              controlSize="sm"
              value={filters.status}
              onChange={(e) => set({ status: e.target.value })}
              options={[{ value: '', label: 'Todos os status' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_NAMES[s] }))]}
            />
            <Button
              variant="ghost"
              leftIcon={RotateCcw}
              disabled={activeFilters === 0 && filters.preset === INITIAL_FILTERS.preset}
              onClick={() => setFilters(INITIAL_FILTERS)}
            >
              Limpar filtros
            </Button>
          </div>
        )}
        {access.ownScope && <Note>Você vê somente os seus próprios agendamentos e atendimentos.</Note>}
      </div>

      <Tabs ariaLabel="Seções do relatório" idPrefix="reports" className="overflow-y-hidden" items={tabs} value={currentTab} onChange={(id) => setTab(id as ReportsTab)} />

      <div id={`reports-panel-${currentTab}`} role="tabpanel" aria-labelledby={`reports-tab-${currentTab}`} aria-busy={loading || undefined} className="flex flex-col gap-6">
        {currentTab === 'geral' && <OverviewTab report={report} loading={loading} onOpen={setTab} />}
        {currentTab === 'agendamentos' && <AppointmentsTab report={report} loading={loading} filters={reportFilters} />}
        {currentTab === 'atendimentos' && <AttendancesTab report={report} loading={loading} />}
        {currentTab === 'financeiro' && <FinanceTab report={report} loading={loading} filters={reportFilters} />}
        {currentTab === 'pacientes' && <PatientsTab report={report} loading={loading} />}
        {currentTab === 'profissionais' && <ProfessionalsTab report={report} loading={loading} />}
      </div>

      {/* Biblioteca --------------------------------------------------------- */}
      <Card title="Biblioteca de relatórios" description="Exporta em CSV os dados do período e dos filtros atuais, conforme o seu perfil.">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {CATEGORIES.filter((c) => c === 'Todos' || library.some((r) => r.category === c)).map((c) => (
            <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleLibrary.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4 transition-colors hover:border-gold-300">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                  <TrendingUp size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-graphite-900">{r.title}</h3>
                  <p className="text-[12px] text-graphite-500">
                    {r.category} · {describeRange(reportFilters.range)}
                  </p>
                </div>
              </div>
              <p className="flex-1 text-[13px] text-graphite-600">{r.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" leftIcon={FileText} disabled title="Exportação em PDF prevista para uma próxima versão" aria-label={`Exportar ${r.title} em PDF (em breve)`}>
                  PDF
                </Button>
                <Button size="sm" variant="secondary" leftIcon={FileSpreadsheet} onClick={() => exportCsv(r)} aria-label={`Exportar ${r.title} em CSV`}>
                  CSV
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Note className="mt-4">PDF disponível em uma próxima versão. Exportações nunca incluem prontuário, telefone, e-mail ou conteúdo de mensagens.</Note>
      </Card>

      <p className="text-[12px] text-graphite-500">Ambiente de demonstração — indicadores calculados a partir dos dados fictícios da clínica.</p>
    </div>
  );
}

/* ================================ Abas ================================ */

interface TabProps {
  report: ReportData;
  loading: boolean;
}

function OverviewTab({ report: r, loading, onOpen }: TabProps & { onOpen: (t: ReportsTab) => void }) {
  const a = r.appointments;
  const ac = r.appointmentsCompared; // base das variações (intervalo comparável)
  const p = r.appointmentsPrevious;
  const fin = r.finance;
  const finCmp = r.financeCompared;
  const finPrev = r.financePrevious;
  const attendanceDonut = [
    { label: 'Realizadas', value: a.done, color: CHART_SUCCESS },
    { label: 'A realizar', value: a.scheduled + a.confirmed + a.inProgress, color: CHART_GOLD },
    { label: 'Faltas', value: a.noShow, color: CHART_WARNING },
    { label: 'Canceladas', value: a.cancelled, color: CHART_DANGER },
  ];
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Consultas" value={INT.format(a.total)} icon={CalendarCheck} tone="gold" deltaPct={deltaOf(ac.total, p.total)} loading={loading} />
        {fin && finPrev ? (
          <Kpi label="Faturamento" value={formatCurrency(fin.revenue)} icon={Wallet} tone="success" deltaPct={deltaOf(finCmp?.revenue ?? fin.revenue, finPrev.revenue)} loading={loading} />
        ) : (
          <Kpi label="Realizadas" value={INT.format(a.done)} icon={CheckCircle2} tone="success" deltaPct={deltaOf(ac.done, p.done)} loading={loading} />
        )}
        <Kpi
          label="Ocupação"
          value={fmtRatio(r.occupancy.currentRatio)}
          icon={Percent}
          tone="ai"
          deltaPct={r.occupancy.deltaPct}
          loading={loading}
          footer={r.occupancy.currentRatio === null ? <span className="text-[12px] text-graphite-500">Sem expediente cadastrado no período</span> : undefined}
        />
        <Kpi
          label="Faltas"
          value={fmtRatio(a.noShowRate)}
          icon={UserX}
          tone="warning"
          invert
          deltaPct={ac.noShowRate === null ? null : deltaOf(ac.noShowRate, p.noShowRate)}
          loading={loading}
          footer={<span className="text-[12px] text-graphite-500">Menos faltas é melhor</span>}
        />
      </div>

      {r.isEmpty ? (
        <Card>
          <EmptyState icon={CalendarClock} title="Nenhum registro no período" description="Não há agendamentos nem lançamentos para o período e os filtros selecionados." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Evolução de consultas"
              description={`${describeRange(r.range)} comparado a ${describeRange(r.previousChart)}`}
              action={
                <Button size="sm" variant="ghost" onClick={() => onOpen('agendamentos')}>
                  Detalhar
                </Button>
              }
            >
              <LineChart
                ariaLabel="Consultas no período comparadas ao período anterior"
                labels={r.appointmentsEvolution.labels}
                height={260}
                formatValue={(v) => INT.format(v)}
                series={[
                  { name: 'Período', color: CHART_GOLD, points: r.appointmentsEvolution.current },
                  { name: 'Anterior', color: CHART_GRAPHITE, points: r.appointmentsEvolution.previous, dashed: true },
                ]}
              />
            </Card>
            <Card title="Consultas por especialidade" description="Período selecionado">
              {a.bySpecialty.length === 0 ? (
                <ChartEmpty />
              ) : (
                <BarChart
                  ariaLabel="Consultas por especialidade"
                  height={260}
                  formatValue={(v) => INT.format(v)}
                  data={a.bySpecialty.map((x, i) => ({ label: x.label.split(' ')[0], value: x.value, highlight: i === 0 }))}
                />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {r.financeMonthly && (
              <Card
                className="xl:col-span-2"
                title="Faturamento por mês"
                description="Receitas recebidas e custos pagos (despesas + repasses) nos últimos 6 meses"
                action={
                  <Button size="sm" variant="ghost" onClick={() => onOpen('financeiro')}>
                    Detalhar
                  </Button>
                }
              >
                <LineChart
                  ariaLabel="Receitas e custos por mês"
                  labels={r.financeMonthly.map((m) => m.label)}
                  height={240}
                  formatValue={formatCurrency}
                  formatAxis={formatCurrencyCompact}
                  series={[
                    { name: 'Receitas', color: CHART_GOLD, points: r.financeMonthly.map((m) => m.revenue) },
                    { name: 'Custos', color: CHART_GRAPHITE, points: r.financeMonthly.map((m) => m.costs), dashed: true },
                  ]}
                />
              </Card>
            )}
            <Card title="Comparecimento, faltas e cancelamentos" description="Consultas do período" className={r.financeMonthly ? undefined : 'xl:col-span-3'}>
              <DonutChart data={attendanceDonut} centerLabel="Consultas" centerValue={INT.format(a.total)} size={160} />
            </Card>
          </div>

          <Card title="Horários de pico" description="Consultas por dia da semana e hora no período">
            <Heatmap grid={r.heatmap} />
          </Card>

          <Card
            title="Produtividade por profissional"
            padding="none"
            action={
              <Button size="sm" variant="ghost" onClick={() => onOpen('profissionais')}>
                Detalhar
              </Button>
            }
          >
            <ProductivityTable rows={r.professionals} showRevenue={r.access.financial} loading={loading} />
          </Card>
        </>
      )}
    </>
  );
}

function AppointmentsTab({ report: r, loading, filters }: TabProps & { filters: ReportFilters }) {
  const a = r.appointments;
  const ac = r.appointmentsCompared;
  const p = r.appointmentsPrevious;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Total de agendamentos" value={INT.format(a.total)} icon={CalendarCheck} deltaPct={deltaOf(ac.total, p.total)} loading={loading} />
        <Kpi label="Confirmados" value={INT.format(a.confirmed)} icon={UserCheck} tone="success" deltaPct={deltaOf(ac.confirmed, p.confirmed)} loading={loading} />
        <Kpi label="Pendentes de confirmação" value={INT.format(a.scheduled)} icon={Clock} tone="warning" deltaPct={deltaOf(ac.scheduled, p.scheduled)} loading={loading} />
        <Kpi label="Realizados" value={INT.format(a.done)} icon={CheckCircle2} tone="success" deltaPct={deltaOf(ac.done, p.done)} loading={loading} />
        <Kpi label="Cancelados" value={INT.format(a.cancelled)} icon={CalendarX} tone="warning" invert deltaPct={deltaOf(ac.cancelled, p.cancelled)} loading={loading} />
        <Kpi
          label="Taxa de cancelamento"
          value={fmtRatio(a.cancelRate)}
          icon={Percent}
          tone="ai"
          invert
          deltaPct={deltaOf(ac.cancelRate, p.cancelRate)}
          loading={loading}
          footer={
            <span className="text-[12px] text-graphite-500">
              {INT.format(a.noShow)} faltas · {INT.format(a.rescheduled)} reagendados · {INT.format(a.inProgress)} em atendimento
            </span>
          }
        />
      </div>
      {filters.status && <Note>Filtrando pelo status “{STATUS_NAMES[filters.status]}”: os demais contadores ficam zerados.</Note>}

      <Card title="Evolução por período" description={`${describeRange(r.range)} comparado a ${describeRange(r.previousChart)}`}>
        {a.total === 0 && p.total === 0 ? (
          <ChartEmpty />
        ) : (
          <LineChart
            ariaLabel="Agendamentos por período"
            labels={r.appointmentsEvolution.labels}
            height={240}
            formatValue={(v) => INT.format(v)}
            series={[
              { name: 'Período', color: CHART_GOLD, points: r.appointmentsEvolution.current },
              { name: 'Anterior', color: CHART_GRAPHITE, points: r.appointmentsEvolution.previous, dashed: true },
            ]}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Por profissional">
          <Distribution rows={a.byProfessional} />
        </Card>
        <Card title="Por especialidade">
          <Distribution rows={a.bySpecialty} />
        </Card>
        <Card title="Por serviço">
          <Distribution rows={a.byService} />
        </Card>
      </div>
    </>
  );
}

function AttendancesTab({ report: r, loading }: TabProps) {
  const at = r.attendances;
  const atc = r.attendancesCompared;
  const prev = r.attendancesPrevious;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Atendimentos registrados" value={INT.format(at.registered)} icon={Users} deltaPct={deltaOf(atc.registered, prev.registered)} loading={loading} />
        <Kpi label="Concluídos" value={INT.format(at.finished)} icon={CheckCircle2} tone="success" deltaPct={deltaOf(atc.finished, prev.finished)} loading={loading} />
        <Kpi label="Em andamento" value={INT.format(at.inProgress)} icon={Clock} tone="ai" loading={loading} />
        <Kpi
          label="Pendentes"
          value={INT.format(at.waiting + at.toDo)}
          icon={CalendarClock}
          tone="warning"
          loading={loading}
          footer={
            <span className="text-[12px] text-graphite-500">
              {INT.format(at.waiting)} aguardando · {INT.format(at.toDo)} previstos
            </span>
          }
        />
        <Kpi
          label="Faltas e cancelados"
          value={INT.format(at.noShow + at.cancelled)}
          icon={Ban}
          tone="warning"
          invert
          deltaPct={deltaOf(atc.noShow + atc.cancelled, prev.noShow + prev.cancelled)}
          loading={loading}
        />
        <Kpi label="Taxa de conclusão" value={fmtRatio(at.completionRate)} icon={Percent} tone="success" deltaPct={deltaOf(atc.completionRate, prev.completionRate)} loading={loading} />
      </div>
      <Note>Indicadores administrativos do ciclo de atendimento (check-in, início e fim). Nenhum conteúdo de prontuário é lido.</Note>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-3" title="Evolução mensal" description="Atendimentos concluídos nos últimos 6 meses">
          {r.attendancesMonthly.every((m) => m.value === 0) ? (
            <ChartEmpty />
          ) : (
            <BarChart
              ariaLabel="Atendimentos concluídos por mês"
              height={220}
              formatValue={(v) => INT.format(v)}
              data={r.attendancesMonthly.map((m, i, arr) => ({ label: m.label, value: m.value, highlight: i === arr.length - 1 }))}
            />
          )}
        </Card>
        <Card className="xl:col-span-2" title="Concluídos por profissional">
          <Distribution rows={at.byProfessional} />
        </Card>
        <Card title="Concluídos por serviço">
          <Distribution rows={at.byService} />
        </Card>
      </div>
    </>
  );
}

function FinanceTab({ report: r, loading, filters }: TabProps & { filters: ReportFilters }) {
  const f = r.finance;
  const fc = r.financeCompared ?? r.finance;
  const p = r.financePrevious;
  if (!f || !fc || !p || !r.financeEvolution) return null;
  const methodData = f.byMethod.map((m) => ({ label: m.label, value: m.value, color: PAYMENT_METHOD_COLOR[m.id as PaymentMethod] ?? CHART_GRAPHITE }));
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Receitas recebidas" value={formatCurrency(f.revenue)} icon={TrendingUp} tone="success" deltaPct={deltaOf(fc.revenue, p.revenue)} loading={loading} footer={<span className="text-[12px] text-graphite-500">{INT.format(f.receivedCount)} recebimentos</span>} />
        <Kpi label="Despesas pagas" value={formatCurrency(f.expenses)} icon={TrendingDown} tone="warning" invert deltaPct={deltaOf(fc.expenses, p.expenses)} loading={loading} />
        <Kpi label="Repasses pagos" value={formatCurrency(f.payouts)} icon={Users} tone="ai" deltaPct={deltaOf(fc.payouts, p.payouts)} loading={loading} />
        <Kpi
          label="Resultado"
          value={formatCurrency(f.result)}
          icon={Wallet}
          tone={f.result >= 0 ? 'success' : 'warning'}
          deltaPct={p.result === 0 ? null : ((fc.result - p.result) / Math.abs(p.result)) * 100}
          loading={loading}
          footer={<span className="text-[12px] text-graphite-500">Receitas − despesas − repasses (pagos)</span>}
        />
        <Kpi label="Recebimentos pendentes" value={formatCurrency(f.receivable)} icon={Clock} tone="gold" loading={loading} footer={<span className="text-[12px] text-graphite-500">{INT.format(f.pendingCount)} a receber</span>} />
        <Kpi
          label="Recebimentos vencidos"
          value={formatCurrency(f.overdueReceivables)}
          icon={CalendarX}
          tone="warning"
          loading={loading}
          footer={<span className="text-[12px] text-graphite-500">{INT.format(f.overdueCount)} em atraso · total vencido {formatCurrency(f.overdue)}</span>}
        />
      </div>
      <Note>
        Valores pela data de competência do lançamento, com as mesmas regras do módulo Financeiro (estornos não contam como receita).
        {(filters.service || filters.status) && ' Os filtros de serviço e status de agendamento não se aplicam aos lançamentos.'}
      </Note>

      <Card title="Evolução financeira" description={describeRange(r.range)}>
        {f.revenue === 0 && f.expenses === 0 && f.payouts === 0 ? (
          <ChartEmpty />
        ) : (
          <LineChart
            ariaLabel="Receitas e custos no período"
            labels={r.financeEvolution.labels}
            height={240}
            formatValue={formatCurrency}
            formatAxis={formatCurrencyCompact}
            series={[
              { name: 'Receitas', color: CHART_GOLD, points: r.financeEvolution.revenue },
              { name: 'Despesas + repasses', color: CHART_GRAPHITE, points: r.financeEvolution.costs, dashed: true },
            ]}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Por forma de pagamento" description="Receitas recebidas no período">
          {methodData.length === 0 ? <ChartEmpty /> : <DonutChart data={methodData} centerLabel="Recebido" centerValue={formatCurrencyCompact(f.revenue)} formatValue={formatCurrency} size={160} />}
        </Card>
        <Card title="Receita por categoria de serviço" description="Consulta, procedimento, pacote, avaliação e convênio">
          <Distribution rows={f.byCategory} format={formatCurrency} />
          <Note className="mt-4">A receita por serviço individual depende do vínculo entre lançamento e agendamento, previsto para a integração.</Note>
        </Card>
      </div>

      {f.payoutsByProfessional && (
        <Card title="Repasses por profissional" padding="none">
          <DataTable<PayoutRow>
            caption="Repasses por profissional no período"
            rowKey={(x) => x.id}
            rows={f.payoutsByProfessional}
            empty={<ChartEmpty title="Sem repasses no período" />}
            columns={[
              { key: 'label', header: 'Profissional', render: (x) => <span className="font-semibold text-graphite-900">{x.label}</span> },
              { key: 'paid', header: 'Pago', align: 'right', render: (x) => <span className="tabular-nums">{formatCurrency(x.paid)}</span> },
              { key: 'pending', header: 'Pendente / atrasado', align: 'right', render: (x) => <span className="tabular-nums">{formatCurrency(x.pending)}</span> },
              { key: 'total', header: 'Total', align: 'right', hideBelow: 'md', render: (x) => <span className="font-semibold tabular-nums">{formatCurrency(x.paid + x.pending)}</span> },
            ]}
          />
        </Card>
      )}
    </>
  );
}

function PatientsTab({ report: r, loading }: TabProps) {
  const p = r.patients;
  if (!p) return null;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Cadastrados" value={INT.format(p.total)} icon={Users} loading={loading} />
        <Kpi label="Ativos" value={INT.format(p.active)} icon={UserCheck} tone="success" loading={loading} />
        <Kpi label="Inativos" value={INT.format(p.inactive)} icon={UserX} tone="warning" loading={loading} />
        <Kpi label="Novos no período" value={INT.format(p.newInPeriod.current)} icon={UserPlus} tone="gold" deltaPct={p.newInPeriod.deltaPct} loading={loading} />
        <Kpi label="Atendidos no período" value={INT.format(p.attended)} icon={CheckCircle2} tone="ai" loading={loading} footer={<span className="text-[12px] text-graphite-500">Com consulta concluída</span>} />
      </div>
      <Card title="Evolução de cadastros" description="Novos pacientes por mês (últimos 6 meses)">
        {p.monthly.every((m) => m.value === 0) ? (
          <ChartEmpty title="Sem novos cadastros" description="Nenhum paciente foi cadastrado nos últimos 6 meses do período." />
        ) : (
          <BarChart
            ariaLabel="Novos cadastros de pacientes por mês"
            height={220}
            formatValue={(v) => INT.format(v)}
            data={p.monthly.map((m, i, arr) => ({ label: m.label, value: m.value, highlight: i === arr.length - 1 }))}
          />
        )}
      </Card>
      <Note>Somente indicadores de cadastro. Prontuários, diagnósticos e demais dados clínicos não fazem parte dos relatórios.</Note>
    </>
  );
}

function ProfessionalsTab({ report: r, loading }: TabProps) {
  const rows = r.professionals;
  const active = rows.filter((x) => x.active).length;
  const bySpecialty = Object.values(
    rows.reduce<Record<string, { id: string; label: string; value: number; color: string }>>((acc, x) => {
      const item = r.appointments.bySpecialty.find((s) => s.id === x.specialty);
      acc[x.specialty] = {
        id: x.specialty,
        label: item?.label ?? x.specialty,
        value: (acc[x.specialty]?.value ?? 0) + x.done,
        color: item?.color ?? CHART_INFO,
      };
      return acc;
    }, {}),
  )
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Profissionais ativos" value={INT.format(active)} icon={UserCheck} tone="success" loading={loading} />
        <Kpi label="Profissionais inativos" value={INT.format(rows.length - active)} icon={UserX} tone="warning" loading={loading} footer={<span className="text-[12px] text-graphite-500">Sem usuário ativo em Configurações</span>} />
        <Kpi label="Consultas no período" value={INT.format(rows.reduce((t, x) => t + x.appointments, 0))} icon={CalendarCheck} loading={loading} />
        <Kpi label="Ocupação média" value={fmtRatio(r.occupancy.currentRatio)} icon={Percent} tone="ai" deltaPct={r.occupancy.deltaPct} loading={loading} />
      </div>
      <Card title="Produtividade por profissional" padding="none">
        <ProductivityTable rows={rows} showRevenue={r.access.financial} loading={loading} />
      </Card>
      <Card title="Atendimentos concluídos por especialidade">
        <Distribution rows={bySpecialty} />
      </Card>
      <Note>Ocupação = minutos agendados ÷ minutos de expediente cadastrados no perfil do profissional. Sem expediente, o indicador não é calculado.</Note>
    </>
  );
}
