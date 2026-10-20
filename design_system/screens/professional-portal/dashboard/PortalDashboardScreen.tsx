import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CheckCheck,
  CircleUserRound,
  ClipboardCheck,
  Clock,
  DoorOpen,
  Hourglass,
  Play,
  Stethoscope,
  Users,
  UserX,
} from 'lucide-react';
import type { PortalRouteId } from '@ds/layouts/nav';
import { Avatar, Badge, Button, Card, KpiCard, MiniCalendar, ProgressBar, TimeSlot, useToast } from '@ds/components';
import type { TimeSlotState } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { formatTime, getProfessionalById, getRoomName, isSameDay, toDateKey } from '@ds/mocks/clinical';
import type { PortalAppointment, PortalSlotState } from '@ds/mocks/portal';
import {
  MY_BLOCK_REQUESTS,
  PORTAL_NOW,
  PORTAL_PROFESSIONAL_ID,
  PORTAL_TODAY,
  getMyAppointments,
  getMyAttendanceHistory,
  getMyDaySlots,
  getMyNextAppointment,
  getMyPatients,
  timeToMinutes,
} from '@ds/mocks/portal';
import { weekDays } from '../../agenda/agendaUtils';
import { DayTimeline, PortalAppointmentDrawer, ScopeBadge, WeekStrip, greeting, longDate, minutesBetween, plural, timeRange, weekdayDate } from '../shared';

export interface PortalDashboardScreenProps {
  /** Profissional logado (padrão 'prof-lauren'). */
  professionalId?: string;
  /** Navegação entre as rotas do portal. */
  onNavigate?: (route: PortalRouteId) => void;
  /** "Iniciar"/"Continuar" atendimento — App abre Meus Atendimentos com este id. */
  onStartAttendance?: (appointmentId: string) => void;
  /** Abre o paciente em Meus Pacientes. */
  onOpenPatient?: (patientId: string) => void;
}

const SLOT_TO_TIMESLOT: Record<PortalSlotState, TimeSlotState | null> = {
  livre: 'livre',
  ocupado: 'ocupado',
  bloqueado: 'bloqueado',
  pendente: 'bloqueado',
  intervalo: null,
};

/** Quarto-de-círculo dourado (motivo de marca dos posts) — decorativo. */
function QuarterCircle({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="132" height="132" viewBox="0 0 132 132" className={className}>
      <path d="M132 0v132A132 132 0 0 1 0 0z" fill="#F5E9D0" />
      <path d="M132 24v108A108 108 0 0 1 24 0" fill="none" stroke="#DDB872" strokeWidth="1.5" />
    </svg>
  );
}

