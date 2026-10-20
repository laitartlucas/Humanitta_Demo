import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { Appointment } from '@ds/mocks/types';
import { Button, Input, Modal, Switch, TimeSlot } from '@ds/components';
import { formatDate, formatTime, toDateKey } from '@ds/mocks/clinical';
import { buildIso, slotsFor } from '../agendaUtils';

export interface RescheduleModalProps {
  appointment: Appointment | null;
  appointments: Appointment[];
  open: boolean;
  onClose: () => void;
  onReschedule: (appointment: Appointment, newStartIso: string, notify: boolean) => void;
}

export function RescheduleModal({ appointment, appointments, open, onClose, onReschedule }: RescheduleModalProps) {
  const [dateKey, setDateKey] = useState('');
  const [time, setTime] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setDateKey(toDateKey(new Date(appointment.start)));
      setTime(null);
      setNotify(true);
      setSaving(false);
    }
  }, [open, appointment]);

  const slots = useMemo(
    () => (appointment && dateKey ? slotsFor(appointments, appointment.professionalId, dateKey, appointment.id) : []),
    [appointments, appointment, dateKey],
  );

  if (!appointment) return null;
  const free = slots.filter((s) => !s.busy).length;

  function submit() {
    if (!appointment || !time) return;
    setSaving(true);
    window.setTimeout(() => {
      onReschedule(appointment, buildIso(dateKey, time), notify);
      setSaving(false);
    }, 500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Reagendar consulta"
      description={`${appointment.patientName} · ${appointment.professionalName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button onClick={submit} disabled={!time} loading={saving}>
            Confirmar reagendamento
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-graphite-50 p-3 text-sm">
          <span className="text-graphite-500">Atual:</span>
          <span className="font-semibold text-graphite-800">
            {formatDate(appointment.start)} · {formatTime(appointment.start)}
          </span>
          <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-400" />
          <span className="text-graphite-500">Novo:</span>
          <span className="font-semibold text-gold-700">
            {time ? `${formatDate(dateKey)} · ${time}` : 'selecione um horário'}
          </span>
        </div>

        <Input
          id="rs-date"
          type="date"
          label="Nova data"
          value={dateKey}
          onChange={(e) => {
            setDateKey(e.target.value);
            setTime(null);
          }}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-graphite-800">
            Horários de {appointment.professionalName}{' '}
            <span className="font-normal text-graphite-500">· {free} livres</span>
          </legend>
          {slots.length === 0 ? (
            <p className="text-sm text-graphite-500">Selecione uma data válida.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {slots.map((s) => (
                <TimeSlot
                  key={s.time}
                  time={s.time}
                  state={s.busy ? 'ocupado' : time === s.time ? 'selecionado' : 'livre'}
                  onClick={s.busy ? undefined : () => setTime(s.time)}
                />
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex items-start gap-3 rounded-md border border-graphite-200 p-3">
          <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-ai" />
          <Switch
            checked={notify}
            onChange={setNotify}
            label="Avisar paciente pelo WhatsApp"
            description="Mensagem automática com a nova data (simulação)."
          />
        </div>
      </div>
    </Modal>
  );
}
