import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface PaginationProps {
  /** Página atual (1-based). */
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
  /** Total de registros (mostra "N registros"). */
  total?: number;
  className?: string;
}

function pageList(page: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= count - 2) [count - 1, count - 2, count - 3].forEach((n) => set.add(n));
  const sorted = Array.from(set)
    .filter((n) => n >= 1 && n <= count)
    .sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

const btn =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-sm border px-2 text-body-sm font-bold transition-colors focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-gold-500 disabled:cursor-not-allowed disabled:opacity-50';

/** Paginação numérica com reticências; em telas pequenas mostra só "Página X de Y". */
export function Pagination({ page, pageCount, onChange, total, className }: PaginationProps) {
  const count = Math.max(1, pageCount);
  return (
    <nav aria-label="Paginação" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-body-sm text-graphite-500">
        {total !== undefined && (
          <>
            <span className="font-bold tabular-nums text-graphite-800">{total.toLocaleString('pt-BR')}</span>{' '}
            {total === 1 ? 'registro' : 'registros'} ·{' '}
          </>
        )}
        Página <span className="font-bold tabular-nums text-graphite-800">{page}</span> de {count}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(btn, 'border-graphite-200 bg-white text-graphite-700 hover:bg-graphite-50')}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <ul className="hidden items-center gap-1 sm:flex">
          {pageList(page, count).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-graphite-400">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  aria-label={`Página ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => onChange(p)}
                  className={cn(
                    btn,
                    'tabular-nums',
                    p === page
                      ? 'border-gold-600 bg-gold-600 text-white'
                      : 'border-transparent text-graphite-700 hover:bg-graphite-50',
                  )}
                >
                  {p}
                </button>
              </li>
            ),
          )}
        </ul>
        <button
          type="button"
          className={cn(btn, 'border-graphite-200 bg-white text-graphite-700 hover:bg-graphite-50')}
          onClick={() => onChange(page + 1)}
          disabled={page >= count}
          aria-label="Próxima página"
        >
          <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
