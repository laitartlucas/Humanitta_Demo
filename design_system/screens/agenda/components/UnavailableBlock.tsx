import { Clock3, Lock, UtensilsCrossed } from 'lucide-react';
import type { UnavailableRange } from '@modules/agenda/agendaRules';
import { cn } from '@ds/foundations/cn';
import { rangeBox } from '../agendaUtils';

/** Hachura da grade para horários fora do expediente (mesma da visão Dia). */
export const STRIPED =
  'bg-graphite-50 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(199,194,185,.25)_6px,rgba(199,194,185,.25)_7px)]';

export interface UnavailableBlockProps {
  range: Pick<UnavailableRange, 'start' | 'end' | 'label'> & { kind: UnavailableRange['kind'] | 'fechado' | 'pendente' };
}

/** Faixa de horário indisponível (almoço, bloqueio aprovado, clínica fechada) ou bloqueio pendente. */
export function UnavailableBlock({ range }: UnavailableBlockProps) {
  const box = rangeBox(range.start, range.end);
  if (!box) return null;
  const pending = range.kind === 'pendente';
  const Icon = range.kind === 'almoco' ? UtensilsCrossed : pending ? Clock3 : Lock;
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 z-[4] flex items-start gap-1.5 overflow-hidden px-2 py-1.5 text-xs font-bold',
        pending ? 'mx-1 rounded-sm border border-dashed border-warning bg-warning-bg/60 text-warning' : cn(STRIPED, 'text-graphite-600'),
      )}
      style={{ top: box.top, height: box.height }}
      title={range.label}
    >
      <Icon size={13} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
      <span className="line-clamp-2">{range.label}</span>
    </div>
  );
}
