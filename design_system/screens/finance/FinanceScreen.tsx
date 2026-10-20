import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Download,
  HandCoins,
  Plus,
  Scale,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  DataTable,
  DonutChart,
  FilterChip,
  HorizontalBarList,
  IconButton,
  KpiCard,
  LineChart,
  PaymentStatusBadge,
  SearchInput,
  SegmentedControl,
  SPECIALTY_COLOR,
  SPECIALTY_LABEL,
  Tabs,
  useToast,
} from '@ds/components';
import type { FinancialEntry, PaymentMethod, PaymentStatus } from '@ds/mocks/types';
import {
  financeSummary,
  financialEntries,
  formatCurrency,
  formatCurrencyCompact,
  formatDateBR,
  monthlyCashFlow,
  PAYMENT_METHOD_COLOR,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  revenueByPaymentMethod,
  revenueBySpecialty,
} from '@ds/mocks/business';
import { DeleteEntryDialog, NewEntryModal, RegisterPaymentModal } from './modals';

type FinanceTab = 'visao' | 'receitas' | 'despesas' | 'receber' | 'repasses';
type StatusFilter = 'todos' | PaymentStatus;

const TYPE_LABEL: Record<FinancialEntry['type'], string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  repasse: 'Repasse',
};

function formatDelta(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function isFinanceTab(v: string): v is FinanceTab {
  return ['visao', 'receitas', 'despesas', 'receber', 'repasses'].includes(v);
}

export function FinanceScreen() {
  const { toast } = useToast();
  const [tab, setTab] = useState<FinanceTab>('visao');
  const [entries, setEntries] = useState<FinancialEntry[]>(financialEntries);
  const [chartMode, setChartMode] = useState<'linha' | 'barras'>('linha');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [newOpen, setNewOpen] = useState(false);
  const [toPay, setToPay] = useState<FinancialEntry | null>(null);
  const [toDelete, setToDelete] = useState<FinancialEntry | null>(null);

  const counts = useMemo(
    () => ({
      receitas: entries.filter((e) => e.type === 'receita').length,
      despesas: entries.filter((e) => e.type === 'despesa').length,
      receber: entries.filter((e) => e.type === 'receita' && (e.status === 'pendente' || e.status === 'atrasado')).length,
      repasses: entries.filter((e) => e.type === 'repasse').length,
    }),
    [entries],
  );

  const tabRows = useMemo(() => {
    let rows = entries;
    if (tab === 'receitas') rows = rows.filter((e) => e.type === 'receita');
    if (tab === 'despesas') rows = rows.filter((e) => e.type === 'despesa');
    if (tab === 'repasses') rows = rows.filter((e) => e.type === 'repasse');
    if (tab === 'receber') rows = rows.filter((e) => e.type === 'receita' && (e.status === 'pendente' || e.status === 'atrasado'));
    if (statusFilter !== 'todos') rows = rows.filter((e) => e.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) =>
        [e.description, e.category, e.patientName ?? '', e.professionalName ?? ''].some((s) => s.toLowerCase().includes(q)),
      );
    }
    return [...rows].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, tab, statusFilter, query]);

  const tabTotal = tabRows.reduce((s, e) => s + e.amount, 0);

  const handleSave = (entry: FinancialEntry) => {
    setEntries((list) => [entry, ...list]);
    setNewOpen(false);
    toast({ tone: 'success', title: 'Lançamento criado', description: `${entry.description} — ${formatCurrency(entry.amount)}` });
  };

  const handlePay = (id: string, payment: { method: PaymentMethod; date: string }) => {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, status: 'pago', method: payment.method } : e)));
    setToPay(null);
    toast({ tone: 'success', title: 'Baixa registrada', description: `Pago via ${PAYMENT_METHOD_LABEL[payment.method]} em ${formatDateBR(payment.date)}.` });
  };

  const handleDelete = (id: string) => {
    setEntries((list) => list.filter((e) => e.id !== id));
    setToDelete(null);
    toast({ tone: 'info', title: 'Lançamento excluído' });
  };

  const columns = [
    {
      key: 'date',
      header: 'Data',
      width: '108px',
      render: (r: FinancialEntry) => <span className="tabular-nums text-graphite-700">{formatDateBR(r.date)}</span>,
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (r: FinancialEntry) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-graphite-900">{r.description}</span>
          <span className="truncate text-[12px] text-graphite-500">
            {TYPE_LABEL[r.type]} · {r.category}
            {r.patientName ? ` · ${r.patientName}` : ''}
            {r.professionalName && r.type === 'repasse' ? ` · ${r.professionalName}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Forma',
      hideBelow: 'md' as const,
      render: (r: FinancialEntry) => <span className="text-graphite-700">{r.method ? PAYMENT_METHOD_LABEL[r.method] : '—'}</span>,
    },
    {
      key: 'due',
      header: 'Vencimento',
      hideBelow: 'lg' as const,
      render: (r: FinancialEntry) => <span className="tabular-nums text-graphite-700">{r.dueDate ? formatDateBR(r.dueDate) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Situação',
      render: (r: FinancialEntry) => <PaymentStatusBadge status={r.status} />,
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right' as const,
      render: (r: FinancialEntry) => (
        <span className={`font-semibold tabular-nums ${r.type === 'receita' ? 'text-success' : 'text-graphite-900'}`}>
          {r.type === 'receita' ? '+ ' : '− '}
          {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right' as const,
      width: '104px',
      render: (r: FinancialEntry) => (
        <div className="flex justify-end gap-1">
          {(r.status === 'pendente' || r.status === 'atrasado') && (
            <IconButton icon={CheckCircle2} label={`Registrar pagamento de ${r.description}`} size="sm" onClick={() => setToPay(r)} />
          )}
          <IconButton icon={Trash2} label={`Excluir ${r.description}`} size="sm" onClick={() => setToDelete(r)} />
        </div>
      ),
    },
  ];

  const specialtyTotal = revenueBySpecialty.reduce((s, r) => s + r.value, 0);

  const statusChips: { value: StatusFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    ...(['pago', 'pendente', 'atrasado', 'estornado'] as PaymentStatus[]).map((s) => ({ value: s, label: PAYMENT_STATUS_LABEL[s] })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-overline uppercase tracking-[.08em] text-graphite-500">Outubro de 2026</p>
          <p className="mt-1 text-[14px] text-graphite-600">
            Controle de receitas, despesas, contas a receber e repasses aos profissionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            leftIcon={Download}
            onClick={() => toast({ tone: 'info', title: 'Exportação simulada', description: 'Na versão final, o extrato seria baixado em CSV.' })}
          >
            Exportar
          </Button>
          <Button leftIcon={Plus} onClick={() => setNewOpen(true)}>
            Novo lançamento
          </Button>
        </div>
      </div>

      <Tabs
        ariaLabel="Seções do financeiro"
        value={tab}
        onChange={(id) => {
          if (isFinanceTab(id)) {
            setTab(id);
            setStatusFilter('todos');
          }
        }}
        items={[
          { id: 'visao', label: 'Visão geral' },
          { id: 'receitas', label: 'Receitas', count: counts.receitas },
          { id: 'despesas', label: 'Despesas', count: counts.despesas },
          { id: 'receber', label: 'A receber', count: counts.receber },
          { id: 'repasses', label: 'Repasses', count: counts.repasses },
        ]}
      />

      {tab === 'visao' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Receita do mês"
              value={formatCurrency(financeSummary.revenue)}
              icon={Wallet}
              tone="gold"
              delta={{ value: formatDelta(financeSummary.deltas.revenue), trend: 'up', caption: 'vs. set/2026' }}
            />
            <KpiCard
              label="Despesas do mês"
              value={formatCurrency(financeSummary.expenses)}
              icon={ArrowDownCircle}
              tone="warning"
              delta={{ value: formatDelta(financeSummary.deltas.expenses), trend: 'up', caption: 'vs. set/2026' }}
            />
            <KpiCard
              label="Saldo do mês"
              value={formatCurrency(financeSummary.balance)}
              icon={Scale}
              tone="success"
              delta={{ value: formatDelta(financeSummary.deltas.balance), trend: 'up', caption: 'vs. set/2026' }}
            />
            <KpiCard
              label="A receber"
              value={formatCurrency(financeSummary.receivable)}
              icon={Clock}
              tone="ai"
              delta={{ value: formatDelta(financeSummary.deltas.receivable), trend: 'down', caption: 'vs. set/2026' }}
              footer={<span className="text-[12px] text-danger">{formatCurrency(financeSummary.overdue)} em atraso</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Fluxo de caixa"
              description="Receitas e despesas dos últimos 12 meses"
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
                  ariaLabel="Receitas e despesas mensais, novembro de 2025 a outubro de 2026"
                  labels={monthlyCashFlow.map((m) => m.month)}
                  height={260}
                  formatValue={formatCurrencyCompact}
                  series={[
                    { name: 'Receitas', color: '#B5832F', points: monthlyCashFlow.map((m) => m.revenue) },
                    { name: 'Despesas', color: '#77736B', points: monthlyCashFlow.map((m) => m.expenses), dashed: true },
                  ]}
                />
              ) : (
                <BarChart
                  ariaLabel="Saldo mensal, novembro de 2025 a outubro de 2026"
                  height={260}
                  formatValue={formatCurrencyCompact}
                  data={monthlyCashFlow.map((m, i) => ({
                    label: m.month,
                    value: m.revenue - m.expenses,
                    highlight: i === monthlyCashFlow.length - 1,
                  }))}
                />
              )}
            </Card>

            <Card title="Receita por especialidade" description="Outubro de 2026">
              <div className="flex flex-col items-center gap-5">
                <DonutChart
                  centerLabel="Total"
                  centerValue={formatCurrencyCompact(specialtyTotal)}
                  data={revenueBySpecialty.map((r) => ({
                    label: SPECIALTY_LABEL[r.specialty],
                    value: r.value,
                    color: SPECIALTY_COLOR[r.specialty],
                  }))}
                />
                <ul className="grid w-full grid-cols-1 gap-2 text-[13px] sm:grid-cols-2 xl:grid-cols-1">
                  {revenueBySpecialty.map((r) => (
                    <li key={r.specialty} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SPECIALTY_COLOR[r.specialty] }} />
                      <span className="flex-1 truncate text-graphite-700">{SPECIALTY_LABEL[r.specialty]}</span>
                      <span className="font-semibold tabular-nums text-graphite-900">{formatCurrency(r.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Formas de pagamento" description="Recebido em outubro">
              <HorizontalBarList
                formatValue={formatCurrency}
                data={revenueByPaymentMethod.map((p) => ({
                  label: PAYMENT_METHOD_LABEL[p.method],
                  value: p.value,
                  color: PAYMENT_METHOD_COLOR[p.method],
                }))}
              />
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
              <DataTable<FinancialEntry>
                caption="Movimentações recentes de outubro de 2026"
                columns={columns.filter((c) => c.key !== 'due' && c.key !== 'actions')}
                rows={[...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)}
                rowKey={(r) => r.id}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile icon={ArrowUpCircle} label="Receitas lançadas" value={sumBy(entries, 'receita')} />
            <SummaryTile icon={ArrowDownCircle} label="Despesas lançadas" value={sumBy(entries, 'despesa')} />
            <SummaryTile icon={HandCoins} label="Repasses do mês" value={sumBy(entries, 'repasse')} />
          </div>
        </>
      )}

      {tab !== 'visao' && (
        <Card padding="none">
          <div className="flex flex-col gap-4 border-b border-graphite-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <SearchInput
                aria-label="Buscar lançamentos"
                placeholder="Buscar por descrição, paciente ou profissional"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
              {statusChips.map((c) => (
                <FilterChip key={c.value} label={c.label} active={statusFilter === c.value} onClick={() => setStatusFilter(c.value)} />
              ))}
            </div>
          </div>
          <DataTable<FinancialEntry>
            caption="Lançamentos financeiros"
            columns={columns}
            rows={tabRows}
            rowKey={(r) => r.id}
            empty={
              <div className="py-10 text-center text-[14px] text-graphite-500">
                Nenhum lançamento encontrado com os filtros atuais.
              </div>
            }
          />
          <div className="flex flex-col gap-1 border-t border-graphite-100 p-4 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-graphite-500">
              {tabRows.length} {tabRows.length === 1 ? 'lançamento' : 'lançamentos'}
            </span>
            <span className="text-graphite-700">
              Total filtrado: <strong className="tabular-nums text-graphite-900">{formatCurrency(tabTotal)}</strong>
            </span>
          </div>
        </Card>
      )}

      <p className="text-[12px] text-graphite-500">Ambiente de demonstração — todos os valores são fictícios.</p>

      <NewEntryModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSave={handleSave}
        defaultType={tab === 'despesas' ? 'despesa' : tab === 'repasses' ? 'repasse' : 'receita'}
      />
      <RegisterPaymentModal entry={toPay} onClose={() => setToPay(null)} onConfirm={handlePay} />
      <DeleteEntryDialog entry={toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete} />
    </div>
  );
}

function sumBy(entries: FinancialEntry[], type: FinancialEntry['type']): number {
  return entries.filter((e) => e.type === type && e.status !== 'estornado').reduce((s, e) => s + e.amount, 0);
}

function SummaryTile({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 text-gold-600">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="text-[12px] font-semibold text-graphite-500">{label}</span>
        <span className="text-[18px] font-bold tabular-nums text-graphite-900">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}
