import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@ds/foundations/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  hideBelow?: 'md' | 'lg';
  /** Esconde o texto do cabeçalho visualmente (ex.: coluna de ações). */
  srOnlyHeader?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
  /** Destaca linhas (ex.: selecionada). */
  isRowSelected?: (row: T) => boolean;
  /** Largura mínima da tabela antes de rolar horizontalmente (padrão 640px). */
  minWidth?: number;
  className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const HIDE = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;

function cellValue<T>(row: T, key: string): ReactNode {
  if (row !== null && typeof row === 'object' && key in row) {
    const v = (row as Record<string, unknown>)[key];
    if (typeof v === 'string' || typeof v === 'number') return v;
  }
  return null;
}

/**
 * Tabela de dados: cabeçalho graphite-50 uppercase, linhas 56px, hover graphite-50, sem zebra.
 * Linhas clicáveis são focáveis e ativam com Enter/Espaço.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  empty,
  caption,
  isRowSelected,
  minWidth = 640,
  className,
}: DataTableProps<T>) {
  const last = columns.length - 1;
  const pad = (i: number) => cn(i === 0 ? 'pl-6 pr-3' : i === last ? 'pl-3 pr-6' : 'px-3');

  function onKey(e: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-body" style={{ minWidth }} aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-graphite-50">
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  'h-10 whitespace-nowrap text-[11px] font-bold uppercase tracking-[.06em] text-graphite-600',
                  ALIGN[c.align ?? 'left'],
                  pad(i),
                  c.hideBelow && HIDE[c.hideBelow],
                )}
              >
                {c.srOnlyHeader ? <span className="sr-only">{c.header}</span> : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }, (_, r) => (
              <tr key={`sk-${r}`} className="h-14 border-t border-graphite-100">
                {columns.map((c, i) => (
                  <td key={c.key} className={cn(pad(i), c.hideBelow && HIDE[c.hideBelow])}>
                    <span aria-hidden="true" className="hm-shimmer block h-3.5 w-[70%] rounded-xs" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr className="border-t border-graphite-100">
              <td colSpan={columns.length} className="px-6 py-10 text-center text-body text-graphite-500">
                {empty ?? 'Nenhum registro encontrado.'}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => {
              const selected = isRowSelected?.(row) ?? false;
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => onKey(e, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  data-selected={selected || undefined}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'h-14 border-t border-graphite-100 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-graphite-50 focus-visible:bg-gold-50 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_#B5832F]',
                    !onRowClick && 'hover:bg-graphite-50',
                    selected && 'bg-gold-50 hover:bg-gold-50',
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn(
                        'py-2 align-middle text-graphite-800',
                        ALIGN[c.align ?? 'left'],
                        c.align === 'right' && 'tabular-nums',
                        pad(i),
                        c.hideBelow && HIDE[c.hideBelow],
                      )}
                    >
                      {c.render ? c.render(row) : cellValue(row, c.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
