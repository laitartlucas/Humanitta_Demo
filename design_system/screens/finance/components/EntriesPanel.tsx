import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { CheckCircle2, Eye, FilterX, MoreHorizontal, Pencil, ReceiptText, Trash2, Undo2 } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  DropdownMenu,
  EmptyState,
  FilterChip,
  IconButton,
  Pagination,
  PaymentStatusBadge,
  SearchInput,
  Select,
  type DataTableColumn,
  type DropdownMenuItem,
} from '@ds/components';
import type { PaymentMethod, PaymentStatus, Professional } from '@core';
import { FINANCE_CATEGORIES, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatCurrency, formatDateBR } from '@ds/mocks/business';
import { SORT_LABEL, canTransition, fromCents, sumCents, type FinanceRow, type SortKey } from '@modules/finance/domain';

export type ListMode = 'receitas' | 'despesas' | 'receber' | 'repasses' | 'pagamentos';

/** Filtros de interface da lista (estado local da tela). */
export interface ListFilters {
  query: string;
  status: PaymentStatus | 'todos';
  category: string;
  professionalId: string;
  method: PaymentMethod | '';
  sort: SortKey;
}

export const EMPTY_FILTERS: ListFilters = { query: '', status: 'todos', category: '', professionalId: '', method: '', sort: 'data_desc' };

export interface EntriesPanelProps {
  mode: ListMode;
  /** Linhas já filtradas pela tela (período + filtros). */
  rows: FinanceRow[];
  filters: ListFilters;
  onFiltersChange: (f: ListFilters) => void;
  professionals: Professional[];
  /** O perfil pode escrever neste tipo de lançamento? */
  canWrite: (row: FinanceRow) => boolean;
  /** O perfil pode registrar baixas (financeiro ≥ editar)? */
  canPay: boolean;
  onOpen: (row: FinanceRow) => void;
  onPay: (row: FinanceRow) => void;
  onEdit: (row: FinanceRow) => void;
  onReverse: (row: FinanceRow) => void;
  onDelete: (row: FinanceRow) => void;
}

const PAGE_SIZE = 10;

const TYPE_LABEL: Record<FinanceRow['type'], string> = { receita: 'Receita', despesa: 'Despesa', repasse: 'Repasse' };

const STATUS_BY_MODE: Record<ListMode, PaymentStatus[]> = {
  receitas: ['pago', 'pendente', 'atrasado', 'estornado'],
  despesas: ['pago', 'pendente', 'atrasado', 'estornado'],
  repasses: ['pago', 'pendente', 'atrasado', 'estornado'],
  receber: ['pendente', 'atrasado'],
  pagamentos: [],
};

const CATEGORIES_BY_MODE: Record<ListMode, readonly string[]> = {
  receitas: FINANCE_CATEGORIES.receita,
  receber: FINANCE_CATEGORIES.receita,
  despesas: FINANCE_CATEGORIES.despesa,
  repasses: [],
  pagamentos: [...FINANCE_CATEGORIES.receita, ...FINANCE_CATEGORIES.despesa, ...FINANCE_CATEGORIES.repasse],
};

const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

