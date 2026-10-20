import { useEffect, useMemo, useState } from 'react';
import {
  nowIso,
  todayKey,
  useAction,
  useAppointments,
  useAttendances,
  useCan,
  usePatients,
  useProfessionals,
  useRooms,
  useServices,
  useSpecialties,
  type AppointmentRecord,
  type Specialty,
} from '@core';
import {
  cancelAgendaAppointment,
  checkInAgendaAppointment,
  confirmAgendaAppointment,
  createAgendaAppointment,
  editAgendaAppointment,
  markAgendaNoShow,
  rescheduleAgendaAppointment,
} from '@modules/agenda/agendaService';
import { canReschedule, isOpen, roomName, searchAppointments, type DayAvailability } from '@modules/agenda/agendaRules';
import { useAvailability } from '@modules/agenda/hooks';
import { Skeleton, useToast } from '@ds/components';
import { formatDate, formatTime, toDateKey } from '@ds/mocks/clinical';
import { AgendaSearchResults, AgendaSidebar, AgendaToolbar, DayView, MonthView, WeekView } from './components';
import {
  AppointmentDetailsModal,
  CancelAppointmentModal,
  EditAppointmentModal,
  NewAppointmentModal,
  RescheduleModal,
  type NewAppointmentPrefill,
} from './modals';
import {
  EMPTY_FILTERS,
  addDays,
  addMonths,
  parseKey,
  periodRange,
  startOfMonth,
  toCoreFilters,
  weekDays,
  type AgendaFilters,
  type AgendaView,
} from './agendaUtils';

export interface AgendaScreenProps {
  /** Visualização inicial (padrão: semana). */
  initialView?: AgendaView;
}

type ModalState =
  | { kind: 'none' }
  | { kind: 'new'; prefill: NewAppointmentPrefill }
  | { kind: 'details'; id: string }
  | { kind: 'edit'; id: string }
  | { kind: 'reschedule'; id: string }
  | { kind: 'cancel'; id: string };

