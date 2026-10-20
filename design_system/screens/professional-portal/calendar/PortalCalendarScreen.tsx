import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarX2, ChevronLeft, ChevronRight, Hourglass, Info, Lock, Play } from 'lucide-react';
import type { AppointmentStatus } from '@ds/mocks/types';
import { canAccess } from '@ds/access';
import { Button, Card, EmptyState, IconButton, Input, PageHeader, SegmentedControl, Select } from '@ds/components';
import { STATUS_NAMES, isSameDay, parseDate, toDateKey } from '@ds/mocks/clinical';
import type { BlockRequest, PortalAppointment } from '@ds/mocks/portal';
import { MY_BLOCK_REQUESTS, PORTAL_NOW, PORTAL_PROFESSIONAL_ID, PORTAL_TODAY, getMyAppointments, getMyBlockRequests, getMyDaySlots } from '@ds/mocks/portal';
import { addDays, addMonths, weekDays } from '../../agenda/agendaUtils';
import { BlockRequestList, DayTimeline, PortalAppointmentDrawer, RequestChangeButton, ScopeBadge, isWaiting, longDate, plural } from '../shared';
import { PortalMonthGrid, PortalWeekBoard } from './components';
import { RequestBlockModal } from './modals';

export type PortalCalendarView = 'dia' | 'semana' | 'mes';

export interface PortalCalendarScreenProps {
  /** Profissional logado (padrão 'prof-lauren'). */
  professionalId?: string;
  /** Permissão de solicitar bloqueio (padrão: derivado de canAccess('profissional','bloqueio_horario','solicitar')). */
  canRequestChanges?: boolean;
  /** "Iniciar atendimento" no detalhe da consulta (App navega para Meus Atendimentos). */
  onStartAttendance?: (appointmentId: string) => void;
  /** Abre o paciente em Meus Pacientes. */
  onOpenPatient?: (patientId: string) => void;
  initialView?: PortalCalendarView;
  initialDate?: Date;
}

type StatusFilter = AppointmentStatus | 'todos';

const VIEW_OPTIONS = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

const STATUS_ORDER: AppointmentStatus[] = ['agendada', 'confirmada', 'em_atendimento', 'concluida', 'cancelada', 'faltou', 'reagendada'];

