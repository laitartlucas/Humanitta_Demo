import { ArrowLeft, CalendarPlus, FileText, MapPin, Phone, Tag, Wallet } from 'lucide-react';
import { Avatar, Badge, Button, IconButton, SpecialtyTag } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { Conversation } from '@ds/mocks/types';
import type { ConversationPatientInfo } from '@ds/mocks/business';
import { formatCurrency } from '@ds/mocks/business';

export interface PatientPanelProps {
  conversation: Conversation;
  info?: ConversationPatientInfo;
  onBack: () => void;
  onSchedule: () => void;
  onOpenRecord: () => void;
  className?: string;
}

export function PatientPanel({ conversation, info, onBack, onSchedule, onOpenRecord, className }: PatientPanelProps) {
  const isNew = !conversation.patientId;
  return (
    <aside aria-label="Dados do paciente" className={cn('flex min-h-0 flex-col overflow-y-auto bg-white', className)}>
      <div className="flex items-center gap-2 border-b border-graphite-100 px-3 py-3 xl:hidden">
        <IconButton icon={ArrowLeft} label="Voltar para a conversa" onClick={onBack} />
        <span className="text-[14px] font-bold text-graphite-900">Dados do paciente</span>
      </div>

      <div className="flex flex-col items-center gap-3 border-b border-graphite-100 px-5 py-6 text-center">
        <Avatar name={conversation.contactName} size="xl" ring />
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-7 text-graphite-900">{conversation.contactName}</h3>
          <p className="text-[13px] text-graphite-500">{isNew ? 'Contato sem cadastro' : 'Paciente cadastrado'}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {conversation.tags.map((t) => (
            <Badge key={t} tone="neutral" icon={Tag} size="sm">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <dl className="flex flex-col gap-4 px-5 py-5 text-[13px]">
        <div className="flex items-start gap-3">
          <Phone size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div>
            <dt className="text-graphite-500">WhatsApp</dt>
            <dd className="font-semibold text-graphite-900">{conversation.phone}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CalendarPlus size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div>
            <dt className="text-graphite-500">Próxima consulta</dt>
            <dd className="font-semibold text-graphite-900">{info?.nextAppointment ?? 'Nenhuma agendada'}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div>
            <dt className="text-graphite-500">Última visita</dt>
            <dd className="font-semibold text-graphite-900">{info?.lastVisit ?? '—'}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Wallet size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div>
            <dt className="text-graphite-500">Saldo em aberto</dt>
            <dd className={cn('font-semibold tabular-nums', info && info.balance > 0 ? 'text-warning' : 'text-graphite-900')}>
              {formatCurrency(info?.balance ?? 0)}
            </dd>
          </div>
        </div>
        {info && info.specialties.length > 0 && (
          <div>
            <dt className="mb-2 text-graphite-500">Especialidades</dt>
            <dd className="flex flex-wrap gap-1.5">
              {info.specialties.map((s) => (
                <SpecialtyTag key={s} specialty={s} variant="chip" />
              ))}
            </dd>
          </div>
        )}
        {info?.notes && (
          <div className="rounded-sm bg-graphite-50 p-3">
            <dt className="text-[12px] font-semibold text-graphite-500">Observação</dt>
            <dd className="text-graphite-800">{info.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex flex-col gap-2 border-t border-graphite-100 p-5">
        <Button leftIcon={CalendarPlus} fullWidth onClick={onSchedule}>
          Agendar consulta
        </Button>
        <Button variant="secondary" leftIcon={FileText} fullWidth onClick={onOpenRecord}>
          {isNew ? 'Cadastrar paciente' : 'Abrir ficha do paciente'}
        </Button>
      </div>
    </aside>
  );
}
