import { Hourglass, Lock } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { formatTime, isSameDay, toDateKey } from '@ds/mocks/clinical';
import type { BlockRequest, PortalAppointment } from '@ds/mocks/portal';
import { getMyBlocks } from '@ds/mocks/portal';

export interface PortalMonthGridProps {
  professionalId: string;
  month: Date;
  appointments: PortalAppointment[];
  requests: BlockRequest[];
  today: Date;
  selected: Date;
  onSelectDay: (d: Date) => void;
}

const HEAD = [
  { short: 'Seg', long: 'Segunda' },
  { short: 'Ter', long: 'Terça' },
  { short: 'Qua', long: 'Quarta' },
  { short: 'Qui', long: 'Quinta' },
  { short: 'Sex', long: 'Sexta' },
  { short: 'Sáb', long: 'Sábado' },
  { short: 'Dom', long: 'Domingo' },
];

/** Mês (semana começando na segunda). No celular, cada dia mostra só o número e a contagem. */
export function PortalMonthGrid({ professionalId, month, appointments, requests, today, selected, onSelectDay }: PortalMonthGridProps) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const blocks = getMyBlocks(professionalId, requests);

  return (
    <div className="overflow-hidden rounded-md border border-graphite-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-graphite-200 bg-graphite-50" aria-hidden="true">
        {HEAD.map((h) => (
          <span key={h.short} className="py-2 text-center text-overline uppercase text-graphite-500">
            {h.short}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7" aria-label={month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}>
        {cells.map((d, i) => {
          if (!d) return <li key={`e-${i}`} aria-hidden="true" className="min-h-[56px] border-b border-r border-graphite-100 bg-graphite-50/50 md:min-h-[108px]" />;
          const key = toDateKey(d);
          const dayAppts = appointments.filter((a) => a.start.startsWith(key)).sort((a, b) => a.start.localeCompare(b.start));
          const active = dayAppts.filter((a) => a.status !== 'cancelada');
          const dayBlocks = blocks.filter((b) => b.date === key);
          const approved = dayBlocks.some((b) => b.status === 'aprovada');
          const pending = dayBlocks.some((b) => b.status === 'enviada');
          const isToday = isSameDay(d, today);
          const isSel = isSameDay(d, selected);
          const sunday = d.getDay() === 0;
          return (
            <li key={key} className="border-b border-r border-graphite-100">
              <button
                type="button"
                onClick={() => onSelectDay(d)}
                aria-current={isToday ? 'date' : undefined}
                aria-pressed={isSel}
                aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${active.length} consultas${approved ? ', bloqueio aprovado' : ''}${pending ? ', bloqueio pendente' : ''}`}
                className={cn(
                  'flex h-full min-h-[56px] w-full flex-col items-center gap-1 p-1.5 text-left transition-colors md:min-h-[108px] md:items-stretch md:p-2',
                  'hover:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus',
                  isSel && 'bg-gold-50 hover:bg-gold-50',
                  sunday && !isSel && 'bg-graphite-50/60',
                )}
              >
                <span className="flex items-center gap-1">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-body-sm font-bold tabular-nums',
                      isToday ? 'bg-gold-600 text-white' : 'text-graphite-800',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {approved && <Lock size={12} strokeWidth={2} aria-hidden="true" className="hidden text-graphite-500 md:block" />}
                  {pending && <Hourglass size={12} strokeWidth={2} aria-hidden="true" className="hidden text-warning md:block" />}
                </span>
                {active.length > 0 && (
                  <span className="rounded-full bg-gold-100 px-1.5 text-[11px] font-bold tabular-nums text-gold-700 md:hidden">{active.length}</span>
                )}
                <span className="hidden flex-col gap-0.5 md:flex">
                  {active.slice(0, 3).map((a) => (
                    <span key={a.id} className="truncate rounded-xs bg-graphite-50 px-1.5 py-0.5 text-[11px] font-semibold text-graphite-700">
                      <span className="tabular-nums">{formatTime(a.start)}</span> {a.patientName.split(' ')[0]}
                    </span>
                  ))}
                  {active.length > 3 && <span className="px-1.5 text-[11px] font-bold text-gold-600">+{active.length - 3} consultas</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
