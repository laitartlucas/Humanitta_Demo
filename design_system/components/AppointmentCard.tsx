import { Clock, DoorOpen, Sparkles } from 'lucide-react';
import type { Appointment } from '@ds/mocks/types';
import { cn } from '@ds/foundations/cn';
import { Avatar } from './Avatar';
import { SPECIALTY_COLOR, SPECIALTY_LABEL } from './SpecialtyTag';
import { STATUS_ICON, STATUS_LABEL, StatusBadge } from './StatusBadge';

export interface AppointmentCardProps {
  appointment: Appointment;
  variant?: 'block' | 'row' | 'compact';
  onClick?: () => void;
  selected?: boolean;
  /** Bloco baixo (consultas curtas na grade): mostra só paciente e horário. */
  dense?: boolean;
  className?: string;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "09:00" a partir do ISO. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return hhmm(d);
}

/** "Sala 3" a partir de roomId ("sala-3", "room-3", "3"). */
export function roomLabel(roomId: string): string {
  const m = roomId.match(/(\d+)/);
  return m ? `Sala ${m[1]}` : roomId;
}

function endTime(iso: string, durationMin: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return hhmm(new Date(d.getTime() + durationMin * 60000));
}

/**
 * Consulta na agenda.
 * - block: bloco na grade (fundo levemente tingido pela especialidade — sem borda-esquerda colorida)
 * - row: linha de lista (avatar, especialidade, profissional, sala, status)
 * - compact: uma linha (mês / mini-listas)
 */
export function AppointmentCard({ appointment: a, variant = 'row', onClick, selected = false, dense = false, className }: AppointmentCardProps) {
  const color = SPECIALTY_COLOR[a.specialty];
  const start = formatTime(a.start);
  const end = endTime(a.start, a.durationMin);
  const label = `${start}–${end}, ${a.patientName}, ${SPECIALTY_LABEL[a.specialty]} com ${a.professionalName}, ${roomLabel(a.roomId)}, ${STATUS_LABEL[a.status]}`;
  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'div';
  const base = cn(
    'w-full text-left transition-[background-color,box-shadow,border-color] duration-150',
    interactive && 'cursor-pointer focus-visible:outline-none focus-visible:shadow-focus',
    selected && 'ring-2 ring-gold-500',
    className,
  );
  const muted = a.status === 'cancelada' || a.status === 'faltou';

  if (variant === 'compact') {
    const StatusIcon = STATUS_ICON[a.status];
    return (
      <Tag
        type={interactive ? 'button' : undefined}
        onClick={onClick}
        aria-label={interactive ? label : undefined}
        className={cn(base, 'flex h-8 items-center gap-2 rounded-xs border border-graphite-200 bg-white px-2 text-caption hover:bg-graphite-50', muted && 'opacity-70')}
      >
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-extrabold tabular-nums text-graphite-900">{start}</span>
        <span className={cn('min-w-0 flex-1 truncate font-semibold text-graphite-700', a.status === 'cancelada' && 'line-through')}>
          {a.patientName}
        </span>
        <StatusIcon size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-graphite-500" />
        {!interactive && <span className="sr-only">{STATUS_LABEL[a.status]}</span>}
      </Tag>
    );
  }

  if (variant === 'block') {
    return (
      <Tag
        type={interactive ? 'button' : undefined}
        onClick={onClick}
        aria-label={interactive ? label : undefined}
        className={cn(
          base,
          'flex h-full flex-col justify-start gap-0.5 overflow-hidden rounded-sm border border-t-[3px] px-2 py-1.5',
          interactive && 'hover:shadow-md',
          muted && 'opacity-75',
        )}
        // Tinta da especialidade sobre branco opaco (cards sobrepostos continuam legíveis).
        style={{ background: `linear-gradient(${color}14, ${color}14), #FFFFFF`, borderColor: `${color}40`, borderTopColor: color }}
      >
        <span className={cn('truncate text-body-sm font-bold leading-tight text-graphite-900', a.status === 'cancelada' && 'line-through')}>
          {a.patientName}
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap text-[11px] font-bold tabular-nums text-graphite-600">
          <span className="truncate">{start}–{end}</span>
          {a.channel === 'assistente_ia' && (
            <Sparkles size={12} strokeWidth={2} aria-label="Agendado pelo Assistente IA" className="ml-auto shrink-0 text-ai" />
          )}
        </span>
        {!dense && <span className="truncate text-caption font-medium text-graphite-600">{a.service}</span>}
        {!dense && (
          <span className="mt-auto pt-1">
            <StatusBadge status={a.status} size="sm" />
          </span>
        )}
      </Tag>
    );
  }

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={interactive ? label : undefined}
      className={cn(
        base,
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-graphite-200 bg-white px-4 py-3',
        interactive && 'hover:border-graphite-300 hover:bg-graphite-50',
      )}
    >
      <span className="flex w-14 shrink-0 flex-col">
        <span className="font-extrabold tabular-nums text-graphite-900">{start}</span>
        <span className="text-caption font-medium text-graphite-500">{a.durationMin} min</span>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={a.patientName} size="sm" tone="neutral" />
        <span className="flex min-w-0 flex-col">
          <span className={cn('truncate font-bold text-graphite-900', a.status === 'cancelada' && 'line-through')}>
            {a.patientName}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate text-caption font-medium text-graphite-600">
            <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {SPECIALTY_LABEL[a.specialty]} · {a.service}
          </span>
        </span>
      </span>
      <span className="hidden min-w-0 flex-col text-body-sm md:flex">
        <span className="truncate font-semibold text-graphite-700">{a.professionalName}</span>
        <span className="inline-flex items-center gap-1 text-caption text-graphite-500">
          <DoorOpen size={12} strokeWidth={2} aria-hidden="true" />
          {roomLabel(a.roomId)}
          <Clock size={12} strokeWidth={2} aria-hidden="true" className="ml-2" />
          até {end}
        </span>
      </span>
      <StatusBadge status={a.status} />
    </Tag>
  );
}
