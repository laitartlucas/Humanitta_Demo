import { Hourglass, Lock } from 'lucide-react';
import { STATUS_ICON, STATUS_LABEL } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { WEEKDAY_SHORT, formatTime, isSameDay, toDateKey } from '@ds/mocks/clinical';
import type { BlockRequest, PortalAppointment } from '@ds/mocks/portal';
import { getMyBlocks, getMyDaySlots } from '@ds/mocks/portal';

export interface PortalWeekBoardProps {
  professionalId: string;
  days: Date[];
  /** Consultas já filtradas (status). */
  appointments: PortalAppointment[];
  /** Todas as consultas (para calcular livre × ocupado sem efeito do filtro). */
  allAppointments: PortalAppointment[];
  requests: BlockRequest[];
  today: Date;
  onSelectAppointment: (a: PortalAppointment) => void;
  onSelectDay: (d: Date) => void;
}

/**
 * Semana em colunas (Seg–Sáb). 1 coluna no celular, 2 em sm, 3 no tablet e 6 a partir de xl.
 * Cada dia mostra consultas, bloqueios (aprovados/pendentes) e quantos horários seguem livres.
 */
export function PortalWeekBoard({ professionalId, days, appointments, allAppointments, requests, today, onSelectAppointment, onSelectDay }: PortalWeekBoardProps) {
  const blocks = getMyBlocks(professionalId, requests);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {days.map((d) => {
        const key = toDateKey(d);
        const dayAppts = appointments.filter((a) => a.start.startsWith(key)).sort((a, b) => a.start.localeCompare(b.start));
        const slots = getMyDaySlots(professionalId, key, { appointments: allAppointments, requests });
        const free = slots.filter((s) => s.state === 'livre').length;
        const busy = slots.filter((s) => s.state === 'ocupado').length;
        const dayBlocks = blocks.filter((b) => b.date === key);
        const isToday = isSameDay(d, today);
        return (
          <section
            key={key}
            aria-label={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            className={cn('flex min-w-0 flex-col rounded-md border bg-white shadow-sm', isToday ? 'border-gold-300' : 'border-graphite-200')}
          >
            <button
              type="button"
              onClick={() => onSelectDay(d)}
              className="flex items-center gap-3 rounded-t-md border-b border-graphite-100 px-3 py-2.5 text-left hover:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus"
              aria-label={`Abrir ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} na visão de dia`}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[22px] leading-none',
                  isToday ? 'bg-gold-600 text-white' : 'bg-graphite-50 text-graphite-900',
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={cn('text-overline uppercase', isToday ? 'text-gold-600' : 'text-graphite-500')}>
                  {WEEKDAY_SHORT[d.getDay()]}
                  {isToday && ' · hoje'}
                </span>
                <span className="text-caption text-graphite-600">
                  {dayAppts.length} {dayAppts.length === 1 ? 'consulta' : 'consultas'}
                </span>
              </span>
            </button>

            <ul className="flex flex-1 flex-col gap-1.5 p-2">
              {dayBlocks.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xs border px-2 py-1.5 text-caption',
                    b.status === 'aprovada' ? 'hm-striped border-graphite-200 text-graphite-700' : 'border-dashed border-warning/40 bg-warning-bg text-warning',
                  )}
                >
                  {b.status === 'aprovada' ? (
                    <Lock size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                  ) : (
                    <Hourglass size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="tabular-nums">{b.allDay ? 'Dia inteiro' : `${b.start}–${b.end}`}</span> ·{' '}
                    {b.status === 'aprovada' ? 'Bloqueado' : 'Pendente'}
                  </span>
                </li>
              ))}
              {dayAppts.map((a) => {
                const Icon = STATUS_ICON[a.status];
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onSelectAppointment(a)}
                      aria-label={`${formatTime(a.start)}, ${a.patientName}, ${a.service}, ${STATUS_LABEL[a.status]}`}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-xs border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus',
                        a.status === 'em_atendimento' ? 'border-gold-300 bg-gold-50' : 'border-graphite-200 bg-white hover:bg-graphite-50',
                        (a.status === 'cancelada' || a.status === 'faltou') && 'opacity-70',
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-caption">
                        <span className="font-extrabold tabular-nums text-graphite-900">{formatTime(a.start)}</span>
                        <Icon size={12} strokeWidth={2} aria-hidden="true" className="ml-auto shrink-0 text-graphite-500" />
                        <span className="text-[11px] font-semibold text-graphite-500">{STATUS_LABEL[a.status]}</span>
                      </span>
                      <span className={cn('truncate text-body-sm font-bold text-graphite-900', a.status === 'cancelada' && 'line-through')}>
                        {a.patientName}
                      </span>
                      <span className="truncate text-caption font-medium text-graphite-600">{a.service}</span>
                    </button>
                  </li>
                );
              })}
              {dayAppts.length === 0 && dayBlocks.length === 0 && (
                <li className="px-2 py-3 text-center text-caption text-graphite-500">{slots.length ? 'Sem consultas' : 'Sem expediente'}</li>
              )}
            </ul>

            {slots.length > 0 && (
              <p className="flex items-center justify-between gap-2 border-t border-graphite-100 px-3 py-2 text-caption text-graphite-600">
                <span>
                  <span className="font-bold text-success">{free}</span> livres
                </span>
                <span>
                  <span className="font-bold text-graphite-900">{busy}</span> ocupados
                </span>
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