export function EntriesPanel({
  mode,
  rows,
  filters,
  onFiltersChange,
  professionals,
  canWrite,
  canPay,
  onOpen,
  onPay,
  onEdit,
  onReverse,
  onDelete,
}: EntriesPanelProps) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const filterKey = JSON.stringify([mode, filters]);

  useEffect(() => setPage(1), [filterKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  const total = fromCents(sumCents(rows.filter((e) => e.effective !== 'estornado')));
  const set = <K extends keyof ListFilters>(key: K, value: ListFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const dirty = JSON.stringify(filters) !== JSON.stringify({ ...EMPTY_FILTERS, sort: filters.sort });
  const showProfessional = mode !== 'despesas';
  const categories = CATEGORIES_BY_MODE[mode];

  const actionsFor = (r: FinanceRow): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [{ label: 'Ver detalhes', icon: Eye, onSelect: () => onOpen(r) }];
    if (!canWrite(r)) return items;
    if (canPay && canTransition(r.status, 'pagar')) items.push({ label: r.type === 'receita' ? 'Registrar recebimento' : 'Registrar pagamento', icon: CheckCircle2, onSelect: () => onPay(r) });
    if (canTransition(r.status, 'editar')) items.push({ label: 'Editar', icon: Pencil, onSelect: () => onEdit(r) });
    if (canTransition(r.status, 'estornar')) items.push({ label: r.status === 'pago' ? 'Estornar' : 'Cancelar lançamento', icon: Undo2, onSelect: () => onReverse(r), danger: true });
    if (canTransition(r.status, 'excluir')) items.push({ label: 'Excluir', icon: Trash2, onSelect: () => onDelete(r), danger: true });
    return items;
  };

  const columns: DataTableColumn<FinanceRow>[] = [
    {
      key: 'date',
      header: mode === 'pagamentos' ? 'Pago em' : 'Data',
      width: '108px',
      render: (r) => <span className="tabular-nums text-graphite-700">{formatDateBR(mode === 'pagamentos' ? (r.paidAt ?? r.date) : r.date)}</span>,
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (r) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-graphite-900">{r.description}</span>
          <span className="truncate text-[12px] text-graphite-500">
            {TYPE_LABEL[r.type]} · {r.category}
            {r.patientName ? ` · ${r.patientName}` : ''}
            {r.professionalName && r.type !== 'despesa' ? ` · ${r.professionalName}` : ''}
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
    {
      key: 'due',
      header: 'Vencimento',
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums text-graphite-700">{r.dueDate ? formatDateBR(r.dueDate) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Situação',
      render: (r) => <PaymentStatusBadge status={r.effective} />,
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (r) => (
        <span
          className={`font-semibold tabular-nums ${
            r.effective === 'estornado' ? 'text-graphite-400 line-through' : r.type === 'receita' ? 'text-success' : 'text-graphite-900'
          }`}
        >
          {r.type === 'receita' ? '+ ' : '− '}
          {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      width: '104px',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={stop} onKeyDown={stop}>
          {canPay && canWrite(r) && canTransition(r.status, 'pagar') && (
            <IconButton icon={CheckCircle2} label={`Registrar pagamento de ${r.description}`} size="sm" onClick={() => onPay(r)} />
          )}
          <DropdownMenu
            label={`Mais ações para ${r.description}`}
            align="end"
            trigger={<IconButton icon={MoreHorizontal} label={`Mais ações para ${r.description}`} size="sm" />}
            items={actionsFor(r)}
          />
        </div>
      ),
    },
  ];

  const statusChips: { value: ListFilters['status']; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    ...STATUS_BY_MODE[mode].map((s) => ({ value: s, label: PAYMENT_STATUS_LABEL[s] })),
  ];

  return (
    <Card padding="none">
      <div className="flex flex-col gap-4 border-b border-graphite-100 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              aria-label="Buscar lançamentos"
              placeholder="Buscar por descrição, paciente ou profissional"
              value={filters.query}
              onChange={(e) => set('query', e.target.value)}
            />
          </div>
          {statusChips.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
              {statusChips.map((c) => (
                <FilterChip key={c.value} label={c.label} active={filters.status === c.value} onClick={() => set('status', c.value)} />
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Filtros avançados">
          {categories.length > 0 && (
            <Select
              aria-label="Categoria"
              controlSize="sm"
              options={[{ value: '', label: 'Todas as categorias' }, ...categories.map((c) => ({ value: c, label: c }))]}
              value={filters.category}
              onChange={(e) => set('category', e.target.value)}
            />
          )}
          {showProfessional && (
            <Select
              aria-label="Profissional"
              controlSize="sm"
              options={[{ value: '', label: 'Todos os profissionais' }, ...professionals.map((p) => ({ value: p.id, label: p.name }))]}
              value={filters.professionalId}
              onChange={(e) => set('professionalId', e.target.value)}
            />
          )}
          <Select
            aria-label="Forma de pagamento"
            controlSize="sm"
            options={[
              { value: '', label: 'Todas as formas' },
              ...(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] })),
            ]}
            value={filters.method}
            onChange={(e) => set('method', e.target.value as PaymentMethod | '')}
          />
          {mode !== 'pagamentos' && (
            <Select
              aria-label="Ordenar por"
              controlSize="sm"
              options={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ value: k, label: SORT_LABEL[k] }))}
              value={filters.sort}
              onChange={(e) => set('sort', e.target.value as SortKey)}
            />
          )}
        </div>
        {dirty && (
          <div>
            <Button variant="ghost" size="sm" leftIcon={FilterX} onClick={() => onFiltersChange({ ...EMPTY_FILTERS, sort: filters.sort })}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
      <DataTable<FinanceRow>
        caption={mode === 'pagamentos' ? 'Histórico de pagamentos' : 'Lançamentos financeiros'}
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        onRowClick={onOpen}
        empty={
          <EmptyState
            compact
            icon={ReceiptText}
            title={mode === 'pagamentos' ? 'Nenhum pagamento no período' : 'Nenhum lançamento encontrado'}
            description="Ajuste o período ou os filtros para ver outros lançamentos."
          />
        }
      />
      {pageCount > 1 && (
        <div className="border-t border-graphite-100 px-4 py-3 sm:px-5">
          <Pagination page={page} pageCount={pageCount} onChange={setPage} total={rows.length} />
        </div>
      )}
      <div className="flex flex-col gap-1 border-t border-graphite-100 p-4 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="text-graphite-500">
          {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}
        </span>
        <span className="text-graphite-700">
          Total filtrado (sem estornos): <strong className="tabular-nums text-graphite-900">{formatCurrency(total)}</strong>
        </span>
      </div>
    </Card>
  );
}
