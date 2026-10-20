import { CalendarX2 } from 'lucide-react';
import { DEMO_NOW, type AppointmentRecord, type Professional } from '@core';
import { isBookableMinute, type DayAvailability } from '@modules/agenda/agendaRules';
import { AppointmentCard, Avatar, Button, EmptyState } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { isSameDay, toDateKey } from '@ds/mocks/clinical';
import { HOURS, HOUR_HEIGHT, heightFor, layoutOverlaps, pad, topFor } from '../agendaUtils';
import { STRIPED, UnavailableBlock } from './UnavailableBlock';

export interface DayViewProps {
  date: Date;
  appointments: AppointmentRecord[];
  professionals: Professional[];
  onSelectAppointment: (a: AppointmentRecord) => void;
  /** Ausente = somente visualização (slots não clicáveis). */
  onSlotClick?: (dateKey: string, time: string, professionalId?: string) => void;
  /** Disponibilidade do profissional na data (clínica ∩ expediente, almoço, bloqueios). */
  availability: (professionalId: string, dateKey: string) => DayAvailability;
}

export function DayView({ date, appointments, professionals, onSelectAppointment, onSlotClick, availability }: DayViewProps) {
  const key = toDateKey(date);
  const dayAppts = appointments.filter((a) => a.start.startsWith(key)).sort((a, b) => a.start.localeCompare(b.start));
  const columns = professionals
    .map((p) => ({ p, day: availability(p.id, key) }))
    .filter(({ p, day }) => day.window !== null || dayAppts.some((a) => a.professionalId === p.id));
  const gridHeight = HOURS.length * HOUR_HEIGHT;
  const today = isSameDay(date, DEMO_NOW);
  const nowTop = ((DEMO_NOW.getHours() - HOURS[0]) * 60 + DEMO_NOW.getMinutes()) * (HOUR_HEIGHT / 60);

  if (columns.length === 0) {
    return (
      <div className="rounded-md border border-graphite-200 bg-white p-8 shadow-sm">
        <EmptyState
          icon={CalendarX2}
          title="Sem expediente neste dia"
          description="Nenhum profissional atende nesta data com os filtros atuais."
        />
      </div>
    );
  }

  return (
    <>
      {/* Celular: lista cronológica */}
      <div className="flex flex-col gap-2 md:hidden">
        {dayAppts.length === 0 ? (
          <div className="rounded-md border border-graphite-200 bg-white p-6">
            <EmptyState
              icon={CalendarX2}
              title="Dia livre"
              description="Nenhum agendamento para esta data."
              action={
                onSlotClick && (
                  <Button size="sm" onClick={() => onSlotClick(key, '09:00')}>
                    Agendar horário
                  </Button>
                )
              }
            />
          </div>
        ) : (
          dayAppts.map((a) => (
            <AppointmentCard key={a.id} appointment={a} variant="row" onClick={() => onSelectAppointment(a)} />
          ))
        )}
      </div>

      {/* Tablet/desktop: colunas por profissional */}
      <div className="hidden overflow-x-auto rounded-md border border-graphite-200 bg-white shadow-sm md:block">
        <div style={{ minWidth: 64 + columns.length * 168 }} role="grid" aria-label={`Agenda do dia ${date.toLocaleDateString('pt-BR')}`}>
          <div
            className="sticky top-0 z-10 grid border-b border-graphite-200 bg-white"
            style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0, 1fr))` }}
            role="row"
          >
            <div role="columnheader" aria-label="Horário" />
            {columns.map(({ p }) => (
              <div key={p.id} role="columnheader" className="flex items-center gap-2 border-l border-graphite-100 px-3 py-3">
                <Avatar name={p.name} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-graphite-900">{p.name}</div>
                  <div className="truncate text-xs text-graphite-500">
                    {dayAppts.filter((a) => a.professionalId === p.id).length} agendamentos
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0, 1fr))` }}>
            <div className="relative" style={{ height: gridHeight }} aria-hidden="true">
              {HOURS.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-graphite-500" style={{ top: i * HOUR_HEIGHT }}>
                  {i === 0 ? '' : `${pad(h)}:00`}
                </span>
              ))}
            </div>

            {columns.map(({ p, day }) => {
              const laid = layoutOverlaps(dayAppts.filter((a) => a.professionalId === p.id));
              return (
                <div key={p.id} role="gridcell" className="relative border-l border-graphite-100" style={{ height: gridHeight }}>
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute inset-x-0" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                      {[0, 30].map((m) =>
                        isBookableMinute(day, h * 60 + m) && onSlotClick ? (
                          <button
                            key={m}
                            type="button"
                            onClick={() => onSlotClick(key, `${pad(h)}:${pad(m)}`, p.id)}
                            className={cn(
                              'block h-1/2 w-full hover:bg-gold-50 focus-visible:bg-gold-50 focus-visible:outline-none',
                              m === 0 ? 'border-t border-graphite-100' : 'border-t border-dashed border-graphite-100/70',
                            )}
                            aria-label={`Novo agendamento com ${p.name} às ${pad(h)}:${pad(m)}`}
                          />
                        ) : (
                          <div
                            key={m}
                            aria-hidden="true"
                            className={cn(
                              'h-1/2 w-full',
                              isBookableMinute(day, h * 60 + m)
                                ? m === 0
                                  ? 'border-t border-graphite-100'
                                  : 'border-t border-dashed border-graphite-100/70'
                                : cn(STRIPED, m === 0 && 'border-t border-graphite-100'),
                            )}
                          />
                        ),
                      )}
                    </div>
                  ))}

                  {day.unavailable.map((u) => (
                    <UnavailableBlock key={`${u.kind}-${u.start}`} range={u} />
                  ))}
                  {day.pending.map((u) => (
                    <UnavailableBlock key={`pend-${u.start}`} range={{ ...u, kind: 'pendente' }} />
                  ))}

                  {today && nowTop > 0 && nowTop < gridHeight && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-gold-500" style={{ top: nowTop }} />
                  )}

                  {laid.map(({ appt, col, cols }) => (
                    <div
                      key={appt.id}
                      className="absolute z-[6] overflow-hidden px-1"
                      style={{
                        top: topFor(appt.start) + 2,
                        height: heightFor(appt.durationMin),
                        left: `${(col / cols) * 100}%`,
                        width: `${100 / cols}%`,
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
    </>
  );
}
