import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { nowIso, todayKey, type AppError, type AppointmentRecord, type PatientRecord, type Professional, type RoomRecord, type ServiceRecord } from '@core';
import type { AgendaAppointmentInput } from '@modules/agenda/agendaService';
import { useAgendaSlots, useSlotIssues } from '@modules/agenda/hooks';
import { Button, Input, Modal, Select, Textarea, TimeSlot } from '@ds/components';
import { CHANNEL_NAMES, SPECIALTY_NAMES } from '@ds/mocks/clinical';
import { buildIso } from '../agendaUtils';

export interface NewAppointmentPrefill {
  dateKey?: string;
  time?: string;
  professionalId?: string;
  patientId?: string;
}

export interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  /** Envia ao serviço da Agenda. Devolve o agendamento criado ou `undefined` em caso de erro. */
  onCreate: (input: AgendaAppointmentInput) => Promise<AppointmentRecord | undefined>;
  patients: PatientRecord[];
  professionals: Professional[];
  services: ServiceRecord[];
  rooms: RoomRecord[];
  /** Último erro do serviço (campos inválidos, conflito de horário/sala). */
  error?: AppError | null;
  saving?: boolean;
  prefill?: NewAppointmentPrefill;
}

type Channel = NonNullable<AppointmentRecord['channel']>;

interface FormState {
  patientId: string;
  professionalId: string;
  serviceId: string;
  roomId: string;
  dateKey: string;
  time: string;
  durationMin: string;
  price: string;
  channel: Channel;
  notes: string;
}

/** Erros do formulário e dos campos devolvidos pelo serviço (`start`, `service`). */
type Errors = Partial<Record<keyof FormState | 'start' | 'service', string>>;

const DURATIONS = ['30', '40', '45', '50', '60', '90'];

/** Sala padrão do profissional (se ativa) a partir das listas já carregadas. */
function roomFor(prof: Professional | undefined, rooms: RoomRecord[]): string {
  const room = rooms.find((r) => r.id === prof?.roomId);
  return room?.active ? room.id : '';
}

function serviceDefaults(sv: ServiceRecord | undefined): Pick<FormState, 'durationMin' | 'price'> {
  return {
    durationMin: sv ? String(sv.durationMin) : '50',
    price: sv?.price != null ? sv.price.toFixed(2).replace('.', ',') : '',
  };
}

