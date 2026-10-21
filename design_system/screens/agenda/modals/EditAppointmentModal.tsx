import { useEffect, useState, type FormEvent } from 'react';
import type { AppError, AppointmentRecord, Professional, RoomRecord, ServiceRecord } from '@core';
import type { AgendaEditPatch } from '@modules/agenda/agendaService';
import { useSlotIssues } from '@modules/agenda/hooks';
import { Button, Input, Modal, Select, Textarea } from '@ds/components';
import { CHANNEL_NAMES, SPECIALTY_NAMES } from '@ds/mocks/clinical';

export interface EditAppointmentModalProps {
  appointment: AppointmentRecord | null;
  open: boolean;
  onClose: () => void;
  /** Envia ao serviço da Agenda. Devolve o agendamento salvo ou `undefined` em caso de erro. */
  onSave: (id: string, patch: AgendaEditPatch) => Promise<AppointmentRecord | undefined>;
  professionals: Professional[];
  services: ServiceRecord[];
  rooms: RoomRecord[];
  error?: AppError | null;
  saving?: boolean;
}

type Channel = NonNullable<AppointmentRecord['channel']>;

const DURATIONS = ['30', '40', '45', '50', '60', '90'];

export function EditAppointmentModal({ appointment, open, onClose, onSave, professionals, services, rooms, error, saving = false }: EditAppointmentModalProps) {
  const [professionalId, setProfessionalId] = useState('');
  const [service, setService] = useState('');
  const [roomId, setRoomId] = useState('');
  const [duration, setDuration] = useState('50');
  const [price, setPrice] = useState('');
  const [channel, setChannel] = useState<Channel>('presencial');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (open && appointment) {
      setProfessionalId(appointment.professionalId);
      setService(appointment.service);
      setRoomId(appointment.roomId);
      setDuration(String(appointment.durationMin));
      setPrice(appointment.price.toFixed(2).replace('.', ','));
      setChannel(appointment.channel ?? 'presencial');
      setNotes(appointment.notes ?? '');
      setFieldErrors({});
    }
  }, [open, appointment]);

  useEffect(() => {
    if (error?.fields) setFieldErrors((e) => ({ ...e, ...error.fields }));
  }, [error]);

  const prof = professionals.find((p) => p.id === professionalId);
  const changesSchedule =
    !!appointment && (professionalId !== appointment.professionalId || roomId !== appointment.roomId || Number(duration) !== appointment.durationMin);
  const issues = useSlotIssues(
    appointment && prof && changesSchedule
      ? { professionalId: prof.id, start: appointment.start, durationMin: Number(duration), roomId: roomId || undefined, ignoreIds: [appointment.id] }
      : null,
  );

  if (!appointment) return null;
  const serviceOptions = prof ? services.filter((sv) => sv.active && sv.specialty === prof.specialty).map((sv) => sv.name) : [];
  const durationOptions = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration];
  const profChanged = professionalId !== appointment.professionalId;
  const roomOptions = rooms.filter((r) => r.active || r.id === roomId);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!appointment || !prof) return;
    const value = Number(price.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(value) || value < 0) {
      setFieldErrors((f) => ({ ...f, price: 'Informe um valor válido.' }));
      return;
    }
    const sv = services.find((x) => x.name === service && x.specialty === prof.specialty);
    await onSave(appointment.id, {
      professionalId: profChanged ? prof.id : undefined,
      service,
      serviceId: sv?.id,
      roomId,
      durationMin: Number(duration),
      price: value,
      channel,
      notes: notes.trim() || undefined,
    });
  }

  const startIssue = fieldErrors.start ?? issues.find((i) => i.field === 'start')?.message;
  const roomIssue = fieldErrors.roomId ?? issues.find((i) => i.field === 'roomId')?.message;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Editar agendamento"
      description={`${appointment.patientName} · para mudar data ou horário, use “Reagendar”.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-appointment-form" loading={saving}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="edit-appointment-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id="ea-professional"
          label="Profissional"
          value={professionalId}
          onChange={(e) => {
            const p = professionals.find((x) => x.id === e.target.value);
            setProfessionalId(e.target.value);
            setFieldErrors({});
            if (!p) return;
            const opts = services.filter((sv) => sv.active && sv.specialty === p.specialty);
            if (!opts.some((sv) => sv.name === service) && opts[0]) {
              setService(opts[0].name);
              setDuration(String(opts[0].durationMin));
            }
            const room = rooms.find((r) => r.id === p.roomId);
            setRoomId(p.id === appointment.professionalId ? appointment.roomId : room?.active ? room.id : '');
          }}
          options={professionals.map((p) => ({ value: p.id, label: `${p.name} — ${SPECIALTY_NAMES[p.specialty]}` }))}
          error={fieldErrors.professionalId}
          hint={profChanged ? 'Trocar o profissional cria um novo agendamento no mesmo horário; o original fica como reagendado.' : undefined}
        />
        <Select
          id="ea-service"
          label="Serviço"
          value={service}
          onChange={(e) => setService(e.target.value)}
          options={(serviceOptions.includes(service) ? serviceOptions : [service, ...serviceOptions]).map((s) => ({ value: s, label: s }))}
          error={fieldErrors.service}
        />
        <Select
          id="ea-duration"
          label="Duração"
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value);
            setFieldErrors((f) => ({ ...f, start: undefined, durationMin: undefined }));
          }}
          options={durationOptions.map((d) => ({ value: d, label: `${d} minutos` }))}
          error={fieldErrors.durationMin ?? startIssue}
        />
        <Select
          id="ea-room"
          label="Sala"
          placeholder="Selecione a sala"
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value);
            setFieldErrors((f) => ({ ...f, roomId: undefined }));
          }}
          options={roomOptions.map((r) => ({ value: r.id, label: `${r.name} · ${r.active ? r.label : 'inativa'}` }))}
          error={roomIssue}
        />
        <Select
          id="ea-channel"
          label="Canal de origem"
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel)}
          options={(Object.keys(CHANNEL_NAMES) as Channel[]).map((c) => ({ value: c, label: CHANNEL_NAMES[c] }))}
        />
        <Input
          id="ea-price"
          label="Valor (R$)"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={fieldErrors.price}
          hint="Valor fictício de demonstração."
        />
        <div className="sm:col-span-2">
          <Textarea
            id="ea-notes"
            label="Observações administrativas"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            hint="Não registre informações clínicas aqui."
          />
        </div>
      </form>
    </Modal>
  );
}
