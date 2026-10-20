import type { ReactNode } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  DoorOpen,
  Eye,
  History,
  LogIn,
  MessageCircle,
  Pencil,
  Stethoscope,
  UserCheck,
  UserX,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { AppointmentRecord, Attendance } from '@core';
import { Avatar, Badge, Button, Modal, SpecialtyTag, StatusBadge } from '@ds/components';
import { CHANNEL_NAMES, addMinutes, formatCurrency, formatDate, formatTime } from '@ds/mocks/clinical';

export interface AppointmentDetailsModalProps {
  appointment: AppointmentRecord | null;
  open: boolean;
  onClose: () => void;
  /** Perfil pode alterar a agenda (`agenda_clinica ≥ editar`). Sem isso, só visualização. */
  canEdit: boolean;
  /** Ações disponíveis para o status/horário atual (calculadas pela tela com as regras da Agenda). */
  actions: { confirm: boolean; checkIn: boolean; noShow: boolean; edit: boolean; reschedule: boolean; cancel: boolean };
  roomLabel: string;
  attendance?: Attendance;
  /** Agendamento de origem (`rescheduledFrom`) e o novo horário criado a partir deste, se houver. */
  previous?: AppointmentRecord;
  next?: AppointmentRecord;
  onOpenAppointment: (id: string) => void;
  /** Nome da ação em andamento (para o estado de carregamento do botão). */
  busy?: 'confirm' | 'checkIn' | 'noShow' | null;
  onConfirm: (a: AppointmentRecord) => void;
  onCheckIn: (a: AppointmentRecord) => void;
  onNoShow: (a: AppointmentRecord) => void;
  onEdit: (a: AppointmentRecord) => void;
  onReschedule: (a: AppointmentRecord) => void;
  onCancel: (a: AppointmentRecord) => void;
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

const when = (a: AppointmentRecord) => `${formatDate(a.start)} às ${formatTime(a.start)}`;

export function AppointmentDetailsModal({
  appointment: a,
  open,
  onClose,
  canEdit,
  actions,
  roomLabel,
  attendance,
  previous,
  next,
  onOpenAppointment,
  busy = null,
  onConfirm,
  onCheckIn,
  onNoShow,
  onEdit,
  onReschedule,
  onCancel,
}: AppointmentDetailsModalProps) {
  if (!a) return null;
  const end = addMinutes(a.start, a.durationMin);
  const hasPrimary = canEdit && (actions.confirm || actions.checkIn || actions.reschedule || actions.cancel);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Detalhes do agendamento"
      description={`${formatDate(a.start, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatTime(a.start)}–${formatTime(end)}`}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {canEdit && actions.cancel && (
            <Button variant="ghost" leftIcon={XCircle} onClick={() => onCancel(a)} className="text-danger sm:mr-auto">
              Cancelar consulta
            </Button>
          )}
          {canEdit && actions.reschedule && (
            <Button variant={actions.confirm || actions.checkIn ? 'secondary' : 'primary'} leftIcon={CalendarClock} onClick={() => onReschedule(a)}>
              Reagendar
            </Button>
          )}
          {canEdit && actions.confirm && (
            <Button leftIcon={CheckCircle2} onClick={() => onConfirm(a)} loading={busy === 'confirm'} variant={actions.checkIn ? 'secondary' : 'primary'}>
              Confirmar presença
            </Button>
          )}
          {canEdit && actions.checkIn && (
            <Button leftIcon={LogIn} onClick={() => onCheckIn(a)} loading={busy === 'checkIn'}>
              Registrar chegada
            </Button>
          )}
          {!hasPrimary && (
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
              {attendance?.checkInAt && (
                <Badge tone="success" icon={UserCheck} size="sm">
                  Chegou às {attendance.checkInAt.slice(11, 16)}
                </Badge>
              )}
              {!canEdit && (
                <Badge tone="neutral" icon={Eye} size="sm">
                  Somente visualização
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
            {roomLabel}
          </Row>
          <Row icon={Wallet} label="Valor (demonstração)">
            <span className="tabular-nums">{a.price ? formatCurrency(a.price) : 'R$ [definir]'}</span>
          </Row>
        </dl>

        {a.status === 'em_atendimento' && (
          <p className="rounded-sm border border-graphite-200 p-3 text-sm text-graphite-700">
            Em atendimento com {a.professionalName}. A conclusão é registrada pelo profissional no Portal.
          </p>
        )}

        {a.cancelReason && (
          <div className="rounded-sm border border-danger-bg bg-danger-bg/50 p-3 text-sm text-graphite-700">
            <span className="block text-xs font-semibold text-danger">Motivo do cancelamento</span>
            {a.cancelReason}
          </div>
        )}

        {(previous || next) && (
          <div className="flex flex-col gap-1 rounded-sm border border-graphite-200 p-3 text-sm text-graphite-700">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-graphite-500">
              <History size={14} strokeWidth={1.75} aria-hidden="true" />
              Histórico de reagendamento
            </span>
            {previous && (
              <span>
                Reagendada de {when(previous)}.{' '}
                <Button variant="link" size="sm" onClick={() => onOpenAppointment(previous.id)}>
                  Ver original
                </Button>
              </span>
            )}
            {next && (
              <span>
                Novo horário: {when(next)} com {next.professionalName}.{' '}
                <Button variant="link" size="sm" onClick={() => onOpenAppointment(next.id)}>
                  Ver novo horário
                </Button>
              </span>
            )}
          </div>
        )}

        {a.notes && (
          <div className="rounded-sm border border-graphite-200 p-3 text-sm text-graphite-700">
            <span className="block text-xs font-semibold text-graphite-500">Observações administrativas</span>
            {a.notes}
          </div>
        )}

        {canEdit && (actions.edit || actions.noShow) && (
          <div className="flex flex-wrap gap-2 border-t border-graphite-100 pt-4">
            {actions.edit && (
              <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => onEdit(a)}>
                Editar
              </Button>
            )}
            {actions.noShow && (
              <Button variant="secondary" size="sm" leftIcon={UserX} onClick={() => onNoShow(a)} loading={busy === 'noShow'}>
                Marcar falta
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