export function NewAppointmentModal({
  open,
  onClose,
  onCreate,
  patients,
  professionals,
  services,
  rooms,
  error,
  saving = false,
  prefill,
}: NewAppointmentModalProps) {
  const servicesOf = (p?: Professional) => (p ? services.filter((sv) => sv.active && sv.specialty === p.specialty) : []);

  const initialState = (): FormState => {
    const prof = professionals.find((p) => p.id === prefill?.professionalId);
    const sv = servicesOf(prof)[0];
    return {
      patientId: prefill?.patientId ?? '',
      professionalId: prof?.id ?? '',
      serviceId: sv?.id ?? '',
      roomId: roomFor(prof, rooms),
      dateKey: prefill?.dateKey ?? todayKey(),
      time: prefill?.time ?? '09:00',
      channel: 'presencial',
      notes: '',
      ...serviceDefaults(sv),
    };
  };

  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (open) {
      setForm(initialState());
      setErrors({});
    }
  }, [open, prefill]);

  // Erros vindos do serviço (validação/conflito) aparecem nos campos.
  useEffect(() => {
    if (error?.fields) setErrors((e) => ({ ...e, ...error.fields }));
  }, [error]);

  const prof = professionals.find((p) => p.id === form.professionalId);
  const patient = patients.find((p) => p.id === form.patientId);
  const service = services.find((sv) => sv.id === form.serviceId);
  const room = rooms.find((r) => r.id === form.roomId);
  const defaultRoom = prof ? rooms.find((r) => r.id === prof.roomId) : undefined;
  const durationMin = Number(form.durationMin);

  const slots = useAgendaSlots({ professionalId: form.professionalId || undefined, dateKey: form.dateKey, durationMin, roomId: form.roomId || undefined, notBefore: nowIso() });
  const free = slots.filter((s) => s.state === 'livre');
  const issues = useSlotIssues(
    prof && form.dateKey && /^\d{2}:\d{2}$/.test(form.time)
      ? { professionalId: prof.id, start: buildIso(form.dateKey, form.time), durationMin, roomId: form.roomId || undefined, notBefore: nowIso() }
      : null,
  );
  const liveTimeIssue = issues.find((i) => i.field === 'start')?.message;
  const liveRoomIssue = issues.find((i) => i.field === 'roomId')?.message;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, ...(k === 'dateKey' || k === 'time' ? { start: undefined } : {}) }));
  };

  const patientHint = useMemo(() => {
    if (!patient) return undefined;
    return [patient.phone, patient.city, patient.tags.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  }, [patient]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const next: Errors = {};
    if (!form.patientId) next.patientId = 'Selecione o paciente.';
    if (!form.professionalId) next.professionalId = 'Selecione o profissional.';
    if (!form.serviceId) next.serviceId = 'Selecione o serviço.';
    if (!form.roomId) next.roomId = 'Selecione a sala.';
    if (!form.dateKey) next.dateKey = 'Informe a data.';
    if (!form.time) next.time = 'Informe o horário.';
    const price = form.price ? Number(form.price.replace(/\./g, '').replace(',', '.')) : undefined;
    if (price !== undefined && (Number.isNaN(price) || price < 0)) next.price = 'Valor inválido.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !prof || !service) return;

    await onCreate({
      patientId: form.patientId,
      professionalId: prof.id,
      service: service.name,
      serviceId: service.id,
      roomId: form.roomId,
      start: buildIso(form.dateKey, form.time),
      durationMin,
      price,
      channel: form.channel,
      notes: form.notes.trim() || undefined,
    });
  }

  const timeError = errors.time ?? errors.start ?? liveTimeIssue;
  const roomError = errors.roomId ?? liveRoomIssue;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Novo agendamento"
      description="Preencha os dados para reservar o horário. Valores são fictícios (demonstração)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-appointment-form" loading={saving}>
            Agendar
          </Button>
        </>
      }
    >
      <form id="new-appointment-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id="na-patient"
          label="Paciente"
          placeholder="Selecione o paciente"
          value={form.patientId}
          onChange={(e) => set('patientId', e.target.value)}
          options={patients.filter((p) => p.status === 'ativo').map((p) => ({ value: p.id, label: p.name }))}
          error={errors.patientId}
          hint={patientHint}
          required
        />
        <Select
          id="na-professional"
          label="Profissional"
          placeholder="Selecione o profissional"
          value={form.professionalId}
          onChange={(e) => {
            const p = professionals.find((x) => x.id === e.target.value);
            const sv = servicesOf(p)[0];
            setForm((f) => ({ ...f, professionalId: e.target.value, serviceId: sv?.id ?? '', roomId: roomFor(p, rooms), ...serviceDefaults(sv) }));
            setErrors((er) => ({ ...er, professionalId: undefined, serviceId: undefined, roomId: undefined, start: undefined }));
          }}
          options={professionals.map((p) => ({ value: p.id, label: `${p.name} — ${SPECIALTY_NAMES[p.specialty]}` }))}
          error={errors.professionalId}
          hint={prof ? SPECIALTY_NAMES[prof.specialty] : undefined}
          required
        />
        <Select
          id="na-service"
          label="Serviço"
          placeholder={prof ? 'Selecione o serviço' : 'Escolha o profissional primeiro'}
          value={form.serviceId}
          onChange={(e) => {
            const sv = services.find((x) => x.id === e.target.value);
            setForm((f) => ({ ...f, serviceId: e.target.value, ...serviceDefaults(sv) }));
            setErrors((er) => ({ ...er, serviceId: undefined }));
          }}
          options={servicesOf(prof).map((s) => ({ value: s.id, label: s.name }))}
          disabled={!prof}
          error={errors.serviceId ?? errors.service}
          required
        />
        <Select
          id="na-duration"
          label="Duração"
          value={form.durationMin}
          onChange={(e) => set('durationMin', e.target.value)}
          options={(DURATIONS.includes(form.durationMin) ? DURATIONS : [...DURATIONS, form.durationMin]).map((d) => ({ value: d, label: `${d} minutos` }))}
          hint={service && String(service.durationMin) === form.durationMin ? 'Padrão do serviço.' : undefined}
        />
        <Select
          id="na-room"
          label="Sala"
          placeholder="Selecione a sala"
          value={form.roomId}
          onChange={(e) => set('roomId', e.target.value)}
          options={rooms.filter((r) => r.active).map((r) => ({ value: r.id, label: `${r.name} · ${r.label}` }))}
          error={roomError}
          hint={
            !roomError && room && room.id === defaultRoom?.id
              ? 'Sala padrão do profissional.'
              : !roomError && defaultRoom && !defaultRoom.active
                ? `${defaultRoom.name} (padrão) está inativa nas Configurações.`
                : undefined
          }
          required
        />
        <Select
          id="na-channel"
          label="Canal de origem"
          value={form.channel}
          onChange={(e) => set('channel', e.target.value as Channel)}
          options={(Object.keys(CHANNEL_NAMES) as Channel[]).map((c) => ({ value: c, label: CHANNEL_NAMES[c] }))}
        />
        <Input
          id="na-date"
          type="date"
          label="Data"
          value={form.dateKey}
          onChange={(e) => set('dateKey', e.target.value)}
          error={errors.dateKey}
          required
        />
        <Input
          id="na-time"
          type="time"
          label="Horário"
          step={900}
          value={form.time}
          onChange={(e) => set('time', e.target.value)}
          error={timeError}
          required
        />

        {prof && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-graphite-800">
              Horários de {prof.name}
              {room ? ` · ${room.name}` : ''}{' '}
              <span className="font-normal text-graphite-500">
                · {slots.length === 0 ? 'sem atendimento nesta data' : `${free.length} ${free.length === 1 ? 'horário livre' : 'horários livres'}`}
              </span>
            </legend>
            {slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {slots.map((s) => (
                  <span key={s.time} title={s.reason}>
                    <TimeSlot
                      time={s.time}
                      state={s.state === 'livre' && form.time === s.time ? 'selecionado' : s.state}
                      onClick={s.state === 'livre' ? () => set('time', s.time) : undefined}
                      className="w-full"
                    />
                  </span>
                ))}
              </div>
            )}
          </fieldset>
        )}

        <Input
          id="na-price"
          inputMode="decimal"
          label="Valor (R$)"
          placeholder="0,00"
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          error={errors.price}
          hint={service && service.price == null ? 'Preço do serviço: R$ [definir] · valor fictício de demonstração.' : 'Valor fictício de demonstração.'}
        />
        {patient?.adminNote ? (
          <div className="flex items-start gap-2 rounded-sm border border-graphite-200 bg-graphite-50 p-3 text-sm text-graphite-700">
            <Info size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
            <p>
              <span className="block text-xs font-semibold text-graphite-500">Observação da recepção</span>
              {patient.adminNote}
            </p>
          </div>
        ) : (
          <div aria-hidden="true" className="hidden sm:block" />
        )}
        <div className="sm:col-span-2">
          <Textarea
            id="na-notes"
            label="Observações administrativas"
            placeholder="Ex.: preferência de horário, lembrete por WhatsApp…"
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            hint="Não registre informações clínicas aqui."
          />
        </div>
      </form>
    </Modal>
  );
}
