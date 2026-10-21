import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, Clock, DoorOpen, Info, MessageSquareText, Phone, Play, Stethoscope, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Drawer, StatusBadge } from '@ds/components';
import { now } from '@core';
import { CHANNEL_NAMES, isSameDay } from '@ds/mocks/clinical';
import type { PortalAppointment } from '@ds/mocks/portal';
import { useMyPatientsById, useRoomName } from './usePortalData';
import { isWaiting, timeRange, weekdayDate } from './portalUtils';
import { ScopeBadge } from './ScopeBadge';

export interface PortalAppointmentDrawerProps {
  appointment: PortalAppointment | null;
  onClose: () => void;
  onStartAttendance?: (appointmentId: string) => void;
  onOpenPatient?: (patientId: string) => void;
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
      <dt className="w-28 shrink-0 text-body-sm text-graphite-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-body-sm font-semibold text-graphite-900">{children}</dd>
    </div>
  );
}

/** Detalhes de uma consulta do profissional logado — sem valores financeiros. */
export function PortalAppointmentDrawer({
  appointment: a,
  onClose,
  onStartAttendance,
  onOpenPatient,
}: PortalAppointmentDrawerProps) {
  // Paciente só aparece se estiver vinculado ao profissional logado (escopo do core).
  const { byId } = useMyPatientsById();
  const roomName = useRoomName();
  const patient = a ? byId.get(a.patientId) : undefined;
  const isToday = a ? isSameDay(new Date(a.start), now()) : false;
  const canStart = Boolean(a && isToday && isWaiting(a.status) && onStartAttendance);
  const inProgress = a?.status === 'em_atendimento';

  return (
    <Drawer
      open={Boolean(a)}
      onClose={onClose}
      title={a?.patientName ?? ''}
      description={a ? `${weekdayDate(a.start)} · ${timeRange(a)}` : undefined}
      footer={
        a ? (
          <>
            {onOpenPatient && (
              <Button variant="secondary" leftIcon={UserRound} onClick={() => onOpenPatient(a.patientId)}>
                Ver paciente
              </Button>
            )}
            {(canStart || (inProgress && onStartAttendance)) && (
              <Button leftIcon={Play} onClick={() => onStartAttendance?.(a.id)}>
                {inProgress ? 'Continuar atendimento' : 'Iniciar atendimento'}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {a && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            <ScopeBadge size="sm" />
          </div>

          <dl className="flex flex-col divide-y divide-graphite-100">
            <Row icon={Stethoscope} label="Serviço">
              {a.service}
            </Row>
            <Row icon={Clock} label="Horário">
              <span className="tabular-nums">{timeRange(a)}</span> · {a.durationMin} min
            </Row>
            <Row icon={DoorOpen} label="Sala">
              {roomName(a.roomId)}
            </Row>
            <Row icon={CalendarClock} label="Agendado via">
              {a.channel ? CHANNEL_NAMES[a.channel] : 'Recepção'}
            </Row>
            {patient && (
              <>
                <Row icon={UserRound} label="Idade">
                  {patient.age} anos
                </Row>
                <Row icon={Phone} label="Contato">
                  <span className="tabular-nums">{patient.phoneMasked}</span>
                </Row>
              </>
            )}
          </dl>

          {(a.notes || patient?.adminNote) && (
            <section aria-labelledby="drawer-notes" className="flex flex-col gap-2">
              <h3 id="drawer-notes" className="flex items-center gap-2 text-body font-bold text-graphite-900">
                <MessageSquareText size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
                Observações da recepção
              </h3>
              {a.notes && <p className="text-body-sm text-graphite-700">{a.notes}</p>}
              {patient?.adminNote && <p className="text-body-sm text-graphite-700">{patient.adminNote}</p>}
            </section>
          )}

          {patient && patient.alerts.length > 0 && (
            <section aria-labelledby="drawer-alerts" className="flex flex-col gap-2">
              <h3 id="drawer-alerts" className="flex items-center gap-2 text-body font-bold text-graphite-900">
                <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" className="text-warning" />
                Alertas de atendimento
              </h3>
              <div className="flex flex-wrap gap-2">
                {patient.alerts.map((al) => (
                  <Badge key={al.id} tone={al.tone} dot>
                    {al.label}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <p className="flex items-start gap-2 rounded-md bg-graphite-50 px-4 py-3 text-body-sm text-graphite-600">
            <Info size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
            Remarcações, cancelamentos e pagamentos são feitos pela recepção. Valores não aparecem no seu portal.
          </p>
        </div>
      )}
    </Drawer>
  );
}
