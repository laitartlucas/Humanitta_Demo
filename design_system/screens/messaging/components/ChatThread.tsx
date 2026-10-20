import { useEffect, useRef } from 'react';
import { ArrowLeft, Bot, Check, CheckCheck, Info, UserRound } from 'lucide-react';
import { Avatar, Badge, IconButton, SegmentedControl } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { ChatMessage, Conversation } from '@ds/mocks/types';
import { formatDateBR } from '@ds/mocks/business';
import { MessageComposer } from './MessageComposer';
import { TransferMenu } from './TransferMenu';

export interface ChatThreadProps {
  conversation: Conversation;
  messages: ChatMessage[];
  onBack: () => void;
  onOpenPanel: () => void;
  onModeChange: (mode: 'ia' | 'humano') => void;
  onTransfer: (target: { id: string; label: string }) => void;
  onSend: (text: string) => void;
  onAttach: () => void;
  className?: string;
}

const FROM_LABEL: Record<ChatMessage['from'], string> = {
  paciente: 'Paciente',
  ia: 'Assistente IA',
  atendente: 'Atendente',
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
  className,
}: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, conversation.id]);

  let lastDay = '';

  return (
    <section aria-label={`Conversa com ${conversation.contactName}`} className={cn('flex min-h-0 flex-col bg-ivory', className)}>
      <header className="flex flex-wrap items-center gap-3 border-b border-graphite-200 bg-white px-3 py-3 sm:px-4">
        <div className="md:hidden">
          <IconButton icon={ArrowLeft} label="Voltar para a lista de conversas" onClick={onBack} />
        </div>
        <Avatar name={conversation.contactName} size="md" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-[15px] font-bold text-graphite-900">{conversation.contactName}</h2>
          <span className="truncate text-[12px] text-graphite-500">{conversation.phone}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <TransferMenu onTransfer={onTransfer} currentTarget={conversation.assignedTo} compact />
          <div className="xl:hidden">
            <IconButton icon={Info} label="Ver dados do paciente" onClick={onOpenPanel} />
          </div>
        </div>
      </header>

      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-[12px] font-semibold',
          conversation.mode === 'ia' ? 'bg-ai-bg text-ai' : 'bg-info-bg text-info',
        )}
        role="status"
      >
        {conversation.mode === 'ia' ? <Bot size={14} aria-hidden="true" /> : <UserRound size={14} aria-hidden="true" />}
        {conversation.mode === 'ia'
          ? 'Atendimento automático pelo Assistente Humanittá'
          : `Atendimento humano${conversation.assignedTo ? ` — ${conversation.assignedTo}` : ''}`}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6" aria-live="polite">
        <ol className="flex flex-col gap-3">
          {messages.map((m) => {
            const day = m.at.slice(0, 10);
            const showDay = day !== lastDay;
            lastDay = day;
            const outgoing = m.from !== 'paciente';
            return (
              <li key={m.id} className="flex flex-col gap-3">
                {showDay && (
                  <div className="flex justify-center">
                    <span className="rounded-full bg-graphite-100 px-3 py-1 text-[11px] font-semibold text-graphite-600">
                      {formatDateBR(m.at)}
                    </span>
                  </div>
                )}
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
        </ol>
        <div ref={endRef} />
      </div>

      <div className="flex justify-center bg-ivory pb-2">
        <Badge tone="neutral" size="sm">
          Demonstração — nenhuma mensagem é enviada ao WhatsApp
        </Badge>
      </div>
      <MessageComposer mode={conversation.mode} onSend={onSend} onTakeOver={() => onModeChange('humano')} onAttach={onAttach} />
    </section>
  );
}
