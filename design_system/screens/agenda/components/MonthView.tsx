import type { Appointment } from '@ds/mocks/types';
import { cn } from '@ds/foundations/cn';
import { DEMO_NOW, SPECIALTY_HEX, WEEKDAY_SHORT, formatTime, isSameDay, toDateKey } from '@ds/mocks/clinical';
import { addDays, startOfMonth, startOfWeek } from '../agendaUtils';

export interface MonthViewProps {
  date: Date;
  appointments: Appointment[];
  onSelectDay: (d: Date) => void;
  onSelectAppointment: (a: Appointment) => void;
}

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function MonthView({ date, appointments, onSelectDay, onSelectAppointment }: MonthViewProps) {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="overflow-hidden rounded-md border border-graphite-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-graphite-200 bg-graphite-50">
        {ORDER.map((wd) => (
          <div key={wd} className="px-2 py-2 text-center text-overline uppercase tracking-[0.08em] text-graphite-500">
            {WEEKDAY_SHORT[wd]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const key = toDateKey(d);
          const inMonth = d.getMonth() === first.getMonth();
          const items = appointments.filter((a) => a.start.startsWith(key)).sort((a, b) => a.start.localeCompare(b.start));
          const today = isSameDay(d, DEMO_NOW);
          return (
            <div
              key={key}
              className={cn(
                'flex min-h-[72px] flex-col gap-1 border-b border-l border-graphite-100 p-1.5 md:min-h-[116px] md:p-2',
                !inMonth && 'bg-graphite-50/60',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(d)}
                aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${items.length} agendamentos`}
                className={cn(
                  'flex h-7 w-7 items-center justify-center self-start rounded-full text-sm font-semibold tabular-nums hover:bg-graphite-100 focus-visible:shadow-focus focus-visible:outline-none',
                  today ? 'bg-gold-600 text-white hover:bg-gold-700' : inMonth ? 'text-graphite-900' : 'text-graphite-400',
                )}
              >
                {d.getDate()}
              </button>

              {/* Celular: pontos */}
              {items.length > 0 && (
                <div className="flex flex-wrap gap-0.5 md:hidden" aria-hidden="true">
                  {items.slice(0, 4).map((a) => (
                    <span key={a.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SPECIALTY_HEX[a.specialty] }} />
                  ))}
                </div>
              )}

              {/* Desktop: itens */}
              <ul className="hidden flex-col gap-0.5 md:flex">
                {items.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onSelectAppointment(a)}
                      className={cn(
                        'flex w-full items-center gap-1.5 truncate rounded-xs px-1.5 py-0.5 text-left text-xs hover:bg-graphite-50 focus-visible:shadow-focus focus-visible:outline-none',
                        a.status === 'cancelada' && 'text-graphite-400 line-through',
                      )}
                    >
                      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: SPECIALTY_HEX[a.specialty] }} />
                      <span className="tabular-nums text-graphite-500">{formatTime(a.start)}</span>
                      <span className="truncate font-medium text-graphite-800">{a.patientName}</span>
                    </button>
                  </li>
                ))}
                {items.length > 3 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onSelectDay(d)}
                      className="rounded-xs px-1.5 text-xs font-semibold text-gold-600 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                    >
                      +{items.length - 3} mais
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
