import type { ReactNode } from 'react';
import { CheckCircle2, Pencil, Undo2 } from 'lucide-react';
import { Badge, Button, Drawer, PaymentStatusBadge, STATUS_LABEL } from '@ds/components';
import { useAppointment, useAttendances } from '@core';
import { PAYMENT_METHOD_LABEL, formatCurrency, formatDateBR, formatTimeBR } from '@ds/mocks/business';
import { canTransition, type FinanceRow } from '@modules/finance/domain';

export interface EntryDetailsDrawerProps {
  entry: FinanceRow | null;
  onClose: () => void;
  /** Ações liberadas para o perfil (o serviço revalida). */
  canEdit: boolean;
  onPay: (e: FinanceRow) => void;
  onEdit: (e: FinanceRow) => void;
  onReverse: (e: FinanceRow) => void;
  /** Abre a ficha administrativa do paciente (navegação pelo container). */
  onOpenPatient?: (patientId: string) => void;
}

const TYPE_LABEL: Record<FinanceRow['type'], string> = { receita: 'Receita', despesa: 'Despesa', repasse: 'Repasse' };

const ATTENDANCE_LABEL = {
  aguardando: 'Aguardando',
  em_andamento: 'Em atendimento',
  finalizado: 'Finalizado',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-graphite-100 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-[12px] font-semibold text-graphite-500">{label}</dt>
      <dd className="text-[14px] text-graphite-900 sm:text-right">{children}</dd>
    </div>
  );
}

/** Detalhes do lançamento com os dados ADMINISTRATIVOS do atendimento vinculado (nada clínico). */
export function EntryDetailsDrawer({ entry, onClose, canEdit, onPay, onEdit, onReverse, onOpenPatient }: EntryDetailsDrawerProps) {
  const appointment = useAppointment(entry?.appointmentId);
  const attendance = useAttendances().find((a) => a.appointmentId === entry?.appointmentId);
  const open = Boolean(entry && (entry.effective === 'pendente' || entry.effective === 'atrasado'));

  return (
    <Drawer
      open={entry !== null}
      onClose={onClose}
      title="Detalhes do lançamento"
      description={entry ? `${TYPE_LABEL[entry.type]} · ${entry.category}` : undefined}
      footer={
        entry && canEdit ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canTransition(entry.status, 'estornar') && (
              <Button variant="ghost" leftIcon={Undo2} onClick={() => onReverse(entry)}>
                {entry.status === 'pago' ? 'Estornar' : 'Cancelar lançamento'}
              </Button>
            )}
            {open && (
              <Button variant="secondary" leftIcon={Pencil} onClick={() => onEdit(entry)}>
                Editar
              </Button>
            )}
            {open && (
              <Button leftIcon={CheckCircle2} onClick={() => onPay(entry)}>
                {entry.type === 'receita' ? 'Registrar recebimento' : 'Registrar pagamento'}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {entry && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[16px] font-semibold text-graphite-900">{entry.description}</span>
            <span className={`font-display text-3xl font-semibold tabular-nums ${entry.effective === 'estornado' ? 'text-graphite-400 line-through' : 'text-graphite-900'}`}>
              {formatCurrency(entry.amount)}
            </span>
            <div>
              <PaymentStatusBadge status={entry.effective} />
            </div>
          </div>

          <dl>
            <Row label="Competência">{formatDateBR(entry.date)}</Row>
            <Row label="Vencimento">{entry.dueDate ? formatDateBR(entry.dueDate) : '—'}</Row>
            <Row label="Pagamento">{entry.paidAt ? formatDateBR(entry.paidAt) : 'Não registrado'}</Row>
            <Row label="Forma de pagamento">{entry.method ? PAYMENT_METHOD_LABEL[entry.method] : '—'}</Row>
            {entry.type === 'receita' && (
              <Row label="Paciente">
                {entry.patientId && onOpenPatient ? (
                  <button
                    type="button"
                    className="font-semibold text-gold-700 underline-offset-2 hover:underline"
                    onClick={() => onOpenPatient(entry.patientId!)}
                  >
                    {entry.patientName ?? 'Abrir ficha'}
                  </button>
                ) : (
                  (entry.patientName ?? '—')
                )}
              </Row>
            )}
            {entry.type !== 'despesa' && <Row label="Profissional">{entry.professionalName ?? '—'}</Row>}
            <Row label="Identificador">
              <span className="tabular-nums text-graphite-600">{entry.id}</span>
            </Row>
          </dl>

          {entry.type === 'receita' && (
            <section className="flex flex-col gap-2 rounded-md border border-graphite-200 bg-graphite-50 p-4">
              <span className="text-[13px] font-semibold text-graphite-800">Atendimento relacionado</span>
              {appointment ? (
                <dl className="text-[13px]">
                  <Row label="Serviço">{appointment.service}</Row>
                  <Row label="Data">
                    {formatDateBR(appointment.start)} às {formatTimeBR(appointment.start)}
                  </Row>
                  <Row label="Agendamento">
                    <Badge tone="neutral" size="sm">
                      {STATUS_LABEL[appointment.status]}
                    </Badge>
                  </Row>
                  {attendance && <Row label="Atendimento">{ATTENDANCE_LABEL[attendance.status]}</Row>}
                </dl>
              ) : (
                <p className="text-[13px] text-graphite-500">
                  {entry.appointmentId ? 'Atendimento não disponível para o seu perfil.' : 'Lançamento sem atendimento vinculado.'}
                </p>
              )}
            </section>
          )}

          {entry.effective === 'estornado' && (
            <p className="text-[12px] text-graphite-500">Lançamento estornado: mantido no histórico e fora dos indicadores.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}
