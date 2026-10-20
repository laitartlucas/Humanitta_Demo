import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, CalendarClock, CalendarPlus, FileText, History, Link2, Phone, Plus, Stethoscope, Tag, UserRound, Wallet, X } from 'lucide-react';
import { Avatar, Badge, Button, IconButton, StatusBadge } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { Appointment, ChatMessage, Conversation, Patient } from '@ds/mocks/types';
import { formatCurrency, formatDateBR } from '@ds/mocks/business';
import { formatSlot } from '@modules/messaging/availability';
import { DEMO_TAGS } from '@modules/messaging/model';

export interface PatientPanelProps {
  conversation: Conversation;
  /** Paciente vinculado (dados administrativos — nunca prontuário). */
  patient?: Patient & { adminNote?: string };
  /** Próximas consultas do paciente vinculado (agenda compartilhada, no escopo do perfil). */
  upcoming: Appointment[];
  /** Consultas anteriores (somente dados administrativos). */
  past: Appointment[];
  /** Registros de sistema da conversa (transferências, status…). */
  events: ChatMessage[];
  canEdit: boolean;
  canSchedule: boolean;
  /** `pacientes_financeiro ≥ ver`. */
  canSeeBalance: boolean;
  onBack: () => void;
  onSchedule: () => void;
  onLink: () => void;
  onOpenRecord: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  className?: string;
}

