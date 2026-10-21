import { CalendarCheck, CalendarClock, CheckCheck, CircleCheckBig, LogIn, Play, UserX, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { CHANNEL_NAMES, formatDate, formatTime } from '@ds/mocks/clinical';
import { minutesBetween, type AttendanceView } from '@modules/attendances/model';

export interface TimelineStep {
  id: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  done: boolean;
  tone?: 'danger' | 'warning';
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Duração legível; o relógio da demo é fixo, então início e fim no mesmo minuto viram "< 1 min". */
export function durationLabel(min: number): string {
  return min < 1 ? 'menos de 1 minuto' : plural(min, 'minuto', 'minutos');
}

/** Histórico de mudanças de etapa, derivado do agendamento (Agente 02) e do atendimento (core). */
export function timelineFor(v: AttendanceView): TimelineStep[] {
  const a = v.appointment;
  const created = a.createdAt ? ` · registrada em ${formatDate(a.createdAt, { day: '2-digit', month: '2-digit' })} ${formatTime(a.createdAt)}` : '';
  const steps: TimelineStep[] = [
    {
      id: 'agendado',
      label: 'Consulta agendada',
      meta: `${a.channel ? `Origem: ${CHANNEL_NAMES[a.channel]}` : 'Origem não informada'} · ${formatTime(a.start)} reservado${created}`,
      icon: CalendarCheck,
      done: true,
    },
  ];
  if (v.rescheduledFrom) {
    steps.push({ id: 'reagendada-de', label: 'Remarcada de outro horário', meta: 'Este horário substitui uma consulta reagendada.', icon: CalendarClock, done: true });
  }
  if (v.stage === 'cancelado') {
    steps.push({ id: 'cancelada', label: 'Consulta cancelada', meta: a.cancelReason ?? a.notes ?? 'Cancelamento registrado na agenda.', icon: XCircle, done: true, tone: 'danger' });
    return steps;
  }
  if (v.stage === 'reagendado') {
    steps.push({ id: 'reagendada', label: 'Consulta reagendada', meta: a.notes ?? 'Um novo horário foi marcado na agenda.', icon: CalendarClock, done: true, tone: 'warning' });
    return steps;
  }
  if (v.stage === 'faltou') {
    steps.push({ id: 'faltou', label: 'Paciente não compareceu', meta: 'Falta registrada.', icon: UserX, done: true, tone: 'warning' });
    return steps;
  }
  const confirmed = a.status !== 'agendada' || Boolean(v.checkInAt);
  steps.push(
    {
      id: 'confirmada',
      label: 'Presença confirmada',
      meta: !confirmed ? 'Aguardando confirmação do paciente' : a.channel === 'assistente_ia' ? 'Confirmada pelo Assistente IA' : 'Confirmada pela recepção',
      icon: CheckCheck,
      done: confirmed,
    },
    {
      id: 'checkin',
      label: 'Chegada na recepção',
      meta: v.checkInAt ? `Check-in às ${formatTime(v.checkInAt)}` : 'Pendente',
      icon: LogIn,
      done: Boolean(v.checkInAt),
    },
    {
      id: 'inicio',
      label: 'Atendimento iniciado',
      meta: v.startedAt
        ? `${formatTime(v.startedAt)} · ${v.roomName}${v.waitMin !== undefined ? ` · espera de ${durationLabel(v.waitMin)}` : ''}`
        : 'Pendente',
      icon: Play,
      done: Boolean(v.startedAt),
    },
    {
      id: 'fim',
      label: 'Atendimento concluído',
      meta: v.finishedAt && v.startedAt ? `${formatTime(v.finishedAt)} · duração de ${durationLabel(minutesBetween(v.startedAt, v.finishedAt))}` : 'Pendente',
      icon: CircleCheckBig,
      done: Boolean(v.finishedAt),
    },
  );
  return steps;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const last = i === steps.length - 1;
        return (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-graphite-200" />}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                s.tone === 'danger' && 'border-danger/30 bg-danger-bg text-danger',
                s.tone === 'warning' && 'border-warning/30 bg-warning-bg text-warning',
                !s.tone && s.done && 'border-gold-300 bg-gold-50 text-gold-600',
                !s.tone && !s.done && 'border-dashed border-graphite-300 bg-white text-graphite-400',
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn('text-sm font-semibold', s.done || s.tone ? 'text-graphite-900' : 'text-graphite-500')}>
                {s.label}
                {!s.done && !s.tone && <span className="sr-only"> (pendente)</span>}
              </p>
              <p className="text-xs text-graphite-500">{s.meta}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function StatBlock({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-graphite-200 p-3">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gold-50 text-gold-600">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">{label}</p>
        <p className="font-display text-2xl leading-tight tabular-nums text-graphite-900">{value}</p>
      </div>
    </div>
  );
}
