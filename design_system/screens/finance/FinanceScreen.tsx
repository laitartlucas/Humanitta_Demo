import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Download,
  HandCoins,
  Lock,
  PieChart,
  Plus,
  Scale,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  DataTable,
  DonutChart,
  EmptyState,
  HorizontalBarList,
  KpiCard,
  LineChart,
  PaymentStatusBadge,
  SegmentedControl,
  SPECIALTY_COLOR,
  SPECIALTY_LABEL,
  Tabs,
  useToast,
  type DataTableColumn,
} from '@ds/components';
import { todayKey, useAction, useCan, usePatients, useProfessionals, type PaymentStatus } from '@core';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateBR,
  PAYMENT_METHOD_COLOR,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from '@ds/mocks/business';
import {
  computeTotals,
  createFinanceEntry,
  deleteFinanceEntry,
  entriesToCsv,
  expensesByCategory,
  filterRows,
  fortnights,
  generatePayout,
  monthShortLabel,
  monthlySeries,
  paymentHistory,
  payoutsByProfessional,
  percentChange,
  presetRange,
  previousRange,
  rangeLabel,
  rangeShortLabel,
  receivableByStatus,
  receivedByMethod,
  registerFinancePayment,
  revenueBySpecialty,
  reverseFinanceEntry,
  statusTotals,
  updateFinanceEntry,
  type DateRange,
  type EntryDraft,
  type FinanceRow,
  type PaymentInput,
  type PayoutLine,
  type PeriodPreset,
} from '@modules/finance/domain';
import { useBillableAppointments, useFinanceRows, usePayoutStatement } from '@modules/finance/hooks';
import { EMPTY_FILTERS, EntriesPanel, PayoutStatementCard, PeriodPicker, SummaryTile, type ListFilters, type ListMode } from './components';
import { DeleteEntryDialog, EntryDetailsDrawer, NewEntryModal, RegisterPaymentModal, ReverseEntryDialog } from './modals';

type FinanceTab = 'visao' | ListMode;

const TABS: FinanceTab[] = ['visao', 'receitas', 'despesas', 'receber', 'repasses', 'pagamentos'];

/** Filtro fixo de cada aba de lista. */
const TAB_SCOPE: Record<ListMode, { types?: FinanceRow['type'][]; openOnly?: boolean }> = {
  receitas: { types: ['receita'] },
  despesas: { types: ['despesa'] },
  receber: { types: ['receita'], openOnly: true },
  repasses: { types: ['repasse'] },
  pagamentos: {},
};

const STATUS_COLOR: Record<PaymentStatus, string> = {
  pago: '#2E7351',
  pendente: '#9A5F0E',
  atrasado: '#A93B30',
  estornado: '#9E998F',
};

const NEUTRAL_COLOR = '#9E998F';

