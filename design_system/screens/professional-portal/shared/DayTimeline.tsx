import type { ReactNode } from 'react';
import { Coffee, Hourglass, Lock, Plus } from 'lucide-react';
import { StatusBadge } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { formatTime, getRoomName } from '@ds/mocks/clinical';
import type { BlockRequest, PortalAppointment, PortalSlot, PortalSlotState } from '@ds/mocks/portal';
import { timeToMinutes } from '@ds/mocks/portal';
import { endTimeOf } from './portalUtils';

type GapState = Exclude<PortalSlotState, 'ocupado'>;

type TimelineItem =
  | { kind: 'appt'; minute: number; appt: PortalAppointment }
  | { kind: 'gap'; minute: number; state: GapState; start: string; end: string; slots: number; requestId?: string };

export interface DayTimelineProps {
  /** Consultas do dia (inclui canceladas/reagendadas, exibidas esmaecidas). */
  appointments: PortalAppointment[];
  /** Horários do expediente com estado (getMyDaySlots). */
  slots: PortalSlot[];
  /** Solicitações (para mostrar o motivo do bloqueio). */
  requests?: BlockRequest[];
  /** Informe somente quando o dia exibido for hoje: mostra o marcador "Agora". */
  now?: Date;
  onSelectAppointment?: (a: PortalAppointment) => void;
  /** Ação à direita de cada consulta (ex.: botão Iniciar). */
  renderAction?: (a: PortalAppointment) => ReactNode;
  /** Versão enxuta para o dashboard. */
  compact?: boolean;
  className?: string;
}

function minuteOfIso(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function addThirty(time: string): string {
  const m = timeToMinutes(time) + 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function buildItems(appointments: PortalAppointment[], slots: PortalSlot[]): TimelineItem[] {
  const items: TimelineItem[] = appointments.map((a) => ({ kind: 'appt', minute: minuteOfIso(a.start), appt: a }));
  let current: Extract<TimelineItem, { kind: 'gap' }> | null = null;
  slots.forEach((s) => {
    if (s.state === 'ocupado') {
      current = null;
      return;
    }
    if (current && current.state === s.state && current.requestId === s.requestId && current.end === s.time) {
      current.end = addThirty(s.time);
      current.slots += 1;
      return;
    }
    current = { kind: 'gap', minute: timeToMinutes(s.time), state: s.state, start: s.time, end: addThirty(s.time), slots: 1, requestId: s.requestId };
    items.push(current);
  });
  return items.sort((a, b) => a.minute - b.minute || (a.kind === 'appt' ? -1 : 1));
}

const GAP_META: Record<GapState, { title: string; cls: string; icon: typeof Lock | null }> = {
  livre: { title: 'Livre', cls: 'border-dashed border-graphite-300 bg-white text-graphite-600', icon: Plus },
  bloqueado: { title: 'Bloqueado', cls: 'hm-striped border-graphite-200 text-graphite-700', icon: Lock },
  pendente: { title: 'Bloqueio pendente — aguardando aprovação', cls: 'border-dashed border-warning/40 bg-warning-bg text-warning', icon: Hourglass },
  intervalo: { title: 'Intervalo', cls: 'border-graphite-100 bg-graphite-50 text-graphite-500', icon: Coffee },
};

/**
 * Linha do tempo de um dia do profissional: consultas + faixas livres, bloqueadas,
 * pendentes e intervalo. Empilha em uma coluna — funciona igual no celular e no desktop.
 */
export function DayTimeline({ appointments, slots, requests = [], now, onSelectAppointment, renderAction, compact = false, className }: DayTimelineProps) {
  const items = buildItems(appointments, slots);
  const nowMinute = now ? now.getHours() * 60 + now.getMinutes() : -1;
  const nowIndex = now ? items.findIndex((it) => it.minute > nowMinute) : -1;

  if (items.length === 0) {
    return <p className="rounded-md border border-dashed border-graphite-200 p-4 text-body-sm text-graphite-500">Sem expediente neste dia.</p>;
  }

  const nowMarker = now ? (
    <li key="now" className="flex items-center gap-2" aria-label={`Agora, ${formatTime(now)}`}>
      <span className="w-12 shrink-0 text-right text-caption font-bold tabular-nums text-gold-600">{formatTime(now)}</span>
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-gold-500 ring-2 ring-white" />
      <span aria-hidden="true" className="h-0.5 flex-1 bg-gold-500" />
      <span className="text-overline uppercase text-gold-600">Agora</span>
    </li>
  ) : null;

  return (
    <ol className={cn('flex flex-col', compact ? 'gap-2' : 'gap-2.5', className)}>
      {items.map((it, i) => {
        const marker = i === nowIndex ? nowMarker : null;
        if (it.kind === 'gap') {
          const meta = GAP_META[it.state];
          const Icon = meta.icon;
          const req = it.requestId ? requests.find((r) => r.id === it.requestId) : undefined;
          return [
            marker,
            <li key={`gap-${it.start}-${it.state}`} className="flex items-stretch gap-3">
              <span className="w-12 shrink-0 pt-2 text-right text-caption font-semibold tabular-nums text-graphite-500">{it.start}</span>
              <div className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-sm border px-3', compact ? 'min-h-9 py-1.5' : 'min-h-10 py-2', meta.cls)}>
                {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate text-body-sm font-semibold">
                  {meta.title}
                  {req ? ` · ${req.reason}` : ''}
                </span>
                <span className="shrink-0 text-caption tabular-nums">
                  {it.start}–{it.end}
                  {it.state === 'livre' && !compact ? ` · ${it.slots} ${it.slots === 1 ? 'horário' : 'horários'}` : ''}
                </span>
              </div>
            </li>,
          ];
        }
        const a = it.appt;
        const muted = a.status === 'cancelada' || a.status === 'faltou';
        const active = a.status === 'em_atendimento';
        const body = (
          <>
            <span className={cn('block truncate font-bold text-graphite-900', a.status === 'cancelada' && 'line-through')}>{a.patientName}</span>
            <span className="block truncate text-caption font-medium text-graphite-600">
              {a.service}
              {!compact && ` · ${getRoomName(a.roomId)}`}
            </span>
          </>
        );
        return [
          marker,
          <li key={a.id} className="flex items-stretch gap-3">
            <span className="flex w-12 shrink-0 flex-col items-end pt-2.5">
              <span className="text-body-sm font-extrabold tabular-nums text-graphite-900">{formatTime(a.start)}</span>
              <span className="text-[11px] font-semibold tabular-nums text-graphite-500">{endTimeOf(a)}</span>
            </span>
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border px-3 py-2.5',
                active ? 'border-gold-300 bg-gold-50' : 'border-graphite-200 bg-white',
                muted && 'opacity-70',
              )}
            >
              {onSelectAppointment ? (
                <button
                  type="button"
                  onClick={() => onSelectAppointment(a)}
                  className="min-w-0 flex-1 rounded-xs text-left hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                  aria-label={`${formatTime(a.start)}, ${a.patientName}, ${a.service} — ver detalhes`}
                >
                  {body}
                </button>
              ) : (
                <div className="min-w-0 flex-1">{body}</div>
              )}
              <StatusBadge status={a.status} size={compact ? 'sm' : 'md'} />
              {renderAction?.(a)}
            </div>
          </li>,
        ];
      })}
      {nowIndex === -1 && now && nowMinute > (items[items.length - 1]?.minute ?? 0) ? nowMarker : null}
    </ol>
  );
}
