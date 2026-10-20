import { useEffect, useState, type FormEvent } from 'react';
import type { Appointment } from '@ds/mocks/types';
import { Button, Input, Modal, Select, Textarea } from '@ds/components';
import { CHANNEL_NAMES, SERVICES_BY_SPECIALTY, SPECIALTY_NAMES, professionals } from '@ds/mocks/clinical';

export interface EditAppointmentModalProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Appointment) => void;
}

type Channel = NonNullable<Appointment['channel']>;

const DURATIONS = ['30', '40', '45', '50', '60', '90'];

export function EditAppointmentModal({ appointment, open, onClose, onSave }: EditAppointmentModalProps) {
  const [professionalId, setProfessionalId] = useState('');
  const [service, setService] = useState('');
  const [duration, setDuration] = useState('50');
  const [price, setPrice] = useState('');
  const [channel, setChannel] = useState<Channel>('presencial');
  const [notes, setNotes] = useState('');
  const [priceError, setPriceError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setProfessionalId(appointment.professionalId);
      setService(appointment.service);
      setDuration(String(appointment.durationMin));
      setPrice(appointment.price.toFixed(2).replace('.', ','));
      setChannel(appointment.channel ?? 'presencial');
      setNotes(appointment.notes ?? '');
      setPriceError(undefined);
      setSaving(false);
    }
  }, [open, appointment]);

  if (!appointment) return null;
  const prof = professionals.find((p) => p.id === professionalId);
  const serviceOptions = prof ? SERVICES_BY_SPECIALTY[prof.specialty] : [];
  const durationOptions = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration];

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!appointment || !prof) return;
    const value = Number(price.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(value) || value < 0) {
      setPriceError('Informe um valor válido.');
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      onSave({
        ...appointment,
        professionalId: prof.id,
        professionalName: prof.name,
        specialty: prof.specialty,
        roomId: prof.roomId ?? appointment.roomId,
        service,
        durationMin: Number(duration),
        price: value,
        channel,
        notes: notes || undefined,
      });
      setSaving(false);
    }, 500);
  }

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
            if (p && !SERVICES_BY_SPECIALTY[p.specialty].includes(service)) setService(SERVICES_BY_SPECIALTY[p.specialty][0]);
          }}
          options={professionals.map((p) => ({ value: p.id, label: `${p.name} — ${SPECIALTY_NAMES[p.specialty]}` }))}
        />
        <Select
          id="ea-service"
          label="Serviço"
          value={service}
          onChange={(e) => setService(e.target.value)}
          options={(serviceOptions.includes(service) ? serviceOptions : [service, ...serviceOptions]).map((s) => ({ value: s, label: s }))}
        />
        <Select
          id="ea-duration"
          label="Duração"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          options={durationOptions.map((d) => ({ value: d, label: `${d} minutos` }))}
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
          error={priceError}
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