function formatDelta(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function isFinanceTab(v: string): v is FinanceTab {
  return (TABS as string[]).includes(v);
}

function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface FinanceScreenProps {
  /** Abre a ficha do paciente (rota decidida pelo container do módulo). */
  onOpenPatient?: (patientId: string) => void;
}

/**
 * Financeiro: indicadores, receitas, despesas, contas a receber, repasses e histórico de pagamentos.
 * Lê o banco compartilhado (`@core`) e escreve pelas operações do módulo (`@modules/finance/domain`).
 */
export function FinanceScreen({ onOpenPatient }: FinanceScreenProps) {
  const { toast } = useToast();
  const today = todayKey();
  const canView = useCan('financeiro', 'ver');
  const canWriteFinance = useCan('financeiro', 'editar');
  const canWritePayouts = useCan('repasses', 'editar');

  const rows = useFinanceRows();
  const professionals = useProfessionals();
  const patients = usePatients();
  const billable = useBillableAppointments();

  const [tab, setTab] = useState<FinanceTab>('visao');
  const [preset, setPreset] = useState<PeriodPreset>('mes_atual');
  const [custom, setCustom] = useState<DateRange>(() => presetRange('mes_atual', today));
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [chartMode, setChartMode] = useState<'linha' | 'barras'>('linha');
  const periods = useMemo(() => fortnights(today, 6), [today]);
  const [payoutPeriodId, setPayoutPeriodId] = useState(() => periods[1]?.id ?? periods[0].id);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceRow | null>(null);
  const [details, setDetails] = useState<FinanceRow | null>(null);
  const [toPay, setToPay] = useState<FinanceRow | null>(null);
  const [toReverse, setToReverse] = useState<FinanceRow | null>(null);
  const [toDelete, setToDelete] = useState<FinanceRow | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const create = useAction(createFinanceEntry, { success: 'Lançamento criado' });
  const update = useAction(updateFinanceEntry, { success: 'Lançamento atualizado' });
  const pay = useAction(registerFinancePayment, { success: 'Baixa registrada' });
  const reverse = useAction(reverseFinanceEntry, { success: 'Lançamento estornado' });
  const remove = useAction(deleteFinanceEntry, { success: 'Lançamento excluído' });
  const payout = useAction(generatePayout, { success: 'Repasse gerado' });

  const range = useMemo(() => presetRange(preset, today, custom), [preset, today, custom]);
  const prevRange = useMemo(() => previousRange(range), [range]);
  const isMonth = preset === 'mes_atual' || preset === 'mes_anterior';
  const periodWord = isMonth ? 'do mês' : 'do período';

  const totals = useMemo(() => computeTotals(rows, range), [rows, range]);
  const prevTotals = useMemo(() => computeTotals(rows, prevRange), [rows, prevRange]);
  const series = useMemo(() => monthlySeries(rows, range.to.slice(0, 7), 12), [rows, range]);
  const bySpecialty = useMemo(() => revenueBySpecialty(rows, range, professionals), [rows, range, professionals]);
  const byMethod = useMemo(() => receivedByMethod(rows, range), [rows, range]);
  const byStatus = useMemo(() => receivableByStatus(rows, range), [rows, range]);
  const byCategory = useMemo(() => expensesByCategory(rows, range), [rows, range]);
  const byProfessional = useMemo(() => payoutsByProfessional(rows, range), [rows, range]);
  const revenueStatus = useMemo(() => statusTotals(rows, 'receita', range), [rows, range]);
  const expenseStatus = useMemo(() => statusTotals(rows, 'despesa', range), [rows, range]);

  const payoutPeriod = periods.find((p) => p.id === payoutPeriodId) ?? periods[0];
  const payoutLines = usePayoutStatement(payoutPeriod.range);
  const profName = useMemo(() => new Map(professionals.map((p) => [p.id, p.name])), [professionals]);

  const periodRows = useMemo(() => filterRows(rows, { range }), [rows, range]);

  const tabRows = useMemo(() => {
    if (tab === 'visao') return periodRows;
    const ui = {
      query: filters.query,
      status: filters.status,
      category: filters.category || undefined,
      professionalId: filters.professionalId || undefined,
      method: filters.method || undefined,
    };
    if (tab === 'pagamentos') return paymentHistory(filterRows(rows, ui), range);
    return filterRows(rows, { ...TAB_SCOPE[tab], ...ui, range, sort: filters.sort });
  }, [tab, rows, periodRows, filters, range]);

  const counts = useMemo(
    () => ({
      receitas: periodRows.filter((e) => e.type === 'receita').length,
      despesas: periodRows.filter((e) => e.type === 'despesa').length,
      receber: periodRows.filter((e) => e.type === 'receita' && (e.effective === 'pendente' || e.effective === 'atrasado')).length,
      repasses: periodRows.filter((e) => e.type === 'repasse').length,
      pagamentos: paymentHistory(rows, range).length,
    }),
    [periodRows, rows, range],
  );

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="Acesso restrito"
        description="O financeiro geral não faz parte do seu perfil de acesso. Fale com a administração da clínica."
      />
    );
  }

  const canWrite = (r: FinanceRow) => (r.type === 'repasse' ? canWritePayouts : canWriteFinance);
  const allowedTypes = [...(canWriteFinance ? (['receita', 'despesa'] as const) : []), ...(canWritePayouts ? (['repasse'] as const) : [])];
  const prevCaption = `vs. ${rangeShortLabel(prevRange)}`;

  const delta = (cur: number, prev: number) => {
    const pct = percentChange(cur, prev);
    return pct === null ? undefined : { value: formatDelta(pct), trend: pct >= 0 ? ('up' as const) : ('down' as const), caption: prevCaption };
  };
  const noBase = (prev: number) =>
    percentChange(1, prev) === null ? <span className="text-[12px] text-graphite-500">Sem lançamentos em {rangeShortLabel(prevRange)} para comparar</span> : undefined;

  const openNew = () => {
    create.clearError();
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: FinanceRow) => {
    update.clearError();
    setDetails(null);
    setEditing(r);
    setFormOpen(true);
  };
  const openPay = (r: FinanceRow) => {
    pay.clearError();
    setDetails(null);
    setToPay(r);
  };
  const openReverse = (r: FinanceRow) => {
    setDetails(null);
    setToReverse(r);
  };

  const handleSave = async (draft: EntryDraft) => {
    if (editing) {
      const { type: _type, status: _status, ...patch } = draft;
      if (await update.run(editing.id, patch)) setFormOpen(false);
    } else if (await create.run(draft)) {
      setFormOpen(false);
    }
  };

  const handlePay = async (id: string, payment: PaymentInput) => {
    const done = await pay.run(id, payment);
    if (done) {
      setToPay(null);
      toast({ tone: 'info', title: `${PAYMENT_METHOD_LABEL[payment.method]} em ${formatDateBR(payment.paidAt)}`, description: `${done.description} — ${formatCurrency(done.amount)}` });
    }
  };

  const handleReverse = async (id: string) => {
    await reverse.run(id);
    setToReverse(null);
  };

  const handleDelete = async (id: string) => {
    await remove.run(id);
    setToDelete(null);
  };

  const handleGenerate = async (line: PayoutLine) => {
    setGeneratingId(line.professionalId);
    await payout.run({ professionalId: line.professionalId, period: payoutPeriod.range, periodLabel: payoutPeriod.label });
    setGeneratingId(null);
  };

  const handleExport = () => {
    if (tabRows.length === 0) {
      toast({ tone: 'info', title: 'Nada para exportar', description: 'Não há lançamentos com o período e os filtros atuais.' });
      return;
    }
    downloadCsv(`humanitta-financeiro-${tab}-${range.from}_${range.to}.csv`, entriesToCsv(tabRows));
    toast({
      tone: 'success',
      title: 'Exportação concluída',
      description: `${tabRows.length} ${tabRows.length === 1 ? 'lançamento' : 'lançamentos'} em CSV (dados fictícios de demonstração).`,
    });
  };

  const recentColumns: DataTableColumn<FinanceRow>[] = [
    {
      key: 'date',
      header: 'Data',
      width: '108px',
      render: (r) => <span className="tabular-nums text-graphite-700">{formatDateBR(r.date)}</span>,
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (r) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-graphite-900">{r.description}</span>
          <span className="truncate text-[12px] text-graphite-500">
            {r.category}
            {r.patientName ? ` · ${r.patientName}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Forma',
      hideBelow: 'md',
      render: (r) => <span className="text-graphite-700">{r.method ? PAYMENT_METHOD_LABEL[r.method] : '—'}</span>,
    },
    { key: 'status', header: 'Situação', render: (r) => <PaymentStatusBadge status={r.effective} /> },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (r) => (
        <span className={`font-semibold tabular-nums ${r.effective === 'estornado' ? 'text-graphite-400 line-through' : r.type === 'receita' ? 'text-success' : 'text-graphite-900'}`}>
          {r.type === 'receita' ? '+ ' : '− '}
          {formatCurrency(r.amount)}
        </span>
      ),
    },
  ];

  const specialtyTotal = bySpecialty.reduce((s, r) => s + r.value, 0);
  const statusTotal = byStatus.reduce((s, r) => s + r.value, 0);
  const seriesLabel = `${monthShortLabel(series[0].month)} a ${monthShortLabel(series[series.length - 1].month)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-overline uppercase tracking-[.08em] text-graphite-500">{rangeLabel(range)}</p>
          <p className="mt-1 text-[14px] text-graphite-600">
            Controle de receitas, despesas, contas a receber e repasses aos profissionais.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <PeriodPicker preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" leftIcon={Download} onClick={handleExport}>
              Exportar
            </Button>
            {allowedTypes.length > 0 && (
              <Button leftIcon={Plus} onClick={openNew}>
                Novo lançamento
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs
        ariaLabel="Seções do financeiro"
        value={tab}
        onChange={(id) => {
          if (isFinanceTab(id)) {
            setTab(id);
            setFilters(EMPTY_FILTERS);
          }
        }}
        items={[
          { id: 'visao', label: 'Visão geral' },
          { id: 'receitas', label: 'Receitas', count: counts.receitas },
          { id: 'despesas', label: 'Despesas', count: counts.despesas },
          { id: 'receber', label: 'A receber', count: counts.receber },
          { id: 'repasses', label: 'Repasses', count: counts.repasses },
          { id: 'pagamentos', label: 'Pagamentos', count: counts.pagamentos },
        ]}
      />

      {tab === 'visao' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={`Receita ${periodWord}`}
              value={formatCurrency(totals.revenue)}
              icon={Wallet}
              tone="gold"
              delta={delta(totals.revenue, prevTotals.revenue)}
              footer={noBase(prevTotals.revenue)}
            />
            <KpiCard
              label={`Despesas ${periodWord}`}
              value={formatCurrency(totals.expenses)}
              icon={ArrowDownCircle}
              tone="warning"
              invertDelta
              delta={delta(totals.expenses, prevTotals.expenses)}
              footer={noBase(prevTotals.expenses) ?? <span className="text-[12px] text-graphite-500">{formatCurrency(totals.payable)} a pagar</span>}
            />
            <KpiCard
              label={`Saldo ${periodWord}`}
              value={formatCurrency(totals.balance)}
              icon={Scale}
              tone="success"
              delta={delta(totals.balance, prevTotals.balance)}
              footer={<span className="text-[12px] text-graphite-500">Receitas − despesas − {formatCurrency(totals.payouts)} em repasses</span>}
            />
            <KpiCard
              label="A receber"
              value={formatCurrency(totals.receivable)}
              icon={Clock}
              tone="ai"
              invertDelta
              delta={delta(totals.receivable, prevTotals.receivable)}
              footer={<span className="text-[12px] text-danger">{formatCurrency(totals.overdueReceivable)} em atraso</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Fluxo de caixa"
              description={`Receitas e despesas pagas · ${seriesLabel} · regime de competência`}
              action={
                <SegmentedControl
                  size="sm"
                  ariaLabel="Tipo de gráfico"
                  value={chartMode}
                  onChange={(v) => setChartMode(v === 'barras' ? 'barras' : 'linha')}
                  options={[
                    { value: 'linha', label: 'Linha' },
                    { value: 'barras', label: 'Saldo' },
                  ]}
                />
              }
            >
              {chartMode === 'linha' ? (
                <LineChart
                  ariaLabel={`Receitas e despesas mensais, ${seriesLabel}`}
                  labels={series.map((m) => monthShortLabel(m.month))}
                  height={260}
                  formatValue={formatCurrencyCompact}
                  series={[
                    { name: 'Receitas', color: '#B5832F', points: series.map((m) => m.revenue) },
                    { name: 'Despesas', color: '#77736B', points: series.map((m) => m.expenses), dashed: true },
                  ]}
                />
              ) : (
                <BarChart
                  ariaLabel={`Saldo mensal (receitas − despesas − repasses), ${seriesLabel}`}
                  height={260}
                  formatValue={formatCurrencyCompact}
                  data={series.map((m, i) => ({ label: monthShortLabel(m.month), value: m.balance, highlight: i === series.length - 1 }))}
                />
              )}
            </Card>

            <Card title="Receita por especialidade" description={`Recebido · ${rangeLabel(range)}`}>
              {specialtyTotal > 0 ? (
                <div className="flex flex-col items-center gap-5">
                  <DonutChart
                    centerLabel="Total"
                    centerValue={formatCurrencyCompact(specialtyTotal)}
                    data={bySpecialty.map((r) => ({
                      label: r.key === 'sem_vinculo' ? 'Sem profissional' : SPECIALTY_LABEL[r.key],
                      value: r.value,
                      color: r.key === 'sem_vinculo' ? NEUTRAL_COLOR : SPECIALTY_COLOR[r.key],
                    }))}
                  />
                  <ul className="grid w-full grid-cols-1 gap-2 text-[13px] sm:grid-cols-2 xl:grid-cols-1">
                    {bySpecialty.map((r) => (
                      <li key={r.key} className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: r.key === 'sem_vinculo' ? NEUTRAL_COLOR : SPECIALTY_COLOR[r.key] }}
                        />
                        <span className="flex-1 truncate text-graphite-700">{r.key === 'sem_vinculo' ? 'Sem profissional' : SPECIALTY_LABEL[r.key]}</span>
                        <span className="font-semibold tabular-nums text-graphite-900">{formatCurrency(r.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState compact icon={PieChart} title="Sem receitas recebidas" description="Nenhuma receita paga no período selecionado." />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Formas de pagamento" description={`Recebido · ${rangeLabel(range)}`}>
              {byMethod.length > 0 ? (
                <HorizontalBarList
                  formatValue={formatCurrency}
                  data={byMethod.map((p) => ({ label: PAYMENT_METHOD_LABEL[p.key], value: p.value, color: PAYMENT_METHOD_COLOR[p.key] }))}
                />
              ) : (
                <EmptyState compact icon={Wallet} title="Sem recebimentos" description="Nenhuma baixa de receita no período." />
              )}
            </Card>
            <Card
              className="xl:col-span-2"
              title="Movimentações recentes"
              padding="none"
              action={
                <Button variant="ghost" size="sm" onClick={() => setTab('receitas')}>
                  Ver todas
                </Button>
              }
            >
              <DataTable<FinanceRow>
                caption={`Movimentações recentes — ${rangeLabel(range)}`}
                columns={recentColumns}
                rows={periodRows.slice(0, 6)}
                rowKey={(r) => r.id}
                onRowClick={setDetails}
                empty={<EmptyState compact icon={Wallet} title="Sem movimentações" description="Nenhum lançamento no período selecionado." />}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="Situação dos recebimentos" description={`Receitas lançadas · ${rangeLabel(range)}`}>
              {statusTotal > 0 ? (
                <DonutChart
                  centerLabel="Receitas"
                  centerValue={formatCurrencyCompact(statusTotal)}
                  formatValue={formatCurrency}
                  data={byStatus.map((s) => ({
                    label: PAYMENT_STATUS_LABEL[s.key],
                    value: s.value,
                    color: STATUS_COLOR[s.key],
                  }))}
                />
              ) : (
                <EmptyState compact icon={PieChart} title="Sem receitas" description="Nenhuma receita lançada no período." />
              )}
            </Card>
            <Card
              title="Repasses por profissional"
              description={rangeLabel(range)}
              action={
                <Button variant="ghost" size="sm" onClick={() => setTab('repasses')}>
                  Ver repasses
                </Button>
              }
            >
              {byProfessional.length > 0 ? (
                <HorizontalBarList
                  formatValue={formatCurrency}
                  data={byProfessional.map((p) => ({ label: profName.get(p.key) ?? 'Profissional', value: p.value, color: '#B5832F' }))}
                />
              ) : (
                <EmptyState compact icon={HandCoins} title="Sem repasses" description="Nenhum repasse lançado no período." />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile icon={ArrowUpCircle} label="Receitas lançadas" value={totals.launchedRevenue} caption="Exceto estornadas" />
            <SummaryTile icon={ArrowDownCircle} label="Despesas lançadas" value={totals.launchedExpenses} caption={`${formatCurrency(totals.overduePayable)} vencidas a pagar`} />
            <SummaryTile icon={HandCoins} label={`Repasses ${periodWord}`} value={totals.launchedPayouts} caption={`${formatCurrency(totals.payouts)} já pagos`} />
            <SummaryTile
              icon={BadgeCheck}
              label="Pagamentos registrados"
              value={totals.paymentsTotal}
              caption={`${totals.paymentsCount} ${totals.paymentsCount === 1 ? 'baixa' : 'baixas'} no período`}
            />
          </div>
        </>
      )}

      {tab === 'receitas' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryTile icon={CheckCircle2} label="Recebido" value={revenueStatus.paid} />
          <SummaryTile icon={Clock} label="A receber no prazo" value={revenueStatus.open} />
          <SummaryTile icon={Clock} label="Vencido" value={revenueStatus.overdue} danger />
        </div>
      )}

      {tab === 'despesas' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <SummaryTile icon={CheckCircle2} label="Pago" value={expenseStatus.paid} />
            <SummaryTile icon={Clock} label="A pagar no prazo" value={expenseStatus.open} />
            <SummaryTile icon={Clock} label="Vencido" value={expenseStatus.overdue} danger />
          </div>
          <Card className="xl:col-span-2" title="Despesas por categoria" description={`Exceto estornadas · ${rangeLabel(range)}`}>
            {byCategory.length > 0 ? (
              <HorizontalBarList formatValue={formatCurrency} data={byCategory.map((c) => ({ label: c.key, value: c.value, color: '#77736B' }))} />
            ) : (
              <EmptyState compact icon={ArrowDownCircle} title="Sem despesas" description="Nenhuma despesa lançada no período." />
            )}
          </Card>
        </div>
      )}

      {tab === 'repasses' && (
        <PayoutStatementCard
          lines={payoutLines}
          periods={periods}
          periodId={payoutPeriod.id}
          onPeriodChange={setPayoutPeriodId}
          today={today}
          canGenerate={canWritePayouts}
          generatingId={generatingId}
          onGenerate={handleGenerate}
        />
      )}

      {tab !== 'visao' && (
        <EntriesPanel
          mode={tab}
          rows={tabRows}
          filters={filters}
          onFiltersChange={setFilters}
          professionals={professionals}
          canWrite={canWrite}
          canPay={canWriteFinance}
          onOpen={setDetails}
          onPay={openPay}
          onEdit={openEdit}
          onReverse={openReverse}
          onDelete={setToDelete}
        />
      )}

      <p className="text-[12px] text-graphite-500">Ambiente de demonstração — todos os valores são fictícios. Nenhum pagamento real é processado.</p>

      <NewEntryModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        entry={editing}
        defaultType={tab === 'despesas' ? 'despesa' : tab === 'repasses' ? 'repasse' : 'receita'}
        today={today}
        patients={patients}
        professionals={professionals}
        billable={billable}
        allowedTypes={allowedTypes}
        saving={editing ? update.loading : create.loading}
        serverErrors={(editing ? update.error : create.error)?.fields}
      />
      <RegisterPaymentModal entry={toPay} onClose={() => setToPay(null)} onConfirm={handlePay} today={today} saving={pay.loading} serverErrors={pay.error?.fields} />
      <ReverseEntryDialog entry={toReverse} onClose={() => setToReverse(null)} onConfirm={handleReverse} loading={reverse.loading} />
      <DeleteEntryDialog entry={toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete} loading={remove.loading} />
      <EntryDetailsDrawer
        entry={details ? (rows.find((r) => r.id === details.id) ?? null) : null}
        onClose={() => setDetails(null)}
        canEdit={canWriteFinance || canWritePayouts}
        onPay={openPay}
        onEdit={openEdit}
        onReverse={openReverse}
        onOpenPatient={onOpenPatient}
      />
    </div>
  );
}