function periodLabel(view: PortalCalendarView, d: Date): string {
  if (view === 'dia') return longDate(d);
  if (view === 'semana') {
    const days = weekDays(d);
    const a = days[0];
    const b = days[days.length - 1];
    const sameMonth = a.getMonth() === b.getMonth();
    return sameMonth
      ? `${a.getDate()} a ${b.getDate()} de ${b.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
      : `${a.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${b.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Legend() {
  const items = [
    { label: 'Livre', cls: 'border-dashed border-graphite-300 bg-white' },
    { label: 'Ocupado', cls: 'border-graphite-200 bg-graphite-100' },
    { label: 'Bloqueado', cls: 'hm-striped border-graphite-200', icon: Lock },
    { label: 'Bloqueio pendente', cls: 'border-dashed border-warning/40 bg-warning-bg', icon: Hourglass },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-caption text-graphite-600" aria-label="Legenda da agenda">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-flex h-4 w-6 items-center justify-center rounded-[4px] border ${it.cls}`}>
            {it.icon && <it.icon size={10} strokeWidth={2} />}
          </span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Minha Agenda — somente as consultas da profissional logada.
 * Sem criação de agendamentos (feito pela recepção); bloqueios são SOLICITADOS.
 */
export function PortalCalendarScreen({
  professionalId = PORTAL_PROFESSIONAL_ID,
  canRequestChanges = canAccess('profissional', 'bloqueio_horario', 'solicitar'),
  onStartAttendance,
  onOpenPatient,
  initialView = 'dia',
  initialDate = PORTAL_TODAY,
}: PortalCalendarScreenProps) {
  const [view, setView] = useState<PortalCalendarView>(initialView);
  const [date, setDate] = useState<Date>(initialDate);
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [selected, setSelected] = useState<PortalAppointment | null>(null);
  const [requests, setRequests] = useState<BlockRequest[]>(() => getMyBlockRequests(professionalId, MY_BLOCK_REQUESTS));
  const [modal, setModal] = useState<{ open: boolean; date?: string }>({ open: false });

  const all = useMemo(() => getMyAppointments(professionalId), [professionalId]);
  const filtered = useMemo(() => (status === 'todos' ? all : all.filter((a) => a.status === status)), [all, status]);

  const dateKey = toDateKey(date);
  const isToday = isSameDay(date, PORTAL_TODAY);
  const days = weekDays(date);

  const dayAppts = filtered.filter((a) => a.start.startsWith(dateKey));
  const daySlots = useMemo(() => getMyDaySlots(professionalId, dateKey, { appointments: all, requests }), [professionalId, dateKey, all, requests]);
  const freeCount = daySlots.filter((s) => s.state === 'livre').length;
  const busyCount = daySlots.filter((s) => s.state === 'ocupado').length;
  const blockedCount = daySlots.filter((s) => s.state === 'bloqueado' || s.state === 'pendente').length;

  const periodCount = useMemo(() => {
    if (view === 'dia') return dayAppts.length;
    if (view === 'semana') {
      const keys = days.map(toDateKey);
      return filtered.filter((a) => keys.some((k) => a.start.startsWith(k))).length;
    }
    const prefix = dateKey.slice(0, 7);
    return filtered.filter((a) => a.start.startsWith(prefix)).length;
  }, [view, dayAppts.length, days, filtered, dateKey]);

  function shift(dir: 1 | -1) {
    if (view === 'dia') setDate((d) => addDays(d, dir));
    else if (view === 'semana') setDate((d) => addDays(d, 7 * dir));
    else setDate((d) => addMonths(d, dir));
  }

  function openDay(d: Date) {
    setDate(d);
    setView('dia');
  }

  const prevLabel = view === 'dia' ? 'Dia anterior' : view === 'semana' ? 'Semana anterior' : 'Mês anterior';
  const nextLabel = view === 'dia' ? 'Próximo dia' : view === 'semana' ? 'Próxima semana' : 'Próximo mês';
  const pendingCount = requests.filter((r) => r.status === 'enviada').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Minha agenda"
        breadcrumb={['Portal do Profissional', 'Minha agenda']}
        subtitle="Suas consultas, horários livres e bloqueios. Novos agendamentos são feitos pela recepção."
        actions={
          <RequestChangeButton enabled={canRequestChanges} onClick={() => setModal({ open: true, date: dateKey >= toDateKey(PORTAL_TODAY) ? dateKey : undefined })} />
        }
      />

      {/* Barra de navegação e filtros */}
      <section aria-label="Navegação e filtros da agenda" className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-3 shadow-sm md:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label={prevLabel} variant="secondary" size="sm" onClick={() => shift(-1)} />
            <Button variant="ghost" size="sm" onClick={() => setDate(PORTAL_TODAY)} aria-label="Ir para hoje">
              Hoje
            </Button>
            <IconButton icon={ChevronRight} label={nextLabel} variant="secondary" size="sm" onClick={() => shift(1)} />
          </div>
          <h2 className="min-w-0 flex-1 font-display text-[22px] leading-tight text-graphite-900 md:text-2xl" aria-live="polite">
            {periodLabel(view, date)}
          </h2>
          <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={(v) => setView(v as PortalCalendarView)} ariaLabel="Visualização da agenda" />
        </div>
        <div className="flex flex-col gap-3 border-t border-graphite-100 pt-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-[480px]">
            <Input
              label="Ir para a data"
              type="date"
              value={dateKey}
              onChange={(e) => e.target.value && setDate(parseDate(e.target.value))}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              options={[{ value: 'todos', label: 'Todos os status' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_NAMES[s] }))]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <ScopeBadge />
            <span className="text-caption text-graphite-600" aria-live="polite">
              {plural(periodCount, 'consulta', 'consultas')} no período
            </span>
            {status !== 'todos' && (
              <Button variant="link" size="sm" onClick={() => setStatus('todos')}>
                Limpar filtro
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-graphite-100 pt-3 md:flex-row md:items-center md:justify-between">
          <Legend />
          <p className="flex items-start gap-1.5 text-caption text-graphite-500">
            <Info size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
            Para encaixes ou remarcações, fale com a recepção.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {view === 'dia' && (
            <Card
              as="section"
              aria-label={`Agenda de ${longDate(date)}`}
              title={isToday ? 'Hoje' : longDate(date)}
              description={
                daySlots.length
                  ? `${plural(freeCount, 'horário livre', 'horários livres')} · ${plural(busyCount, 'ocupado', 'ocupados')}${blockedCount ? ` · ${blockedCount} bloqueados/pendentes` : ''}`
                  : 'Você não atende neste dia.'
              }
            >
              {daySlots.length === 0 && dayAppts.length === 0 ? (
                <EmptyState
                  compact
                  icon={CalendarX2}
                  title="Sem expediente"
                  description="Você não tem horário de atendimento neste dia. Para mudar sua disponibilidade, faça uma solicitação."
                />
              ) : status !== 'todos' && dayAppts.length === 0 ? (
                <EmptyState compact icon={CalendarCheck} title="Nada com este status" description="Nenhuma consulta sua neste dia com o status selecionado." />
              ) : (
                <DayTimeline
                  appointments={dayAppts}
                  slots={status === 'todos' ? daySlots : []}
                  requests={requests}
                  now={isToday ? PORTAL_NOW : undefined}
                  onSelectAppointment={setSelected}
                  renderAction={(a) =>
                    isToday && onStartAttendance && (isWaiting(a.status) || a.status === 'em_atendimento') ? (
                      <Button
                        size="sm"
                        variant={a.status === 'em_atendimento' ? 'primary' : 'secondary'}
                        leftIcon={Play}
                        onClick={() => onStartAttendance(a.id)}
                        aria-label={`${a.status === 'em_atendimento' ? 'Continuar' : 'Iniciar'} atendimento de ${a.patientName}`}
                      >
                        {a.status === 'em_atendimento' ? 'Continuar' : 'Iniciar'}
                      </Button>
                    ) : null
                  }
                />
              )}
            </Card>
          )}
          {view === 'semana' && (
            <PortalWeekBoard
              professionalId={professionalId}
              days={days}
              appointments={filtered}
              allAppointments={all}
              requests={requests}
              today={PORTAL_TODAY}
              onSelectAppointment={setSelected}
              onSelectDay={openDay}
            />
          )}
          {view === 'mes' && (
            <PortalMonthGrid
              professionalId={professionalId}
              month={date}
              appointments={filtered}
              requests={requests}
              today={PORTAL_TODAY}
              selected={date}
              onSelectDay={openDay}
            />
          )}
        </div>

        <Card
          as="section"
          aria-labelledby="my-requests-title"
          title={<span id="my-requests-title">Minhas solicitações</span>}
          description={pendingCount ? `${plural(pendingCount, 'solicitação aguardando', 'solicitações aguardando')} aprovação` : 'Bloqueios e alterações de horário'}
          className="self-start"
        >
          <BlockRequestList requests={requests} />
          <RequestChangeButton enabled={canRequestChanges} onClick={() => setModal({ open: true })} label="Nova solicitação" fullWidth />
          {!canRequestChanges && (
            <p className="text-caption text-graphite-500">
              Solicitações desativadas pela administração para o seu perfil.
            </p>
          )}
        </Card>
      </div>

      <PortalAppointmentDrawer
        appointment={selected}
        onClose={() => setSelected(null)}
        professionalId={professionalId}
        onStartAttendance={
          onStartAttendance
            ? (id) => {
                setSelected(null);
                onStartAttendance(id);
              }
            : undefined
        }
        onOpenPatient={onOpenPatient}
      />

      <RequestBlockModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        onSubmit={(r) => setRequests((list) => [r, ...list])}
        professionalId={professionalId}
        initialDate={modal.date}
        appointments={all}
        existingRequests={requests}
      />
    </div>
  );
}
