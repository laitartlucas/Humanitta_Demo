import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface MiniCalendarProps {
  /** Qualquer data dentro do mês exibido. */
  month: Date;
  selected?: Date;
  onSelect?: (d: Date) => void;
  /** Dias do mês (1–31) com marcador de consultas. */
  markedDays?: number[];
  /** Quando presente, mostra botões de mês anterior/próximo. */
  onMonthChange?: (d: Date) => void;
  /** Data considerada "hoje" (padrão: new Date()). */
  today?: Date;
  className?: string;
}

export const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
export const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEK_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function sameDay(a?: Date, b?: Date): boolean {
  return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

/** Calendário mensal compacto (semana começa no domingo). */
export function MiniCalendar({ month, selected, onSelect, markedDays = [], onMonthChange, today = new Date(), className }: MiniCalendarProps) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const marked = new Set(markedDays);
  const title = `${MONTHS_PT[m].charAt(0).toUpperCase()}${MONTHS_PT[m].slice(1)} de ${y}`;

  return (
    <div className={cn('w-full max-w-[320px] select-none', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="px-1 text-body font-bold text-graphite-900" aria-live="polite">
          {title}
        </h3>
        {onMonthChange && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => onMonthChange(new Date(y, m - 1, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900 focus-visible:outline-none focus-visible:shadow-focus"
            >
              <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => onMonthChange(new Date(y, m + 1, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900 focus-visible:outline-none focus-visible:shadow-focus"
            >
              <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <table className="w-full table-fixed border-collapse" aria-label={title}>
        <thead>
          <tr>
            {WEEK_SHORT.map((w, i) => (
              <th key={i} scope="col" abbr={WEEKDAYS_PT[i]} className="h-8 text-center text-[11px] font-bold text-graphite-500">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (day === null) return <td key={di} />;
                const date = new Date(y, m, day);
                const isSel = sameDay(date, selected);
                const isToday = sameDay(date, today);
                const has = marked.has(day);
                return (
                  <td key={di} className="p-0.5 text-center">
                    <button
                      type="button"
                      onClick={onSelect ? () => onSelect(date) : undefined}
                      disabled={!onSelect}
                      aria-pressed={isSel}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${day} de ${MONTHS_PT[m]}${has ? ', com consultas' : ''}`}
                      className={cn(
                        'relative mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-body-sm font-semibold tabular-nums transition-colors',
                        'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-default',
                        isSel
                          ? 'bg-gold-600 font-bold text-white'
                          : isToday
                            ? 'text-gold-700 ring-1 ring-inset ring-gold-300 hover:bg-gold-50'
                            : 'text-graphite-800 enabled:hover:bg-graphite-50',
                      )}
                    >
                      {day}
                      {has && (
                        <span
                          aria-hidden="true"
                          className={cn('absolute bottom-1 h-1 w-1 rounded-full', isSel ? 'bg-white' : 'bg-gold-500')}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
