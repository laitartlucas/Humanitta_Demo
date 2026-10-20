import { useMemo, useState } from 'react';
import type { Appointment, AppointmentStatus, Specialty } from '@ds/mocks/types';
import { useToast } from '@ds/components';
import { DEMO_TODAY, appointments as seedAppointments, formatDate, formatTime, professionals, toDateKey } from '@ds/mocks/clinical';
import { AgendaSidebar, AgendaToolbar, DayView, MonthView, WeekView } from './components';
import {
  AppointmentDetailsModal,
  CancelAppointmentModal,
  EditAppointmentModal,
  NewAppointmentModal,
  RescheduleModal,
  type NewAppointmentPrefill,
} from './modals';
import { addDays, addMonths, applyFilters, startOfMonth, weekDays, type AgendaFilters, type AgendaView } from './agendaUtils';

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

export function AgendaScreen({ initialView = 'semana' }: AgendaScreenProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<Appointment[]>(seedAppointments);
  const [view, setView] = useState<AgendaView>(initialView);
  const [date, setDate] = useState<Date>(DEMO_TODAY);
  const [filters, setFilters] = useState<AgendaFilters>({ professionalId: 'todos', specialties: [], status: 'todos' });
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  const visibleProfessionals = useMemo(
    () =>
      professionals.filter(
        (p) =>
          (filters.professionalId === 'todos' || p.id === filters.professionalId) &&
          (filters.specialties.length === 0 || filters.specialties.includes(p.specialty)),
      ),
    [filters],
  );

  const resultCount = useMemo(() => {
    if (view === 'dia') return filtered.filter((a) => a.start.startsWith(toDateKey(date))).length;
    if (view === 'semana') {
      const keys = weekDays(date).map(toDateKey);
      return filtered.filter((a) => keys.some((k) => a.start.startsWith(k))).length;
    }
    return filtered.filter((a) => {
      const d = new Date(a.start);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).length;
  }, [filtered, view, date]);

  const current = modal.kind !== 'none' && modal.kind !== 'new' ? items.find((a) => a.id === modal.id) ?? null : null;

  function navigate(dir: 1 | -1) {
    if (view === 'dia') {
      let next = addDays(date, dir);
      if (next.getDay() === 0) next = addDays(next, dir);
      setDate(next);
    } else if (view === 'semana') setDate(addDays(date, 7 * dir));
    else setDate(addMonths(date, dir));
  }

  function update(id: string, patch: Partial<Appointment>) {
    setItems((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function setStatus(a: Appointment, status: AppointmentStatus, title: string, tone: 'success' | 'info' | 'warning' = 'success') {
    update(a.id, { status });
    toast({ tone, title, description: `${a.patientName} · ${formatDate(a.start)} às ${formatTime(a.start)}` });
  }

  function toggleSpecialty(s: Specialty) {
    setFilters((f) => ({
      ...f,
      specialties: f.specialties.includes(s) ? f.specialties.filter((x) => x !== s) : [...f.specialties, s],
    }));
  }

  const openDetails = (a: Appointment) => setModal({ kind: 'details', id: a.id });
  const openNew = (dateKey?: string, time?: string, professionalId?: string) =>
    setModal({ kind: 'new', prefill: { dateKey: dateKey ?? toDateKey(date), time, professionalId } });

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <AgendaToolbar
          view={view}
          onViewChange={setView}
          periodLabel={periodLabel(view, date)}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => setDate(DEMO_TODAY)}
          filters={filters}
          onFiltersChange={setFilters}
          professionals={professionals}
          onNew={() => openNew()}
          resultCount={resultCount}
        />

        {view === 'semana' && (
          <WeekView
            date={date}
            appointments={filtered}
            onSelectAppointment={openDetails}
            onSlotClick={(k, t) => openNew(k, t)}
            onSelectDay={(d) => {
              setDate(d);
              setView('dia');
            }}
          />
        )}
        {view === 'dia' && (
          <DayView
            date={date}
            appointments={filtered}
            professionals={visibleProfessionals}
            onSelectAppointment={openDetails}
            onSlotClick={(k, t, p) => openNew(k, t, p)}
          />
        )}
        {view === 'mes' && (
          <MonthView
            date={date}
            appointments={filtered}
            onSelectAppointment={openDetails}
            onSelectDay={(d) => {
              setDate(d);
              setView('dia');
            }}
          />
        )}
      </div>

      <AgendaSidebar
        className="w-full lg:sticky lg:top-24 lg:w-[300px] lg:shrink-0"
        date={date}
        month={startOfMonth(date)}
        onSelectDate={(d) => setDate(d)}
        appointments={items}
        professionals={professionals}
        activeSpecialties={filters.specialties}
        onToggleSpecialty={toggleSpecialty}
      />

      <NewAppointmentModal
        open={modal.kind === 'new'}
        prefill={modal.kind === 'new' ? modal.prefill : undefined}
        appointments={items}
        onClose={() => setModal({ kind: 'none' })}
        onCreate={(a) => {
          setItems((list) => [...list, a]);
          setModal({ kind: 'none' });
          setDate(new Date(a.start));
          toast({ tone: 'success', title: 'Agendamento criado', description: `${a.patientName} · ${formatDate(a.start)} às ${formatTime(a.start)}` });
        }}
      />

      <AppointmentDetailsModal
        open={modal.kind === 'details'}
        appointment={modal.kind === 'details' ? current : null}
        onClose={() => setModal({ kind: 'none' })}
        onConfirm={(a) => setStatus(a, 'confirmada', 'Presença confirmada')}
        onStart={(a) => setStatus(a, 'em_atendimento', 'Atendimento iniciado', 'info')}
        onComplete={(a) => setStatus(a, 'concluida', 'Atendimento concluído')}
        onNoShow={(a) => {
          setStatus(a, 'faltou', 'Falta registrada', 'warning');
          setModal({ kind: 'none' });
        }}
        onEdit={(a) => setModal({ kind: 'edit', id: a.id })}
        onReschedule={(a) => setModal({ kind: 'reschedule', id: a.id })}
        onCancel={(a) => setModal({ kind: 'cancel', id: a.id })}
      />

      <EditAppointmentModal
        open={modal.kind === 'edit'}
        appointment={modal.kind === 'edit' ? current : null}
        onClose={() => setModal(current ? { kind: 'details', id: current.id } : { kind: 'none' })}
        onSave={(u) => {
          update(u.id, u);
          setModal({ kind: 'details', id: u.id });
          toast({ tone: 'success', title: 'Agendamento atualizado', description: u.patientName });
        }}
      />

      <RescheduleModal
        open={modal.kind === 'reschedule'}
        appointment={modal.kind === 'reschedule' ? current : null}
        appointments={items}
        onClose={() => setModal(current ? { kind: 'details', id: current.id } : { kind: 'none' })}
        onReschedule={(a, iso, notify) => {
          update(a.id, { start: iso, status: 'reagendada' });
          setModal({ kind: 'none' });
          setDate(new Date(iso));
          toast({
            tone: 'success',
            title: 'Consulta reagendada',
            description: `${a.patientName} · ${formatDate(iso)} às ${formatTime(iso)}${notify ? ' · aviso enviado por WhatsApp' : ''}`,
          });
        }}
      />

      <CancelAppointmentModal
        open={modal.kind === 'cancel'}
        appointment={modal.kind === 'cancel' ? current : null}
        onClose={() => setModal(current ? { kind: 'details', id: current.id } : { kind: 'none' })}
        onConfirm={(a, reason, notify) => {
          update(a.id, { status: 'cancelada', notes: `Cancelada: ${reason}` });
          setModal({ kind: 'none' });
          toast({
            tone: 'danger',
            title: 'Consulta cancelada',
            description: `${a.patientName}${notify ? ' · paciente avisado por WhatsApp' : ''}`,
          });
        }}
      />
    </div>
  );
}
