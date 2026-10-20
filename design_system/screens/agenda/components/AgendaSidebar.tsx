import type { Appointment, Professional, Specialty } from '@ds/mocks/types';
import { Avatar, Card, MiniCalendar, ProgressBar } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { ALL_SPECIALTIES, ROOM_USAGE, SPECIALTY_HEX, SPECIALTY_NAMES, rooms, toDateKey } from '@ds/mocks/clinical';

export interface AgendaSidebarProps {
  date: Date;
  month: Date;
  onSelectDate: (d: Date) => void;
  appointments: Appointment[];
  professionals: Professional[];
  activeSpecialties: Specialty[];
  onToggleSpecialty: (s: Specialty) => void;
  className?: string;
}

export function AgendaSidebar({
  date,
  month,
  onSelectDate,
  appointments,
  professionals,
  activeSpecialties,
  onToggleSpecialty,
  className,
}: AgendaSidebarProps) {
  const markedDays = Array.from(
    new Set(
      appointments
        .filter((a) => {
          const d = new Date(a.start);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        })
        .map((a) => new Date(a.start).getDate()),
    ),
  );

  const key = toDateKey(date);
  const dayAppts = appointments.filter((a) => a.start.startsWith(key) && a.status !== 'cancelada');
  const workingToday = professionals.filter((p) => p.workingHours.some((w) => w.weekday === date.getDay()));

  return (
    <aside className={cn('flex flex-col gap-4', className)} aria-label="Painel lateral da agenda">
      <Card padding="md">
        <MiniCalendar month={month} selected={date} onSelect={onSelectDate} markedDays={markedDays} />
      </Card>

      <Card title="Especialidades" description="Toque para filtrar a agenda">
        <ul className="flex flex-col gap-0.5">
          {ALL_SPECIALTIES.map((s) => {
            const active = activeSpecialties.length === 0 || activeSpecialties.includes(s);
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-pressed={activeSpecialties.includes(s)}
                  onClick={() => onToggleSpecialty(s)}
                  className={cn(
                    'flex min-h-[36px] w-full items-center gap-2.5 rounded-sm px-2 text-left text-sm hover:bg-graphite-50 focus-visible:shadow-focus focus-visible:outline-none',
                    active ? 'text-graphite-800' : 'text-graphite-400',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('h-2.5 w-2.5 shrink-0 rounded-full', !active && 'opacity-40')}
                    style={{ backgroundColor: SPECIALTY_HEX[s] }}
                  />
                  <span className="flex-1">{SPECIALTY_NAMES[s]}</span>
                  {activeSpecialties.includes(s) && <span className="text-xs font-semibold text-gold-600">filtrando</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card
        title="Disponibilidade"
        description={date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      >
        {workingToday.length === 0 ? (
          <p className="text-sm text-graphite-500">Nenhum profissional em expediente nesta data.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workingToday.map((p) => {
              const wh = p.workingHours.find((w) => w.weekday === date.getDay());
              const totalMin = wh
                ? (Number(wh.end.slice(0, 2)) * 60 + Number(wh.end.slice(3))) - (Number(wh.start.slice(0, 2)) * 60 + Number(wh.start.slice(3)))
                : 0;
              const used = dayAppts.filter((a) => a.professionalId === p.id).reduce((acc, a) => acc + a.durationMin, 0);
              const pct = totalMin ? Math.min(100, Math.round((used / totalMin) * 100)) : 0;
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-graphite-800">{p.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-graphite-500">
                        {wh?.start}–{wh?.end}
                      </span>
                    </div>
                    <ProgressBar
                      value={pct}
                      tone={pct > 85 ? 'warning' : 'gold'}
                      label={`${pct}% ocupado`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Salas">
        <ul className="grid grid-cols-1 gap-2">
          {rooms.map((r) => {
            const inUse = dayAppts.filter((a) => a.roomId === r.id).length;
            return (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-graphite-800">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-graphite-500"> · {ROOM_USAGE[r.id]}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-graphite-500">{inUse} reservas</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </aside>
  );
}
