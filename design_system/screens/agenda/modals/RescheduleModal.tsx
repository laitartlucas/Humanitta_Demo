import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { nowIso, type AppError, type AppointmentRecord, type RoomRecord } from '@core';
import type { RescheduleOptions } from '@modules/agenda/agendaService';
import { useAgendaSlots } from '@modules/agenda/hooks';
import { Button, Input, Modal, Select, Switch, TimeSlot } from '@ds/components';
import { formatDate, formatTime, toDateKey } from '@ds/mocks/clinical';
import { buildIso } from '../agendaUtils';

export interface RescheduleModalProps {
  appointment: AppointmentRecord | null;
  rooms: RoomRecord[];
  open: boolean;
  onClose: () => void;
  /** Envia ao serviço da Agenda. Devolve o novo agendamento ou `undefined` em caso de erro. */
  onReschedule: (
    appointment: AppointmentRecord,
    newStartIso: string,
    opts: RescheduleOptions,
    notify: boolean,
  ) => Promise<AppointmentRecord | undefined>;
  error?: AppError | null;
  saving?: boolean;
}

export function RescheduleModal({ appointment, rooms, open, onClose, onReschedule, error, saving = false }: RescheduleModalProps) {
  const [dateKey, setDateKey] = useState('');
  const [time, setTime] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');
  const [notify, setNotify] = useState(true);

  // Reinicia o formulário só ao abrir ou ao trocar de registro (ID) — nunca por recálculo da tela
  // (ex.: cronômetro do atendimento), que antes desmarcava campos com o diálogo aberto.
  const appointmentId = appointment?.id;
  useEffect(() => {
    if (open && appointment) {
      setDateKey(toDateKey(new Date(appointment.start)));
      setTime(null);
      const current = rooms.find((r) => r.id === appointment.roomId);
      setRoomId(current?.active ? current.id : '');
      setNotify(true);
    }
  }, [open, appointmentId]);

  const slots = useAgendaSlots({
    professionalId: appointment?.professionalId,
    dateKey,
    durationMin: appointment?.durationMin ?? 30,
    roomId: roomId || undefined,
    ignoreIds: appointment ? [appointment.id] : [],
    notBefore: nowIso(),
  });

  if (!appointment) return null;
  const free = slots.filter((s) => s.state === 'livre').length;
  const sameRoom = roomId === appointment.roomId;
  const roomError = error?.fields?.roomId ?? (!roomId ? 'A sala atual está inativa. Escolha outra sala.' : undefined);

  function submit() {
    if (!appointment || !time || !roomId) return;
    void onReschedule(appointment, buildIso(dateKey, time), { roomId }, notify);
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
          <Button onClick={submit} disabled={!time || !roomId} loading={saving}>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="rs-date"
            type="date"
            label="Nova data"
            value={dateKey}
            onChange={(e) => {
              setDateKey(e.target.value);
              setTime(null);
            }}
            error={error?.fields?.start}
          />
          <Select
            id="rs-room"
            label="Sala"
            placeholder="Selecione a sala"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setTime(null);
            }}
            options={rooms.filter((r) => r.active).map((r) => ({ value: r.id, label: `${r.name} · ${r.label}` }))}
            error={roomError}
            hint={!roomError && sameRoom ? 'Mesma profissional e sala.' : undefined}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-graphite-800">
            Horários de {appointment.professionalName}{' '}
            <span className="font-normal text-graphite-500">· {free} livres</span>
          </legend>
          {slots.length === 0 ? (
            <p className="text-sm text-graphite-500">
              {dateKey ? 'Sem atendimento nesta data (clínica fechada ou fora do expediente do profissional).' : 'Selecione uma data válida.'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {slots.map((s) => (
                <span key={s.time} title={s.reason}>
                  <TimeSlot
                    time={s.time}
                    state={s.state === 'livre' && time === s.time ? 'selecionado' : s.state}
                    onClick={s.state === 'livre' ? () => setTime(s.time) : undefined}
                    className="w-full"
                  />
                </span>
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
