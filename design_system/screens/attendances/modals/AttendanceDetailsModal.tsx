import type { ReactNode } from 'react';
import {
  CalendarDays,
  CircleCheckBig,
  Clock,
  DoorOpen,
  Info,
  LogIn,
  Play,
  Stethoscope,
  Tag,
  Timer,
  UserX,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, Badge, Button, Modal, PaymentStatusBadge, SpecialtyTag, StatusBadge } from '@ds/components';
import { addMinutes, formatCurrency, formatDate, formatTime } from '@ds/mocks/clinical';
import type { AttendanceActionsAvailability, AttendanceView } from '@modules/attendances/model';
import { durationLabel, Timeline, timelineFor } from '../components/Timeline';

export interface AttendanceActions {
  onCheckIn: (v: AttendanceView) => void;
  onStart: (v: AttendanceView) => void;
  onFinish: (v: AttendanceView) => void;
  onNoShow: (v: AttendanceView) => void;
}

function Item({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
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
  view: AttendanceView;
  /** Conteúdo extra abaixo da linha do tempo (checklist, registro demonstrativo). */
  children?: ReactNode;
}

/** Conteúdo compartilhado entre o drawer e o modal de detalhes do atendimento. */
export function AttendanceDetailsContent({ view: v, children }: AttendanceDetailsContentProps) {
  const a = v.appointment;
  const end = formatTime(addMinutes(a.start, a.durationMin));
  const subtitle = [v.patient.age !== undefined ? `${v.patient.age} anos` : null, v.patient.city].filter(Boolean).join(' · ') || 'Paciente';
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={v.patient.name} size="lg" ring />
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight text-graphite-900">{v.patient.name}</p>
          <p className="text-sm text-graphite-500">{subtitle}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge status={a.status} />
            {v.stage === 'na_recepcao' && (
              <Badge tone="gold" icon={LogIn} size="sm">
                Na recepção
              </Badge>
            )}
            <SpecialtyTag specialty={v.specialty} variant="chip" />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Item icon={CalendarDays} label="Data">
          {formatDate(a.start, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </Item>
        <Item icon={Clock} label="Horário">
          {formatTime(a.start)}–{end} · {a.durationMin} min previstos
        </Item>
        <Item icon={Stethoscope} label="Profissional responsável">
          {v.professionalName}
        </Item>
        <Item icon={Tag} label="Especialidade · serviço">
          {v.specialtyName} · {v.service}
        </Item>
        <Item icon={DoorOpen} label="Sala">
          {v.roomName}
          {v.roomLabel ? ` · ${v.roomLabel}` : ''}
        </Item>
        <Item icon={Timer} label="Duração">
          {v.realDurationMin !== undefined
            ? `${durationLabel(v.realDurationMin)} (real)`
            : v.startedAt
              ? `Em andamento desde ${formatTime(v.startedAt)}`
              : `${a.durationMin} min previstos`}
        </Item>
        {v.price !== null && (
          <Item icon={Wallet} label="Valor (demonstração)">
            {formatCurrency(v.price)}
          </Item>
        )}
        {v.billing !== undefined && (
          <Item icon={Wallet} label="Cobrança">
            {v.billing ? (
              <span className="inline-flex items-center gap-2">
                <PaymentStatusBadge status={v.billing.status} size="sm" />
                {formatCurrency(v.billing.amount)}
              </span>
            ) : v.stage === 'concluido' ? (
              'Sem lançamento — disponível para o Financeiro'
            ) : (
              'Gerada após a conclusão'
            )}
          </Item>
        )}
      </dl>

      {a.notes && (
        <p className="flex items-start gap-2 rounded-md border border-graphite-200 p-3 text-sm text-graphite-700">
          <Info size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
          <span>
            <span className="font-semibold text-graphite-900">Observação administrativa: </span>
            {a.notes}
          </span>
        </p>
      )}

      <section aria-labelledby={`att-timeline-${v.id}`}>
        <h3 id={`att-timeline-${v.id}`} className="mb-3 text-sm font-bold text-graphite-900">
          Linha do tempo
        </h3>
        <Timeline steps={timelineFor(v)} />
      </section>

      {children}
    </div>
  );
}

export function AttendanceFooterActions({
  view: v,
  available,
  loadingId,
  onCheckIn,
  onStart,
  onFinish,
  onNoShow,
}: AttendanceActions & { view: AttendanceView; available: AttendanceActionsAvailability; loadingId?: string | null }) {
  const busy = loadingId === v.id;
  return (
    <>
      {available.noShow && (
        <Button variant="ghost" leftIcon={UserX} onClick={() => onNoShow(v)} disabled={busy}>
          Registrar falta
        </Button>
      )}
      {available.checkIn && (
        <Button variant="secondary" leftIcon={LogIn} onClick={() => onCheckIn(v)} loading={busy}>
          Registrar chegada
        </Button>
      )}
      {available.start && (
        <Button leftIcon={Play} onClick={() => onStart(v)} loading={busy}>
          Iniciar atendimento
        </Button>
      )}
      {available.finish && (
        <Button leftIcon={CircleCheckBig} onClick={() => onFinish(v)} disabled={busy}>
          Concluir atendimento
        </Button>
      )}
    </>
  );
}

export interface AttendanceDetailsModalProps {
  view: AttendanceView | null;
  open: boolean;
  onClose: () => void;
  /** Ação secundária opcional (ex.: abrir a ficha). */
  extraAction?: ReactNode;
}

/** Consulta rápida de um atendimento (histórico), sem ações de fluxo. */
export function AttendanceDetailsModal({ view, open, onClose, extraAction }: AttendanceDetailsModalProps) {
  if (!view) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Atendimento"
      description={`${view.service} · ${view.roomName}`}
      footer={
        <>
          {extraAction}
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </>
      }
    >
      <AttendanceDetailsContent view={view} />
    </Modal>
  );
}
