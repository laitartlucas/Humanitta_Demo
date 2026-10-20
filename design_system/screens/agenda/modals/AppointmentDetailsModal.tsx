import type { ReactNode } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  Clock,
  DoorOpen,
  MessageCircle,
  Pencil,
  Play,
  Stethoscope,
  UserX,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { Appointment } from '@ds/mocks/types';
import { Avatar, Badge, Button, Modal, SpecialtyTag, StatusBadge } from '@ds/components';
import { CHANNEL_NAMES, addMinutes, formatCurrency, formatDate, formatTime, getRoomName } from '@ds/mocks/clinical';

export interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (a: Appointment) => void;
  onStart: (a: Appointment) => void;
  onComplete: (a: Appointment) => void;
  onNoShow: (a: Appointment) => void;
  onEdit: (a: Appointment) => void;
  onReschedule: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-graphite-50 text-graphite-600">
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-graphite-500">{label}</dt>
        <dd className="text-sm text-graphite-900">{children}</dd>
      </div>
    </div>
  );
}

export function AppointmentDetailsModal({
  appointment: a,
  open,
  onClose,
  onConfirm,
  onStart,
  onComplete,
  onNoShow,
  onEdit,
  onReschedule,
  onCancel,
}: AppointmentDetailsModalProps) {
  if (!a) return null;
  const closed = a.status === 'cancelada' || a.status === 'concluida' || a.status === 'faltou';
  const end = addMinutes(a.start, a.durationMin);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Detalhes do agendamento"
      description={`${formatDate(a.start, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatTime(a.start)}–${formatTime(end)}`}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {!closed && (
            <Button variant="ghost" leftIcon={XCircle} onClick={() => onCancel(a)} className="text-danger sm:mr-auto">
              Cancelar consulta
            </Button>
          )}
          {!closed && a.status !== 'em_atendimento' && (
            <Button variant="secondary" leftIcon={CalendarClock} onClick={() => onReschedule(a)}>
              Reagendar
            </Button>
          )}
          {(a.status === 'agendada' || a.status === 'reagendada') && (
            <Button leftIcon={CheckCircle2} onClick={() => onConfirm(a)}>
              Confirmar presença
            </Button>
          )}
          {a.status === 'confirmada' && (
            <Button leftIcon={Play} onClick={() => onStart(a)}>
              Iniciar atendimento
            </Button>
          )}
          {a.status === 'em_atendimento' && (
            <Button leftIcon={CircleCheckBig} onClick={() => onComplete(a)}>
              Concluir atendimento
            </Button>
          )}
          {closed && (
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-graphite-200 bg-graphite-50 p-4">
          <Avatar name={a.patientName} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-tight text-graphite-900">{a.patientName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={a.status} />
              <SpecialtyTag specialty={a.specialty} variant="chip" />
              {a.channel && (
                <Badge tone={a.channel === 'assistente_ia' ? 'ai' : 'neutral'} icon={MessageCircle} size="sm">
                  {CHANNEL_NAMES[a.channel]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row icon={Stethoscope} label="Profissional">
            {a.professionalName}
          </Row>
          <Row icon={Clock} label="Serviço">
            {a.service} · {a.durationMin} min
          </Row>
          <Row icon={DoorOpen} label="Sala">
            {getRoomName(a.roomId)}
          </Row>
          <Row icon={Wallet} label="Valor (demonstração)">
            <span className="tabular-nums">{formatCurrency(a.price)}</span>
          </Row>
        </dl>

        {a.notes && (
          <div className="rounded-sm border border-graphite-200 p-3 text-sm text-graphite-700">
            <span className="block text-xs font-semibold text-graphite-500">Observações administrativas</span>
            {a.notes}
          </div>
        )}

        {!closed && (
          <div className="flex flex-wrap gap-2 border-t border-graphite-100 pt-4">
            <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => onEdit(a)}>
              Editar
            </Button>
            {a.status !== 'em_atendimento' && (
              <Button variant="secondary" size="sm" leftIcon={UserX} onClick={() => onNoShow(a)}>
                Marcar falta
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
