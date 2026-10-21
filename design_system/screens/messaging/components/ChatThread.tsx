import { useEffect, useLayoutEffect, useRef } from 'react';
import { Archive, ArrowLeft, Bot, Check, CheckCheck, Clock3, Info, MoreVertical, RotateCcw, UserRound } from 'lucide-react';
import { Avatar, Badge, DropdownMenu, EmptyState, IconButton, SegmentedControl } from '@ds/components';
import type { DropdownMenuItem } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { ChatMessage, Conversation } from '@ds/mocks/types';
import { formatDateBR } from '@ds/mocks/business';
import { CONVERSATION_STATUS_LABEL, isSystemMessage, statusOf, type ConversationStatus } from '@modules/messaging/model';
import { MessageComposer } from './MessageComposer';
import { SimulateIncoming } from './SimulateIncoming';
import { TransferMenu, type TransferTarget } from './TransferMenu';

export interface ChatThreadProps {
  conversation: Conversation;
  messages: ChatMessage[];
  onBack: () => void;
  onOpenPanel: () => void;
  onModeChange: (mode: 'ia' | 'humano') => void;
  onTransfer: (target: { id: string; label: string }) => void;
  onSend: (text: string) => void;
  onAttach: () => void;
  /** Encerrar / reabrir / marcar como pendente. */
  onStatusChange?: (status: ConversationStatus) => void;
  /** Ferramenta da demonstração: simula mensagem recebida do contato. */
  onSimulateIncoming?: (text: string) => void;
  transferTargets?: TransferTarget[];
  /** Perfil com `whatsapp ≥ editar`. Sem ele, a conversa é somente leitura. */
  canEdit?: boolean;
  /** "digitando…" da resposta simulada da IA. */
  aiTyping?: boolean;
  /** Nome do assistente configurado. */
  assistantName?: string;
  sending?: boolean;
  className?: string;
}

const FROM_LABEL: Record<ChatMessage['from'], string> = {
  paciente: 'Paciente',
  ia: 'Assistente IA (simulação)',
  atendente: 'Atendente',
};

const STATUS_TONE: Record<ConversationStatus, 'success' | 'warning' | 'neutral'> = {
  aberta: 'success',
  pendente: 'warning',
  encerrada: 'neutral',
};

function StatusIcon({ status }: { status: ChatMessage['status'] }) {
  if (!status) return null;
  if (status === 'enviada') return <Check size={14} aria-label="Enviada" />;
  return (
    <CheckCheck size={14} className={status === 'lida' ? 'text-info' : undefined} aria-label={status === 'lida' ? 'Lida' : 'Entregue'} />
  );
}

