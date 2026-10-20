import { Check, Lock } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export type TimeSlotState = 'livre' | 'ocupado' | 'bloqueado' | 'selecionado';

export interface TimeSlotProps {
  time: string;
  state: TimeSlotState;
  onClick?: () => void;
  className?: string;
}

const STATE_LABEL: Record<TimeSlotState, string> = {
  livre: 'livre',
  ocupado: 'ocupado',
  bloqueado: 'bloqueado',
  selecionado: 'selecionado',
};

/** Horário selecionável (novo agendamento). Ocupado/bloqueado ficam desabilitados. */
export function TimeSlot({ time, state, onClick, className }: TimeSlotProps) {
  const unavailable = state === 'ocupado' || state === 'bloqueado';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      aria-pressed={state === 'selecionado'}
      aria-label={`${time} — ${STATE_LABEL[state]}`}
      className={cn(
        'inline-flex h-10 min-w-[76px] items-center justify-center gap-1.5 rounded-sm border px-3 text-body-sm font-bold tabular-nums transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus',
        state === 'livre' && 'border-graphite-200 bg-white text-graphite-800 hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700',
        state === 'selecionado' && 'border-gold-600 bg-gold-600 text-white hover:bg-gold-700',
        state === 'ocupado' && 'cursor-not-allowed border-graphite-100 bg-graphite-100 text-graphite-400 line-through',
        state === 'bloqueado' && 'hm-striped cursor-not-allowed border-graphite-200 text-graphite-500',
        className,
      )}
    >
      {state === 'selecionado' && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
      {state === 'bloqueado' && <Lock size={12} strokeWidth={2} aria-hidden="true" />}
      {time}
    </button>
  );
}