/** Meu Dashboard — visão do dia da profissional logada (somente os próprios registros). */
export function PortalDashboardScreen({
  professionalId = PORTAL_PROFESSIONAL_ID,
  onNavigate,
  onStartAttendance,
  onOpenPatient,
}: PortalDashboardScreenProps) {
  const { toast } = useToast();
  const prof = getProfessionalById(professionalId);
  const [calMonth, setCalMonth] = useState<Date>(new Date(PORTAL_TODAY.getFullYear(), PORTAL_TODAY.getMonth(), 1));
  const [slotDay, setSlotDay] = useState<Date>(PORTAL_TODAY);
  const [selected, setSelected] = useState<PortalAppointment | null>(null);

  const all = useMemo(() => getMyAppointments(professionalId), [professionalId]);
  const todayKey = toDateKey(PORTAL_TODAY);
  const today = useMemo(() => all.filter((a) => a.start.startsWith(todayKey)), [all, todayKey]);
  const todaySlots = useMemo(() => getMyDaySlots(professionalId, todayKey, { appointments: all }), [professionalId, todayKey, all]);
  const patientsById = useMemo(() => new Map(getMyPatients(professionalId).map((p) => [p.id, p])), [professionalId]);
  const history = useMemo(() => getMyAttendanceHistory(professionalId).slice(0, 5), [professionalId]);

  const active = today.filter((a) => a.status !== 'cancelada');
  const confirmed = today.filter((a) => a.status === 'confirmada').length;
  const pending = today.filter((a) => a.status === 'agendada').length;
  const done = today.filter((a) => a.status === 'concluida').length;
  const inProgress = today.find((a) => a.status === 'em_atendimento');
  const next = getMyNextAppointment(professionalId, PORTAL_NOW, all);
  const nextIsToday = next ? next.start.startsWith(todayKey) : false;

  const markedDays = useMemo(() => {
    const prefix = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}`;
    return Array.from(
      new Set(all.filter((a) => a.start.startsWith(prefix) && a.status !== 'cancelada').map((a) => Number(a.start.slice(8, 10)))),
    );
  }, [all, calMonth]);

  const slotDayKey = toDateKey(slotDay);
  const slotList = useMemo(() => {
    const isToday = isSameDay(slotDay, PORTAL_TODAY);
    const nowMin = PORTAL_NOW.getHours() * 60 + PORTAL_NOW.getMinutes();
    return getMyDaySlots(professionalId, slotDayKey, { appointments: all })
      .filter((s) => !isToday || timeToMinutes(s.time) + 30 > nowMin)
      .flatMap((s) => {
        const state = SLOT_TO_TIMESLOT[s.state];
        return state ? [{ time: s.time, state }] : [];
      });
  }, [professionalId, slotDay, slotDayKey, all]);
  const freeSlots = slotList.filter((s) => s.state === 'livre').length;

  const todayPatients = useMemo(() => {
    const seen = new Set<string>();
    return active
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start))
      .filter((a) => (seen.has(a.patientId) ? false : (seen.add(a.patientId), true)));
  }, [active]);

  const firstName = prof ? prof.name.split(' ').slice(0, 2).join(' ') : 'Profissional';
  const startHandler = onStartAttendance ?? (onNavigate ? () => onNavigate('meus-atendimentos') : undefined);

  return (
    <div className="flex flex-col gap-6">
      {/* Boas-vindas */}
      <section
        aria-labelledby="portal-welcome"
        className="relative overflow-hidden rounded-md border border-graphite-200 bg-white p-5 shadow-sm md:p-7"
      >
        <QuarterCircle className="pointer-events-none absolute -right-1 -top-1 hidden sm:block" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={prof?.name ?? 'Profissional'} size="xl" ring />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-overline uppercase text-gold-600">Portal do Profissional</p>
            <h2 id="portal-welcome" className="font-display text-[30px] font-semibold leading-[36px] text-graphite-900 md:text-display-lg">
              {greeting(PORTAL_NOW)}, {firstName}
            </h2>
            <p className="text-body text-graphite-600">
              {longDate(PORTAL_TODAY)} · agora {formatTime(PORTAL_NOW)} ·{' '}
              {plural(active.length, 'consulta hoje', 'consultas hoje')}
              {next && nextIsToday ? ` · próxima às ${formatTime(next.start)}` : ''}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ScopeBadge />
              {prof?.registry && <Badge tone="gold">{prof.registry}</Badge>}
              {prof?.roomId && (
                <Badge tone="neutral" icon={DoorOpen}>
                  {getRoomName(prof.roomId)} · Odontologia
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:self-end">
            <Button variant="secondary" leftIcon={CalendarClock} onClick={() => onNavigate?.('minha-agenda')}>
              Minha agenda
            </Button>
            <Button variant="ghost" leftIcon={CircleUserRound} onClick={() => onNavigate?.('meu-perfil')}>
              Meu perfil
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section aria-label="Resumo de hoje" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard label="Consultas hoje" value={String(active.length)} icon={CalendarCheck2} footer={<span className="text-caption text-graphite-500">{plural(freeSlotsToday(todaySlots), 'horário livre', 'horários livres')} a partir de agora</span>} />
        <KpiCard label="Confirmadas" value={String(confirmed)} icon={CheckCheck} tone="success" footer={<span className="text-caption text-graphite-500">pelo paciente ou recepção</span>} />
        <KpiCard label="Pendentes" value={String(pending)} icon={Hourglass} tone="warning" footer={<span className="text-caption text-graphite-500">aguardando confirmação</span>} />
        <KpiCard label="Concluídas" value={String(done)} icon={ClipboardCheck} progress={active.length ? (done / active.length) * 100 : 0} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Coluna principal */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card as="section" aria-labelledby="next-title" title={<span id="next-title">Próximo atendimento</span>}>
            {inProgress && (
              <div className="flex flex-col gap-3 rounded-md border border-gold-300 bg-gold-50 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-overline uppercase text-gold-700">Em atendimento agora</p>
                  <p className="truncate font-bold text-graphite-900">{inProgress.patientName}</p>
                  <p className="text-caption text-graphite-600">
                    {inProgress.service} · desde {formatTime(inProgress.start)} · há {minutesBetween(inProgress.start, PORTAL_NOW)} min
                  </p>
                  <ProgressBar
                    className="mt-2"
                    size="sm"
                    value={(minutesBetween(inProgress.start, PORTAL_NOW) / inProgress.durationMin) * 100}
                    label={`${minutesBetween(inProgress.start, PORTAL_NOW)} de ${inProgress.durationMin} min previstos`}
                  />
                </div>
                {startHandler && (
                  <Button size="sm" leftIcon={Play} onClick={() => startHandler(inProgress.id)}>
                    Continuar
                  </Button>
                )}
              </div>
            )}
            {next ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center rounded-full border border-gold-300 bg-white" aria-hidden="true">
                  <span className="font-display text-[26px] leading-none tabular-nums text-graphite-900">{formatTime(next.start)}</span>
                  <span className="text-[11px] font-bold text-gold-600">{nextIsToday ? 'hoje' : weekdayDate(next.start)}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setSelected(next)}
                    className="truncate rounded-xs text-left text-h4 text-graphite-900 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    {next.patientName}
                  </button>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-graphite-600">
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope size={14} strokeWidth={1.75} aria-hidden="true" />
                      {next.service}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                      {timeRange(next)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DoorOpen size={14} strokeWidth={1.75} aria-hidden="true" />
                      {getRoomName(next.roomId)}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(patientsById.get(next.patientId)?.alerts ?? []).map((al) => (
                      <Badge key={al.id} tone={al.tone} size="sm" dot>
                        {al.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                {startHandler && nextIsToday && (
                  <Button
                    leftIcon={Play}
                    onClick={() => startHandler(next.id)}
                    disabled={Boolean(inProgress)}
                    aria-describedby={inProgress ? 'next-busy-hint' : undefined}
                    className="sm:self-center"
                  >
                    Iniciar atendimento
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-body-sm text-graphite-500">Nenhuma consulta pendente. Bom descanso!</p>
            )}
            {inProgress && next && nextIsToday && (
              <p id="next-busy-hint" className="text-caption text-graphite-500">
                Finalize o atendimento em andamento para iniciar o próximo.
              </p>
            )}
          </Card>

          <Card
            as="section"
            aria-labelledby="today-title"
            title={<span id="today-title">Agenda de hoje</span>}
            description="Consultas e horários livres do seu expediente"
            action={
              <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('minha-agenda')}>
                Ver agenda
              </Button>
            }
          >
            <DayTimeline compact appointments={today} slots={todaySlots} requests={MY_BLOCK_REQUESTS} now={PORTAL_NOW} onSelectAppointment={setSelected} />
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card as="section" aria-labelledby="week-title" title={<span id="week-title">Esta semana</span>} description="Consultas e ocupação por dia">
            <WeekStrip
              professionalId={professionalId}
              days={weekDays(PORTAL_TODAY)}
              appointments={all}
              requests={MY_BLOCK_REQUESTS}
              today={PORTAL_TODAY}
              selected={slotDay}
              onSelect={(d) => {
                setSlotDay(d);
                setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
            />
          </Card>

          <Card as="section" aria-labelledby="avail-title" title={<span id="avail-title">Calendário e horários disponíveis</span>}>
            <div className="flex flex-col gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
              <MiniCalendar
                month={calMonth}
                onMonthChange={setCalMonth}
                selected={slotDay}
                onSelect={setSlotDay}
                markedDays={markedDays}
                today={PORTAL_TODAY}
                className="shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <p className="text-body-sm font-bold text-graphite-900">
                  {isSameDay(slotDay, PORTAL_TODAY) ? 'Hoje, a partir de agora' : weekdayDate(slotDayKey)}
                  <span className="ml-2 font-semibold text-graphite-500">· {plural(freeSlots, 'livre', 'livres')}</span>
                </p>
                {slotList.length === 0 ? (
                  <p className="rounded-md border border-dashed border-graphite-200 p-3 text-body-sm text-graphite-500">Sem expediente neste dia.</p>
                ) : (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Horários do dia">
                    {slotList.map((s) => (
                      <TimeSlot
                        key={s.time}
                        time={s.time}
                        state={s.state}
                        onClick={
                          s.state === 'livre'
                            ? () => toast({ tone: 'info', title: `Horário livre às ${s.time}`, description: 'Encaixes são agendados pela recepção.' })
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                <p className="text-caption text-graphite-500">Livre = disponível para a recepção agendar. Riscado = ocupado; listrado = bloqueado.</p>
              </div>
            </div>
          </Card>

          <Card
            as="section"
            aria-labelledby="patients-today-title"
            title={<span id="patients-today-title">Pacientes de hoje</span>}
            action={
              <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('meus-pacientes')}>
                Meus pacientes
              </Button>
            }
          >
            <ul className="flex flex-col divide-y divide-graphite-100">
              {todayPatients.map((a) => {
                const p = patientsById.get(a.patientId);
                const alerts = p?.alerts.length ?? 0;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => (onOpenPatient ? onOpenPatient(a.patientId) : setSelected(a))}
                      className="flex w-full items-center gap-3 rounded-xs py-2.5 text-left hover:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <Avatar name={a.patientName} size="sm" tone="neutral" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-bold text-graphite-900">{a.patientName}</span>
                        <span className="truncate text-caption text-graphite-600">
                          {p ? `${p.age} anos · ` : ''}
                          {a.service}
                        </span>
                      </span>
                      {alerts > 0 && (
                        <Badge tone="warning" icon={AlertTriangle} size="sm">
                          {alerts}
                          <span className="sr-only"> {alerts === 1 ? 'alerta' : 'alertas'}</span>
                        </Badge>
                      )}
                      <span className={cn('w-12 text-right text-body-sm font-extrabold tabular-nums', a.status === 'concluida' ? 'text-graphite-400' : 'text-graphite-900')}>
                        {formatTime(a.start)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          as="section"
          aria-labelledby="history-title"
          title={<span id="history-title">Meus últimos atendimentos</span>}
          description="Histórico dos seus próprios atendimentos"
          action={
            <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('meus-atendimentos')}>
              Ver histórico
            </Button>
          }
        >
          <ul className="flex flex-col divide-y divide-graphite-100">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="w-24 shrink-0 text-caption font-semibold tabular-nums text-graphite-500">{weekdayDate(h.date)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-graphite-900">{h.patientName}</span>
                  <span className="block truncate text-caption text-graphite-600">{h.service}</span>
                </span>
                {h.outcome === 'faltou' ? (
                  <Badge tone="warning" icon={UserX} size="sm">
                    Faltou
                  </Badge>
                ) : (
                  <Badge tone="neutral" icon={CheckCheck} size="sm">
                    Concluído
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" aria-labelledby="profile-shortcut-title" className="relative overflow-hidden">
          <div className="flex items-center gap-4">
            <Avatar name={prof?.name ?? 'Profissional'} size="lg" ring />
            <div className="min-w-0">
              <h3 id="profile-shortcut-title" className="truncate text-[15px] font-bold text-graphite-900">
                {prof?.name}
              </h3>
              <p className="text-body-sm text-graphite-600">{prof?.title}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-body-sm text-graphite-700">
            <li className="flex items-center gap-2">
              <Users size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
              {plural(patientsById.size, 'paciente vinculado', 'pacientes vinculados')}
            </li>
            <li className="flex items-center gap-2">
              <CalendarClock size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
              Disponibilidade, preferências e segurança
            </li>
          </ul>
          <Button variant="secondary" rightIcon={ArrowRight} onClick={() => onNavigate?.('meu-perfil')} fullWidth>
            Abrir meu perfil
          </Button>
        </Card>
      </div>

      <PortalAppointmentDrawer
        appointment={selected}
        onClose={() => setSelected(null)}
        professionalId={professionalId}
        onStartAttendance={
          startHandler
            ? (id) => {
                setSelected(null);
                startHandler(id);
              }
            : undefined
        }
        onOpenPatient={onOpenPatient}
      />
    </div>
  );
}

function freeSlotsToday(slots: { time: string; state: PortalSlotState }[]): number {
  const nowMin = PORTAL_NOW.getHours() * 60 + PORTAL_NOW.getMinutes();
  return slots.filter((s) => s.state === 'livre' && timeToMinutes(s.time) >= nowMin).length;
}
