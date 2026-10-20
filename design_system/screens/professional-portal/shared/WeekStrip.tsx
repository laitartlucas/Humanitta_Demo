import { Hourglass, Lock } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { WEEKDAY_SHORT, isSameDay, toDateKey } from '@ds/mocks/clinical';
import type { Professional } from '@core';
import type { BlockRequest, PortalAppointment } from '@ds/mocks/portal';
import { daySlots } from './portalData';

export interface WeekStripProps {
  /** Profissional dono da agenda (grade de horários vem do cadastro). */
  professional: Pick<Professional, 'id' | 'workingHours'> | undefined;
  days: Date[];
  appointments: PortalAppointment[];
  requests?: BlockRequest[];
  today: Date;
  selected?: Date;
  onSelect?: (d: Date) => void;
  className?: string;
}

/**
 * Semana compacta: um botão por dia com nº de consultas, ocupação (barra + %) e marcadores
 * de bloqueio aprovado / pendente. Grade 3×2 no celular, 6 colunas a partir de sm.
 */
export function WeekStrip({ professional, days, appointments, requests, today, selected, onSelect, className }: WeekStripProps) {
  return (
    <ul className={cn('grid grid-cols-3 gap-2 sm:grid-cols-6', className)} aria-label="Resumo da semana">
      {days.map((d) => {
        const key = toDateKey(d);
        const dayAppts = appointments.filter((a) => a.start.startsWith(key) && a.status !== 'cancelada');
        const slots = daySlots(professional, key, appointments, requests);
        const workable = slots.filter((s) => s.state !== 'intervalo');
        const busy = workable.filter((s) => s.state === 'ocupado').length;
        const pct = workable.length ? Math.round((busy / workable.length) * 100) : 0;
        const free = workable.filter((s) => s.state === 'livre').length;
        const hasBlock = slots.some((s) => s.state === 'bloqueado');
        const hasPending = slots.some((s) => s.state === 'pendente');
        const isToday = isSameDay(d, today);
        const isSel = selected ? isSameDay(d, selected) : false;
        const label = `${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${dayAppts.length} consultas, ${free} horários livres, ocupação ${pct}%${hasBlock ? ', com bloqueio' : ''}${hasPending ? ', com bloqueio pendente' : ''}`;
        const inner = (
          <>
            <span className={cn('text-overline uppercase', isToday ? 'text-gold-600' : 'text-graphite-500')}>{WEEKDAY_SHORT[d.getDay()]}</span>
            <span className="font-display text-[26px] leading-none text-graphite-900">{d.getDate()}</span>
            <span className="text-caption text-graphite-600">
              {dayAppts.length} {dayAppts.length === 1 ? 'consulta' : 'consultas'}
            </span>
            <span aria-hidden="true" className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-graphite-100">
              <span className="block h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="flex h-4 items-center gap-1 text-[11px] font-semibold text-graphite-500">
              {pct}%
              {hasBlock && <Lock size={11} strokeWidth={2} aria-hidden="true" />}
              {hasPending && <Hourglass size={11} strokeWidth={2} aria-hidden="true" className="text-warning" />}
            </span>
          </>
        );
        const cls = cn(
          'flex w-full flex-col items-center gap-1 rounded-sm border px-2 py-2.5 text-center',
          isSel ? 'border-gold-500 bg-gold-50' : isToday ? 'border-gold-200 bg-white' : 'border-graphite-200 bg-white',
        );
        return (
          <li key={key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-pressed={isSel}
                aria-label={label}
                className={cn(cls, 'transition-colors hover:border-gold-300 focus-visible:outline-none focus-visible:shadow-focus')}
              >
                {inner}
              </button>
            ) : (
              <div className={cls} aria-label={label} role="group">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