function periodLabel(view: AgendaView, date: Date): string {
  if (view === 'dia') return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (view === 'mes') return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const days = weekDays(date);
  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  return sameMonth
    ? `${first.getDate()} a ${last.getDate()} de ${last.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    : `${first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const describe = (a: AppointmentRecord) => `${a.patientName} · ${formatDate(a.start)} às ${formatTime(a.start)}`;

/** Agenda da clínica: leitura por `useAppointments` (core) e escrita pelo serviço da Agenda. */
export function AgendaScreen({ initialView = 'semana' }: AgendaScreenProps) {
  const { toast } = useToast();
  const [view, setView] = useState<AgendaView>(initialView);
  const [date, setDate] = useState<Date>(() => parseKey(todayKey()));
  const [filters, setFilters] = useState<AgendaFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'confirm' | 'checkIn' | 'noShow' | null>(null);

  // Primeira montagem: esqueleto enquanto a grade é montada (os dados já estão no store local).
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  const canEdit = useCan('agenda_clinica', 'editar');
  const professionals = useProfessionals();
  const rooms = useRooms();
  const specialties = useSpecialties();
  const services = useServices();
  const patients = usePatients();
  const attendances = useAttendances();
  const all = useAppointments();
  const filtered = useAppointments(toCoreFilters(filters));
  const availability = useAvailability();

  const create = useAction(createAgendaAppointment);
  const edit = useAction(editAgendaAppointment);
  const reschedule = useAction(rescheduleAgendaAppointment);
  const cancel = useAction(cancelAgendaAppointment);
  const confirm = useAction(confirmAgendaAppointment);
  const checkIn = useAction(checkInAgendaAppointment);
  const noShow = useAction(markAgendaNoShow);

  const activeSpecialties = useMemo(() => specialties.filter((s) => s.active), [specialties]);
  const visibleProfessionals = useMemo(
    () =>
      professionals.filter(
        (p) =>
          (filters.professionalId === 'todos' || p.id === filters.professionalId) &&
          (filters.specialties.length === 0 || filters.specialties.includes(p.specialty)) &&
          (filters.roomId === 'todas' || p.roomId === filters.roomId || filtered.some((a) => a.professionalId === p.id)),
      ),
    [professionals, filters, filtered],
  );

  const searching = query.trim().length > 0;
  const searchResults = useMemo(() => (searching ? searchAppointments(filtered, query, rooms) : []), [searching, filtered, query, rooms]);

  const resultCount = useMemo(() => {
    if (searching) return searchResults.length;
    const { from, to } = periodRange(view, date);
    return filtered.filter((a) => a.start.slice(0, 10) >= from && a.start.slice(0, 10) <= to).length;
  }, [searching, searchResults, filtered, view, date]);

  const current = modal.kind !== 'none' && modal.kind !== 'new' ? all.find((a) => a.id === modal.id) ?? null : null;
  const roomLabel = (roomId: string) => {
    const r = rooms.find((x) => x.id === roomId);
    return r ? `${r.name} · ${r.label}` : roomName(rooms, roomId);
  };
  const closeToDetails = () => setModal(current ? { kind: 'details', id: current.id } : { kind: 'none' });

  /** Disponibilidade da semana: do profissional filtrado ou, sem filtro, da clínica (funcionamento e almoço). */
  const weekAvailability = (dateKey: string): DayAvailability => {
    if (filters.professionalId !== 'todos') return availability.professionalDay(filters.professionalId, dateKey);
    const clinic = availability.clinicDay(dateKey);
    if (!clinic) return { window: null, closedReason: 'clinica_fechada', unavailable: [], pending: [] };
    return {
      window: { start: clinic.start, end: clinic.end },
      unavailable: clinic.lunch ? [{ ...clinic.lunch, kind: 'almoco', label: 'Almoço' }] : [],
      pending: [],
    };
  };

  function navigate(dir: 1 | -1) {
    if (view === 'dia') {
      let next = addDays(date, dir);
      if (next.getDay() === 0) next = addDays(next, dir);
      setDate(next);
    } else if (view === 'semana') setDate(addDays(date, 7 * dir));
    else setDate(addMonths(date, dir));
  }

  function toggleSpecialty(s: Specialty) {
    setFilters((f) => ({
      ...f,
      specialties: f.specialties.includes(s) ? f.specialties.filter((x) => x !== s) : [...f.specialties, s],
    }));
  }

  const openDetails = (a: AppointmentRecord) => setModal({ kind: 'details', id: a.id });
  const openNew = canEdit
    ? (dateKey?: string, time?: string, professionalId?: string) =>
        setModal({
          kind: 'new',
          prefill: {
            dateKey: dateKey ?? toDateKey(date),
            time,
            professionalId: professionalId ?? (filters.professionalId !== 'todos' ? filters.professionalId : undefined),
          },
        })
    : undefined;

  async function runQuick(kind: 'confirm' | 'checkIn' | 'noShow', a: AppointmentRecord) {
    setBusy(kind);
    const action = kind === 'confirm' ? confirm : kind === 'checkIn' ? checkIn : noShow;
    const result = await action.run(a.id);
    setBusy(null);
    if (!result) return;
    if (kind === 'confirm') toast({ tone: 'success', title: 'Presença confirmada', description: describe(a) });
    if (kind === 'checkIn') toast({ tone: 'success', title: 'Chegada registrada', description: `${a.patientName} aguarda ${a.professionalName}.` });
    if (kind === 'noShow') {
      toast({ tone: 'warning', title: 'Falta registrada', description: describe(a) });
      setModal({ kind: 'none' });
    }
  }

  const detailsActions = (a: AppointmentRecord) => {
    const open = isOpen(a);
    const isToday = a.start.startsWith(todayKey());
    const checkedIn = attendances.some((x) => x.appointmentId === a.id && x.checkInAt);
    return {
      confirm: a.status === 'agendada',
      checkIn: open && isToday && !checkedIn,
      noShow: open && a.start <= nowIso() && !checkedIn,
      edit: open,
      reschedule: canReschedule({ appointments: all }, a),
      cancel: open,
    };
  };

  const grid = loading ? (
    <div className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-sm" aria-busy="true" aria-label="Carregando agenda">
      <Skeleton className="h-8 w-1/3" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-sm" />
      ))}
    </div>
  ) : searching ? (
    <AgendaSearchResults query={query} results={searchResults} onSelectAppointment={openDetails} onClear={() => setQuery('')} />
  ) : view === 'semana' ? (
    <WeekView
      date={date}
      appointments={filtered}
      onSelectAppointment={openDetails}
      onSlotClick={openNew && ((k, t) => openNew(k, t))}
      onSelectDay={(d) => {
        setDate(d);
        setView('dia');
      }}
      availability={weekAvailability}
    />
  ) : view === 'dia' ? (
    <DayView
      date={date}
      appointments={filtered}
      professionals={visibleProfessionals}
      onSelectAppointment={openDetails}
      onSlotClick={openNew && ((k, t, p) => openNew(k, t, p))}
      availability={availability.professionalDay}
    />
  ) : (
    <MonthView
      date={date}
      appointments={filtered}
      onSelectAppointment={openDetails}
      onSelectDay={(d) => {
        setDate(d);
        setView('dia');
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <AgendaToolbar
          view={view}
          onViewChange={(v) => {
            setView(v);
            setQuery('');
          }}
          periodLabel={searching ? 'Pesquisa de consultas' : periodLabel(view, date)}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => setDate(parseKey(todayKey()))}
          filters={filters}
          onFiltersChange={setFilters}
          professionals={professionals}
          rooms={rooms}
          query={query}
          onQueryChange={setQuery}
          onNew={openNew && (() => openNew())}
          resultCount={resultCount}
        />
        {grid}
      </div>

      <AgendaSidebar
        className="w-full lg:sticky lg:top-24 lg:w-[300px] lg:shrink-0"
        date={date}
        month={startOfMonth(date)}
        onSelectDate={(d) => setDate(d)}
        appointments={all}
        professionals={professionals}
        specialties={activeSpecialties}
        rooms={rooms}
        activeSpecialties={filters.specialties}
        onToggleSpecialty={toggleSpecialty}
        activeRoomId={filters.roomId}
        onToggleRoom={(id) => setFilters((f) => ({ ...f, roomId: f.roomId === id ? 'todas' : id }))}
        availability={availability.professionalDay}
        clinicOpen={availability.clinicDay(toDateKey(date)) !== null}
      />

      <NewAppointmentModal
        open={modal.kind === 'new'}
        prefill={modal.kind === 'new' ? modal.prefill : undefined}
        patients={patients}
        professionals={professionals}
        services={services}
        rooms={rooms}
        error={create.error}
        saving={create.loading}
        onClose={() => {
          create.clearError();
          setModal({ kind: 'none' });
        }}
        onCreate={async (input) => {
          const a = await create.run(input);
          if (a) {
            setModal({ kind: 'none' });
            setDate(parseKey(a.start));
            toast({ tone: 'success', title: 'Agendamento criado', description: describe(a) });
          }
          return a;
        }}
      />

      <AppointmentDetailsModal
        open={modal.kind === 'details'}
        appointment={modal.kind === 'details' ? current : null}
        onClose={() => setModal({ kind: 'none' })}
        canEdit={canEdit}
        actions={current ? detailsActions(current) : { confirm: false, checkIn: false, noShow: false, edit: false, reschedule: false, cancel: false }}
        roomLabel={current ? roomLabel(current.roomId) : ''}
        attendance={current ? attendances.find((x) => x.appointmentId === current.id) : undefined}
        previous={current?.rescheduledFrom ? all.find((x) => x.id === current.rescheduledFrom) : undefined}
        next={current ? all.find((x) => x.rescheduledFrom === current.id) : undefined}
        onOpenAppointment={(id) => setModal({ kind: 'details', id })}
        busy={busy}
        onConfirm={(a) => void runQuick('confirm', a)}
        onCheckIn={(a) => void runQuick('checkIn', a)}
        onNoShow={(a) => void runQuick('noShow', a)}
        onEdit={(a) => setModal({ kind: 'edit', id: a.id })}
        onReschedule={(a) => setModal({ kind: 'reschedule', id: a.id })}
        onCancel={(a) => setModal({ kind: 'cancel', id: a.id })}
      />

      <EditAppointmentModal
        open={modal.kind === 'edit'}
        appointment={modal.kind === 'edit' ? current : null}
        professionals={professionals}
        services={services}
        rooms={rooms}
        error={edit.error}
        saving={edit.loading}
        onClose={() => {
          edit.clearError();
          closeToDetails();
        }}
        onSave={async (id, patch) => {
          const u = await edit.run(id, patch);
          if (u) {
            setModal({ kind: 'details', id: u.id });
            toast({
              tone: 'success',
              title: u.id === id ? 'Agendamento atualizado' : 'Agendamento transferido',
              description: u.id === id ? u.patientName : `${u.patientName} · agora com ${u.professionalName}`,
            });
          }
          return u;
        }}
      />

      <RescheduleModal
        open={modal.kind === 'reschedule'}
        appointment={modal.kind === 'reschedule' ? current : null}
        rooms={rooms}
        error={reschedule.error}
        saving={reschedule.loading}
        onClose={() => {
          reschedule.clearError();
          closeToDetails();
        }}
        onReschedule={async (a, iso, opts, notify) => {
          const next = await reschedule.run(a.id, iso, opts);
          if (next) {
            setModal({ kind: 'none' });
            setDate(parseKey(iso));
            toast({
              tone: 'success',
              title: 'Consulta reagendada',
              description: `${describe(next)}${notify ? ' · aviso por WhatsApp (simulação)' : ''}`,
            });
          }
          return next;
        }}
      />

      <CancelAppointmentModal
        open={modal.kind === 'cancel'}
        appointment={modal.kind === 'cancel' ? current : null}
        error={cancel.error}
        saving={cancel.loading}
        onClose={() => {
          cancel.clearError();
          closeToDetails();
        }}
        onConfirm={async (a, reason, notify) => {
          const done = await cancel.run(a.id, reason);
          if (done) {
            setModal({ kind: 'none' });
            toast({
              tone: 'danger',
              title: 'Consulta cancelada',
              description: `${a.patientName}${notify ? ' · paciente avisado por WhatsApp (simulação)' : ''}`,
            });
          }
          return done;
        }}
      />
    </div>
  );
}
