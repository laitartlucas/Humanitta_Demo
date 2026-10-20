import type { Appointment } from '@ds/mocks/types';
import { AppointmentCard } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { DEMO_NOW, WEEKDAY_SHORT, isSameDay, toDateKey } from '@ds/mocks/clinical';
import { HOURS, HOUR_HEIGHT, heightFor, layoutOverlaps, pad, topFor, weekDays } from '../agendaUtils';

export interface WeekViewProps {
  date: Date;
  appointments: Appointment[];
  onSelectAppointment: (a: Appointment) => void;
  onSlotClick: (dateKey: string, time: string) => void;
  onSelectDay?: (d: Date) => void;
}

export function WeekView({ date, appointments, onSelectAppointment, onSlotClick, onSelectDay }: WeekViewProps) {
  const days = weekDays(date);
  const gridHeight = HOURS.length * HOUR_HEIGHT;
  const nowTop = ((DEMO_NOW.getHours() - HOURS[0]) * 60 + DEMO_NOW.getMinutes()) * (HOUR_HEIGHT / 60);

  return (
    <div className="overflow-x-auto rounded-md border border-graphite-200 bg-white shadow-sm">
      <div className="min-w-[960px]" role="grid" aria-label="Agenda semanal">
        {/* Cabeçalho dos dias */}
        <div className="sticky top-0 z-10 grid grid-cols-[64px_repeat(6,minmax(0,1fr))] border-b border-graphite-200 bg-white" role="row">
          <div role="columnheader" aria-label="Horário" />
          {days.map((d) => {
            const today = isSameDay(d, DEMO_NOW);
            const count = appointments.filter((a) => a.start.startsWith(toDateKey(d))).length;
            return (
              <div key={d.toISOString()} role="columnheader" className="border-l border-graphite-100 px-2 py-3 text-center">
                <button
                  type="button"
                  onClick={() => onSelectDay?.(d)}
                  className="mx-auto flex flex-col items-center gap-0.5 rounded-sm px-3 py-1 hover:bg-graphite-50 focus-visible:shadow-focus focus-visible:outline-none"
                  aria-label={`Ver ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} — ${count} agendamentos`}
                >
                  <span className={cn('text-overline uppercase tracking-[0.08em]', today ? 'text-gold-600' : 'text-graphite-500')}>
                    {WEEKDAY_SHORT[d.getDay()]}
                  </span>
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full font-display text-2xl leading-none',
                      today ? 'bg-gold-600 text-white' : 'text-graphite-900',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <span className="text-xs text-graphite-500">{count} {count === 1 ? 'consulta' : 'consultas'}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Grade */}
        <div className="grid grid-cols-[64px_repeat(6,minmax(0,1fr))]">
          <div className="relative" style={{ height: gridHeight }} aria-hidden="true">
            {HOURS.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-graphite-500"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {i === 0 ? '' : `${pad(h)}:00`}
              </span>
            ))}
          </div>

          {days.map((d) => {
            const key = toDateKey(d);
            const dayAppts = appointments.filter((a) => a.start.startsWith(key));
            const laid = layoutOverlaps(dayAppts);
            const today = isSameDay(d, DEMO_NOW);
            return (
              <div
                key={key}
                role="gridcell"
                className={cn('relative border-l border-graphite-100', today && 'bg-gold-50/40')}
                style={{ height: gridHeight }}
              >
                {HOURS.map((h, i) => (
                  <div key={h} className="absolute inset-x-0" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                    {[0, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onSlotClick(key, `${pad(h)}:${pad(m)}`)}
                        className={cn(
                          'block h-1/2 w-full hover:bg-gold-50 focus-visible:bg-gold-50 focus-visible:outline-none',
                          m === 0 ? 'border-t border-graphite-100' : 'border-t border-dashed border-graphite-100/70',
                        )}
                        aria-label={`Novo agendamento em ${d.toLocaleDateString('pt-BR')} às ${pad(h)}:${pad(m)}`}
                      />
                    ))}
                  </div>
                ))}

                {today && nowTop > 0 && nowTop < gridHeight && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[5] flex items-center" style={{ top: nowTop }}>
                    <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-gold-500 ring-2 ring-white" />
                    <span className="h-0.5 flex-1 bg-gold-500" />
                  </div>
                )}

                {laid.map(({ appt, col, cols }) => (
                  <div
                    key={appt.id}
                    className="absolute z-[6] overflow-hidden px-0.5"
                    style={{
                      top: topFor(appt.start) + 2,
                      height: heightFor(appt.durationMin),
                      // Até 2 sobreposições: colunas lado a lado. Acima disso: cascata legível.
                      left: cols <= 2 ? `${(col / cols) * 100}%` : `${col * 16}px`,
                      width: cols <= 2 ? `${100 / cols}%` : `calc(100% - ${(cols - 1) * 16}px)`,
                      zIndex: 6 + col,
                    }}
                  >
                    <AppointmentCard
                      appointment={appt}
                      variant={appt.durationMin < 40 ? 'compact' : 'block'}
                      dense={appt.durationMin < 75}
                      onClick={() => onSelectAppointment(appt)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
