import type { AppointmentRecord, Professional, RoomRecord, Specialty, SpecialtyRecord } from '@core';
import type { DayAvailability } from '@modules/agenda/agendaRules';
import { fromMinutes, occupiesTime } from '@modules/agenda/agendaRules';
import { Avatar, Card, MiniCalendar, ProgressBar } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { toDateKey } from '@ds/mocks/clinical';

export interface AgendaSidebarProps {
  date: Date;
  month: Date;
  onSelectDate: (d: Date) => void;
  appointments: AppointmentRecord[];
  professionals: Professional[];
  specialties: SpecialtyRecord[];
  rooms: RoomRecord[];
  activeSpecialties: Specialty[];
  onToggleSpecialty: (s: Specialty) => void;
  activeRoomId: string;
  onToggleRoom: (roomId: string) => void;
  /** Disponibilidade do profissional na data (funcionamento da clínica ∩ expediente). */
  availability: (professionalId: string, dateKey: string) => DayAvailability;
  /** A clínica funciona na data? */
  clinicOpen: boolean;
  className?: string;
}

export function AgendaSidebar({
  date,
  month,
  onSelectDate,
  appointments,
  professionals,
  specialties,
  rooms,
  activeSpecialties,
  onToggleSpecialty,
  activeRoomId,
  onToggleRoom,
  availability,
  clinicOpen,
  className,
}: AgendaSidebarProps) {
  const markedDays = Array.from(
    new Set(
      appointments
        .filter((a) => {
          const d = new Date(a.start);
          return occupiesTime(a) && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        })
        .map((a) => new Date(a.start).getDate()),
    ),
  );

  const key = toDateKey(date);
  const dayAppts = appointments.filter((a) => a.start.startsWith(key) && occupiesTime(a));
  const workingToday = professionals
    .map((p) => ({ p, day: availability(p.id, key) }))
    .filter((x) => x.day.window !== null);

  return (
    <aside className={cn('flex flex-col gap-4', className)} aria-label="Painel lateral da agenda">
      <Card padding="md">
        <MiniCalendar month={month} selected={date} onSelect={onSelectDate} markedDays={markedDays} />
      </Card>

      <Card title="Especialidades" description="Toque para filtrar a agenda">
        <ul className="flex flex-col gap-0.5">
          {specialties.map(({ id: s, name, colorHex }) => {
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
                    style={{ backgroundColor: colorHex }}
                  />
                  <span className="flex-1">{name}</span>
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
        {!clinicOpen ? (
          <p className="text-sm text-graphite-500">A clínica não funciona nesta data.</p>
        ) : workingToday.length === 0 ? (
          <p className="text-sm text-graphite-500">Nenhum profissional em expediente nesta data.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workingToday.map(({ p, day }) => {
              const win = day.window ?? { start: 0, end: 0 };
              const breaks = day.unavailable.reduce(
                (t, u) => t + Math.max(0, Math.min(u.end, win.end) - Math.max(u.start, win.start)),
                0,
              );
              const totalMin = Math.max(0, win.end - win.start - breaks);
              const used = dayAppts.filter((a) => a.professionalId === p.id).reduce((acc, a) => acc + a.durationMin, 0);
              const pct = totalMin ? Math.min(100, Math.round((used / totalMin) * 100)) : 100;
              const freeMin = Math.max(0, totalMin - used);
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-graphite-800">{p.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-graphite-500">
                        {fromMinutes(win.start)}–{fromMinutes(win.end)}
                      </span>
                    </div>
                    <ProgressBar
                      value={pct}
                      tone={pct > 85 ? 'warning' : 'gold'}
                      label={`${pct}% ocupado · ${Math.floor(freeMin / 60)}h${freeMin % 60 ? String(freeMin % 60).padStart(2, '0') : ''} livres`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Salas" description="Toque para filtrar por sala">
        <ul className="grid grid-cols-1 gap-0.5">
          {rooms.map((r) => {
            const inUse = dayAppts.filter((a) => a.roomId === r.id).length;
            const selected = activeRoomId === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleRoom(r.id)}
                  className={cn(
                    'flex min-h-[36px] w-full items-center justify-between gap-2 rounded-sm px-2 text-left text-sm hover:bg-graphite-50 focus-visible:shadow-focus focus-visible:outline-none',
                    !r.active && 'text-graphite-400',
                  )}
                >
                  <span className={r.active ? 'text-graphite-800' : undefined}>
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-graphite-500"> · {r.active ? r.label : 'inativa'}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-graphite-500">
                    {selected ? <span className="font-semibold text-gold-600">filtrando</span> : `${inUse} ${inUse === 1 ? 'reserva' : 'reservas'}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </aside>
  );
}