export function PatientPanel({
  conversation,
  patient,
  upcoming,
  past,
  events,
  canEdit,
  canSchedule,
  canSeeBalance,
  onBack,
  onSchedule,
  onLink,
  onOpenRecord,
  onAddTag,
  onRemoveTag,
  className,
}: PatientPanelProps) {
  const [newTag, setNewTag] = useState('');
  const isNew = !patient;
  const related = upcoming[0] ?? past[0];
  const suggestions = DEMO_TAGS.filter((t) => !conversation.tags.includes(t));

  const submitTag = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    onAddTag(newTag.trim());
    setNewTag('');
  };

  return (
    <aside aria-label="Dados do contato" className={cn('flex min-h-0 flex-col overflow-y-auto bg-white', className)}>
      <div className="flex items-center gap-2 border-b border-graphite-100 px-3 py-3 xl:hidden">
        <IconButton icon={ArrowLeft} label="Voltar para a conversa" onClick={onBack} />
        <span className="text-[14px] font-bold text-graphite-900">Dados do contato</span>
      </div>

      <div className="flex flex-col items-center gap-3 border-b border-graphite-100 px-5 py-6 text-center">
        <Avatar name={conversation.contactName} size="xl" ring />
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-7 text-graphite-900">{conversation.contactName}</h3>
          <p className="text-[13px] text-graphite-500">{isNew ? 'Contato sem cadastro' : 'Paciente cadastrado'}</p>
        </div>
        <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Etiquetas">
          {conversation.tags.map((t) => (
            <li key={t}>
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-graphite-100 pl-2 pr-1 text-[11px] font-semibold text-graphite-600">
                <Tag size={12} aria-hidden="true" />
                {t}
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Remover etiqueta ${t}`}
                    onClick={() => onRemoveTag(t)}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
          ))}
          {conversation.tags.length === 0 && <li className="text-[12px] text-graphite-500">Sem etiquetas</li>}
        </ul>
        {canEdit && (
          <form onSubmit={submitTag} className="flex w-full items-center gap-2" aria-label="Adicionar etiqueta">
            <label htmlFor="panel-new-tag" className="sr-only">
              Nova etiqueta
            </label>
            <input
              id="panel-new-tag"
              list="panel-tag-suggestions"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Adicionar etiqueta"
              maxLength={32}
              className="h-9 min-w-0 flex-1 rounded-sm border border-graphite-200 px-3 text-[13px] text-graphite-900 placeholder:text-graphite-400 focus:border-gold-500 focus:outline-none focus:shadow-focus"
            />
            <datalist id="panel-tag-suggestions">
              {suggestions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <IconButton type="submit" icon={Plus} label="Adicionar etiqueta" size="sm" variant="secondary" disabled={!newTag.trim()} />
          </form>
        )}
      </div>

      <dl className="flex flex-col gap-4 px-5 py-5 text-[13px]">
        <div className="flex items-start gap-3">
          <Phone size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div>
            <dt className="text-graphite-500">WhatsApp (fictício)</dt>
            <dd className="font-semibold text-graphite-900">{conversation.phone}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <UserRound size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div>
            <dt className="text-graphite-500">Responsável atual</dt>
            <dd className="font-semibold text-graphite-900">
              {conversation.mode === 'ia' ? 'Assistente IA (simulação)' : conversation.assignedTo ?? 'Equipe'}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CalendarClock size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <dt className="text-graphite-500">Próximos agendamentos</dt>
            <dd>
              {isNew ? (
                <span className="font-semibold text-graphite-900">Vincule a um paciente para ver a agenda</span>
              ) : upcoming.length === 0 ? (
                <span className="font-semibold text-graphite-900">Nenhum agendado</span>
              ) : (
                <ul className="mt-1 flex flex-col gap-2">
                  {upcoming.slice(0, 3).map((a) => (
                    <li key={a.id} className="rounded-sm border border-graphite-100 p-2">
                      <p className="font-semibold text-graphite-900">{formatSlot(a.start)}</p>
                      <p className="text-[12px] text-graphite-600">
                        {a.service} · {a.professionalName}
                      </p>
                      <StatusBadge status={a.status} className="mt-1" />
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </div>
        {related && (
          <div className="flex items-start gap-3">
            <Stethoscope size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
            <div>
              <dt className="text-graphite-500">Profissional relacionado</dt>
              <dd className="font-semibold text-graphite-900">{related.professionalName}</dd>
            </div>
          </div>
        )}
        {patient && (
          <div className="flex items-start gap-3">
            <History size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
            <div>
              <dt className="text-graphite-500">Última visita</dt>
              <dd className="font-semibold text-graphite-900">{patient.lastVisit ? formatDateBR(patient.lastVisit) : '—'}</dd>
            </div>
          </div>
        )}
        {patient && canSeeBalance && (
          <div className="flex items-start gap-3">
            <Wallet size={16} className="mt-0.5 text-graphite-400" aria-hidden="true" />
            <div>
              <dt className="text-graphite-500">Saldo em aberto</dt>
              <dd className={cn('font-semibold tabular-nums', patient.balance > 0 ? 'text-warning' : 'text-graphite-900')}>
                {formatCurrency(patient.balance)}
              </dd>
            </div>
          </div>
        )}
        {patient?.adminNote && (
          <div className="rounded-sm bg-graphite-50 p-3">
            <dt className="text-[12px] font-semibold text-graphite-500">Observação administrativa</dt>
            <dd className="text-graphite-800">{patient.adminNote}</dd>
          </div>
        )}
        {(past.length > 0 || events.length > 0) && (
          <div>
            <dt className="mb-2 text-graphite-500">Histórico administrativo</dt>
            <dd>
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {past.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span className="truncate text-graphite-700">
                      {formatDateBR(a.start)} · {a.service}
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
                {events.slice(-3).reverse().map((m) => (
                  <li key={m.id} className="text-graphite-600">
                    <span className="tabular-nums text-graphite-400">{m.at.slice(11, 16)}</span> {m.text}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        <p className="flex items-center gap-1 text-[11px] text-graphite-500">
          <Badge tone="neutral" size="sm">
            Somente dados administrativos
          </Badge>
          Informações clínicas não são exibidas na central.
        </p>
      </dl>

      <div className="mt-auto flex flex-col gap-2 border-t border-graphite-100 p-5">
        <Button leftIcon={CalendarPlus} fullWidth onClick={onSchedule} disabled={!canSchedule}>
          Agendar consulta
        </Button>
        {!canSchedule && <p className="text-center text-[12px] text-graphite-500">Seu perfil não agenda consultas.</p>}
        {isNew ? (
          <Button variant="secondary" leftIcon={Link2} fullWidth onClick={onLink} disabled={!canEdit}>
            Vincular a paciente
          </Button>
        ) : (
          <Button variant="secondary" leftIcon={FileText} fullWidth onClick={onOpenRecord}>
            Abrir ficha do paciente
          </Button>
        )}
      </div>
    </aside>
  );
}
