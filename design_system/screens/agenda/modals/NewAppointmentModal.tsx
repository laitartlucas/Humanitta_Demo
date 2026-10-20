import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Appointment } from '@ds/mocks/types';
import { Button, Input, Modal, Select, Textarea } from '@ds/components';
import {
  CHANNEL_NAMES,
  DEMO_TODAY,
  SERVICES_BY_SPECIALTY,
  SPECIALTY_NAMES,
  getRoomName,
  patients,
  professionals,
  toDateKey,
} from '@ds/mocks/clinical';
import { buildIso, slotsFor } from '../agendaUtils';

export interface NewAppointmentPrefill {
  dateKey?: string;
  time?: string;
  professionalId?: string;
  patientId?: string;
}

export interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (appointment: Appointment) => void;
  appointments: Appointment[];
  prefill?: NewAppointmentPrefill;
}

type Channel = NonNullable<Appointment['channel']>;

interface FormState {
  patientId: string;
  professionalId: string;
  service: string;
  dateKey: string;
  time: string;
  durationMin: string;
  price: string;
  channel: Channel;
  notes: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const DURATIONS = ['30', '40', '45', '50', '60', '90'];

function initialState(prefill?: NewAppointmentPrefill): FormState {
  const prof = professionals.find((p) => p.id === prefill?.professionalId);
  return {
    patientId: prefill?.patientId ?? '',
    professionalId: prof?.id ?? '',
    service: prof ? SERVICES_BY_SPECIALTY[prof.specialty][0] : '',
    dateKey: prefill?.dateKey ?? toDateKey(DEMO_TODAY),
    time: prefill?.time ?? '09:00',
    durationMin: '50',
    price: '',
    channel: 'presencial',
    notes: '',
  };
}

export function NewAppointmentModal({ open, onClose, onCreate, appointments, prefill }: NewAppointmentModalProps) {
  const [form, setForm] = useState<FormState>(() => initialState(prefill));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialState(prefill));
      setErrors({});
      setSaving(false);
    }
  }, [open, prefill]);

  const prof = professionals.find((p) => p.id === form.professionalId);
  const conflict = useMemo(() => {
    if (!form.professionalId || !form.dateKey || !form.time) return false;
    const slot = slotsFor(appointments, form.professionalId, form.dateKey).find((s) => s.time === form.time);
    return slot?.busy ?? false;
  }, [appointments, form.professionalId, form.dateKey, form.time]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const next: Errors = {};
    if (!form.patientId) next.patientId = 'Selecione o paciente.';
    if (!form.professionalId) next.professionalId = 'Selecione o profissional.';
    if (!form.service) next.service = 'Selecione o serviço.';
    if (!form.dateKey) next.dateKey = 'Informe a data.';
    if (!form.time) next.time = 'Informe o horário.';
    else if (conflict) next.time = 'Horário já ocupado para este profissional.';
    if (form.price && Number.isNaN(Number(form.price.replace(',', '.')))) next.price = 'Valor inválido.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !prof) return;

    const pat = patients.find((p) => p.id === form.patientId);
    if (!pat) return;
    setSaving(true);
    window.setTimeout(() => {
      onCreate({
        id: `ag-${Date.now()}`,
        patientId: pat.id,
        patientName: pat.name,
        professionalId: prof.id,
        professionalName: prof.name,
        specialty: prof.specialty,
        service: form.service,
        roomId: prof.roomId ?? 'sala-7',
        start: buildIso(form.dateKey, form.time),
        durationMin: Number(form.durationMin),
        status: 'agendada',
        price: form.price ? Number(form.price.replace(',', '.')) : 0,
        channel: form.channel,
        notes: form.notes || undefined,
      });
      setSaving(false);
    }, 600);
  }

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
          required
        />
        <Select
          id="na-professional"
          label="Profissional"
          placeholder="Selecione o profissional"
          value={form.professionalId}
          onChange={(e) => {
            const p = professionals.find((x) => x.id === e.target.value);
            setForm((f) => ({ ...f, professionalId: e.target.value, service: p ? SERVICES_BY_SPECIALTY[p.specialty][0] : '' }));
          }}
          options={professionals.map((p) => ({ value: p.id, label: `${p.name} — ${SPECIALTY_NAMES[p.specialty]}` }))}
          error={errors.professionalId}
          hint={prof ? `${getRoomName(prof.roomId ?? '')} · ${SPECIALTY_NAMES[prof.specialty]}` : undefined}
          required
        />
        <Select
          id="na-service"
          label="Serviço"
          placeholder={prof ? 'Selecione o serviço' : 'Escolha o profissional primeiro'}
          value={form.service}
          onChange={(e) => set('service', e.target.value)}
          options={prof ? SERVICES_BY_SPECIALTY[prof.specialty].map((s) => ({ value: s, label: s })) : []}
          disabled={!prof}
          error={errors.service}
          required
        />
        <Select
          id="na-duration"
          label="Duração"
          value={form.durationMin}
          onChange={(e) => set('durationMin', e.target.value)}
          options={DURATIONS.map((d) => ({ value: d, label: `${d} minutos` }))}
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
          error={errors.time ?? (conflict ? 'Horário já ocupado para este profissional.' : undefined)}
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
          id="na-price"
          inputMode="decimal"
          label="Valor (R$)"
          placeholder="0,00"
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          error={errors.price}
          hint="Valor fictício de demonstração."
        />
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