export function ChatThread({
  conversation,
  messages,
  onBack,
  onOpenPanel,
  onModeChange,
  onTransfer,
  onSend,
  onAttach,
  onStatusChange,
  onSimulateIncoming,
  transferTargets,
  canEdit = true,
  aiTyping = false,
  assistantName = 'Assistente Humanittá',
  sending = false,
  className,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const status = statusOf(conversation);
  const closed = status === 'encerrada';

  // Ao trocar de conversa, vai para o fim. Em novas mensagens, só rola se a pessoa já estava no fim
  // (não "puxa" quem está lendo o histórico) ou se a mensagem foi enviada pela equipe.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    nearBottom.current = true;
  }, [conversation.id]);

  const last = messages[messages.length - 1];
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (nearBottom.current || last?.from === 'atendente') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, aiTyping, last?.from]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const statusItems: DropdownMenuItem[] = closed
    ? [{ label: 'Reabrir conversa', icon: RotateCcw, onSelect: () => onStatusChange?.('aberta') }]
    : [
        status === 'pendente'
          ? { label: 'Retomar (marcar como aberta)', icon: RotateCcw, onSelect: () => onStatusChange?.('aberta') }
          : { label: 'Marcar como pendente', icon: Clock3, onSelect: () => onStatusChange?.('pendente') },
        { label: 'Encerrar conversa', icon: Archive, danger: true, onSelect: () => onStatusChange?.('encerrada') },
      ];

  let lastDay = '';

  return (
    <section aria-label={`Conversa com ${conversation.contactName}`} className={cn('flex min-h-0 flex-col bg-ivory', className)}>
      <header className="flex flex-wrap items-center gap-3 border-b border-graphite-200 bg-white px-3 py-3 sm:px-4">
        <div className="md:hidden">
          <IconButton icon={ArrowLeft} label="Voltar para a lista de conversas" onClick={onBack} />
        </div>
        <Avatar name={conversation.contactName} size="md" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="flex items-center gap-2 truncate text-[15px] font-bold text-graphite-900">
            <span className="truncate">{conversation.contactName}</span>
            {status !== 'aberta' && (
              <Badge tone={STATUS_TONE[status]} size="sm" dot>
                {CONVERSATION_STATUS_LABEL[status]}
              </Badge>
            )}
          </h2>
          <span className="truncate text-[12px] text-graphite-500">{conversation.phone}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && !closed && (
            <SegmentedControl
              size="sm"
              ariaLabel="Modo de atendimento"
              value={conversation.mode}
              onChange={(v) => onModeChange(v === 'humano' ? 'humano' : 'ia')}
              options={[
                { value: 'ia', label: 'IA' },
                { value: 'humano', label: 'Humano' },
              ]}
            />
          )}
          {canEdit && (
            <TransferMenu onTransfer={onTransfer} currentTarget={conversation.assignedTo} targets={transferTargets} disabled={closed} compact />
          )}
          {canEdit && onStatusChange && (
            <DropdownMenu label="Mais ações da conversa" items={statusItems} trigger={<IconButton icon={MoreVertical} label="Mais ações da conversa" />} />
          )}
          <div className="xl:hidden">
            <IconButton icon={Info} label="Ver dados do contato" onClick={onOpenPanel} />
          </div>
        </div>
      </header>

      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-[12px] font-semibold',
          closed ? 'bg-graphite-100 text-graphite-600' : conversation.mode === 'ia' ? 'bg-ai-bg text-ai' : 'bg-info-bg text-info',
        )}
        role="status"
      >
        {closed ? (
          <Archive size={14} aria-hidden="true" />
        ) : conversation.mode === 'ia' ? (
          <Bot size={14} aria-hidden="true" />
        ) : (
          <UserRound size={14} aria-hidden="true" />
        )}
        {closed
          ? 'Conversa finalizada'
          : conversation.mode === 'ia'
            ? `Atendimento automático simulado — ${assistantName}`
            : `Atendimento humano${conversation.assignedTo ? ` — ${conversation.assignedTo}` : ''} · respostas automáticas pausadas`}
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6" aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState compact icon={Info} title="Sem mensagens" description="Ainda não há mensagens nesta conversa." />
        ) : (
          <ol className="flex flex-col gap-3">
            {messages.map((m) => {
              const day = m.at.slice(0, 10);
              const showDay = day !== lastDay;
              lastDay = day;
              const dayChip = showDay && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-graphite-100 px-3 py-1 text-[11px] font-semibold text-graphite-600">{formatDateBR(m.at)}</span>
                </div>
              );
              if (isSystemMessage(m)) {
                return (
                  <li key={m.id} className="flex flex-col gap-3">
                    {dayChip}
                    <div className="flex justify-center">
                      <p className="max-w-[90%] rounded-full border border-graphite-200 bg-white px-3 py-1 text-center text-[11px] text-graphite-600">
                        <span className="sr-only">Registro do sistema: </span>
                        {m.text} <span className="tabular-nums text-graphite-400">· {m.at.slice(11, 16)}</span>
                      </p>
                    </div>
                  </li>
                );
              }
              const outgoing = m.from !== 'paciente';
              return (
                <li key={m.id} className="flex flex-col gap-3">
                  {dayChip}
                  <div className={cn('flex', outgoing ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'flex max-w-[85%] flex-col gap-1 rounded-md px-3.5 py-2.5 text-[14px] leading-[22px] shadow-sm sm:max-w-[70%]',
                        m.from === 'paciente' && 'rounded-tl-xs border border-graphite-200 bg-white text-graphite-900',
                        m.from === 'ia' && 'rounded-tr-xs border border-ai/20 bg-ai-bg text-graphite-900',
                        m.from === 'atendente' && 'rounded-tr-xs border border-gold-200 bg-gold-50 text-graphite-900',
                      )}
                    >
                      {outgoing && (
                        <span className={cn('flex items-center gap-1 text-[11px] font-bold', m.from === 'ia' ? 'text-ai' : 'text-gold-700')}>
                          {m.from === 'ia' ? <Bot size={12} aria-hidden="true" /> : <UserRound size={12} aria-hidden="true" />}
                          {FROM_LABEL[m.from]}
                        </span>
                      )}
                      {!outgoing && <span className="sr-only">{FROM_LABEL[m.from]}: </span>}
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <span className="flex items-center justify-end gap-1 text-[11px] tabular-nums text-graphite-500">
                        {m.at.slice(11, 16)}
                        {outgoing && <StatusIcon status={m.status} />}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {aiTyping && (
              <li className="flex justify-end">
                <span className="inline-flex items-center gap-1 rounded-md bg-ai-bg px-3 py-2 text-[12px] font-semibold text-ai">
                  <Bot size={12} aria-hidden="true" /> {assistantName} (simulação) está digitando…
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      {canEdit && onSimulateIncoming ? (
        <SimulateIncoming contactName={conversation.contactName} onReceive={onSimulateIncoming} />
      ) : (
        <div className="flex justify-center bg-ivory pb-2">
          <Badge tone="neutral" size="sm">
            Ambiente de demonstração — mensagens simuladas
          </Badge>
        </div>
      )}
      <MessageComposer
        mode={conversation.mode}
        onSend={onSend}
        onTakeOver={() => onModeChange('humano')}
        onAttach={onAttach}
        closed={closed}
        onReopen={() => onStatusChange?.('aberta')}
        readOnly={!canEdit}
        sending={sending}
      />
    </section>
  );
}
