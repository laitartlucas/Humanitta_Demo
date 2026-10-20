import type { ReactNode } from 'react';
import { CircleCheckBig, Clock, DoorOpen, Lock, LogIn, Play, Stethoscope, Wallet } from 'lucide-react';
import type { Appointment } from '@ds/mocks/types';
import { Avatar, Badge, Button, Modal, SpecialtyTag, StatusBadge, Textarea } from '@ds/components';
import { CHANNEL_NAMES, addMinutes, formatCurrency, formatTime, getPatientById, getRoomName, ageFrom } from '@ds/mocks/clinical';

export interface AttendanceActions {
  onCheckIn: (a: Appointment) => void;
  onStart: (a: Appointment) => void;
  onFinish: (a: Appointment) => void;
}

function Item({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-graphite-500">{label}</dt>
        <dd className="text-sm text-graphite-900">{children}</dd>
      </div>
    </div>
  );
}

export interface AttendanceDetailsContentProps {
  appointment: Appointment;
  checkedIn: boolean;
  startedAt?: string;
}

/** Conteúdo compartilhado entre o drawer e o modal de detalhes do atendimento. */
export function AttendanceDetailsContent({ appointment: a, checkedIn, startedAt }: AttendanceDetailsContentProps) {
  const patient = getPatientById(a.patientId);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={a.patientName} size="lg" />
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight text-graphite-900">{a.patientName}</p>
          <p className="text-sm text-graphite-500">
            {patient ? `${ageFrom(patient.birthDate)} anos · ${patient.city}` : 'Paciente'}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge status={a.status} />
            {checkedIn && a.status !== 'em_atendimento' && a.status !== 'concluida' && (
              <Badge tone="gold" icon={LogIn} size="sm">
                Na recepção
              </Badge>
            )}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Item icon={Clock} label="Horário">
          {formatTime(a.start)}–{formatTime(addMinutes(a.start, a.durationMin))} · {a.durationMin} min
        </Item>
        <Item icon={Stethoscope} label="Profissional">
          {a.professionalName}
        </Item>
        <Item icon={DoorOpen} label="Sala">
          {getRoomName(a.roomId)}
        </Item>
        <Item icon={Wallet} label="Valor (demonstração)">
          {formatCurrency(a.price)}
        </Item>
      </dl>

      <div className="flex flex-wrap items-center gap-2 text-sm text-graphite-600">
        <SpecialtyTag specialty={a.specialty} variant="chip" />
        <span>{a.service}</span>
        {a.channel && <span className="text-graphite-400">· origem: {CHANNEL_NAMES[a.channel]}</span>}
        {startedAt && <span className="text-graphite-400">· iniciado às {formatTime(startedAt)}</span>}
      </div>

      <section aria-labelledby={`clinical-${a.id}`} className="rounded-md border border-graphite-200 bg-graphite-50 p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-white text-gold-600">
            <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h3 id={`clinical-${a.id}`} className="text-sm font-bold text-graphite-900">
              Registro clínico restrito
            </h3>
            <p className="text-xs text-graphite-500">
              Somente {a.professionalName} pode registrar evolução. Seu perfil (Administradora) tem acesso apenas administrativo.
            </p>
          </div>
        </div>
        <fieldset disabled className="flex flex-col gap-3">
          <legend className="sr-only">Campos clínicos bloqueados</legend>
          <Textarea
            id={`clinical-evolution-${a.id}`}
            label="Evolução do atendimento"
            rows={3}
            placeholder="Acesso restrito ao profissional responsável"
            disabled
            aria-describedby={`clinical-${a.id}`}
          />
          <Textarea
            id={`clinical-plan-${a.id}`}
            label="Conduta / plano terapêutico"
            rows={2}
            placeholder="Acesso restrito ao profissional responsável"
            disabled
          />
        </fieldset>
      </section>
    </div>
  );
}

export function AttendanceFooterActions({
  appointment: a,
  checkedIn,
  onCheckIn,
  onStart,
  onFinish,
}: AttendanceActions & { appointment: Appointment; checkedIn: boolean }) {
  const waiting = a.status === 'agendada' || a.status === 'confirmada' || a.status === 'reagendada';
  return (
    <>
      {waiting && !checkedIn && (
        <Button variant="secondary" leftIcon={LogIn} onClick={() => onCheckIn(a)}>
          Registrar chegada
        </Button>
      )}
      {waiting && (
        <Button leftIcon={Play} onClick={() => onStart(a)}>
          Iniciar atendimento
        </Button>
      )}
      {a.status === 'em_atendimento' && (
        <Button leftIcon={CircleCheckBig} onClick={() => onFinish(a)}>
          Finalizar atendimento
        </Button>
      )}
    </>
  );
}

export interface AttendanceDetailsModalProps extends AttendanceActions {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  checkedIn: boolean;
  startedAt?: string;
}

export function AttendanceDetailsModal({
  appointment,
  open,
  onClose,
  checkedIn,
  startedAt,
  onCheckIn,
  onStart,
  onFinish,
}: AttendanceDetailsModalProps) {
  if (!appointment) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Atendimento"
      description={`${appointment.service} · ${getRoomName(appointment.roomId)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <AttendanceFooterActions
            appointment={appointment}
            checkedIn={checkedIn}
            onCheckIn={onCheckIn}
            onStart={onStart}
            onFinish={onFinish}
          />
        </>
      }
    >
      <AttendanceDetailsContent appointment={appointment} checkedIn={checkedIn} startedAt={startedAt} />
    </Modal>
  );
}
