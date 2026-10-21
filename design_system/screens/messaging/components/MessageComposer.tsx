import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Archive, Bot, Eye, Paperclip, SendHorizontal, Zap } from 'lucide-react';
import { Button, IconButton } from '@ds/components';
import { QUICK_REPLIES } from '@ds/mocks/business';

export interface MessageComposerProps {
  mode: 'ia' | 'humano';
  onSend: (text: string) => void;
  onTakeOver: () => void;
  onAttach?: () => void;
  /** Conversa finalizada: mostra a opção de reabrir no lugar do campo. */
  closed?: boolean;
  onReopen?: () => void;
  /** Perfil sem `whatsapp ≥ editar`: somente leitura. */
  readOnly?: boolean;
  sending?: boolean;
}

export function MessageComposer({ mode, onSend, onTakeOver, onAttach, closed = false, onReopen, readOnly = false, sending = false }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showQuick, setShowQuick] = useState(false);

  if (readOnly) {
    return (
      <div className="flex items-start gap-2 border-t border-graphite-200 bg-graphite-50 p-4 text-[13px] text-graphite-600">
        <Eye size={18} className="mt-0.5 shrink-0 text-graphite-400" aria-hidden="true" />
        Seu perfil pode visualizar esta conversa, mas não responder.
      </div>
    );
  }

  if (closed) {
    return (
      <div className="flex flex-col gap-3 border-t border-graphite-200 bg-graphite-50 p-4 sm:flex-row sm:items-center">
        <span className="flex flex-1 items-start gap-2 text-[13px] text-graphite-700">
          <Archive size={18} className="mt-0.5 shrink-0 text-graphite-400" aria-hidden="true" />
          Conversa finalizada. Reabra para voltar a atender este contato.
        </span>
        <Button size="sm" variant="secondary" onClick={onReopen}>
          Reabrir conversa
        </Button>
      </div>
    );
  }

  if (mode === 'ia') {
    return (
      <div className="flex flex-col gap-3 border-t border-graphite-200 bg-ai-bg/60 p-4 sm:flex-row sm:items-center">
        <span className="flex flex-1 items-start gap-2 text-[13px] text-graphite-700">
          <Bot size={18} className="mt-0.5 shrink-0 text-ai" aria-hidden="true" />
          O Assistente Humanittá está respondendo esta conversa. Assuma o atendimento para enviar mensagens.
        </span>
        <Button size="sm" onClick={onTakeOver}>
          Assumir conversa
        </Button>
      </div>
    );
  }

  const send = () => {
    const t = text.trim();
    if (!t || sending) return;
    onSend(t);
    setText('');
    setShowQuick(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-graphite-200 bg-white p-3 sm:p-4">
      {showQuick && (
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Respostas rápidas">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setText(q)}
              className="rounded-full border border-graphite-200 bg-graphite-50 px-3 py-1.5 text-left text-[12px] font-semibold text-graphite-700 hover:border-gold-300 hover:bg-gold-50 focus-visible:outline-none focus-visible:shadow-focus"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <IconButton
          icon={Zap}
          label={showQuick ? 'Ocultar respostas rápidas' : 'Mostrar respostas rápidas'}
          variant="ghost"
          aria-pressed={showQuick}
          onClick={() => setShowQuick((s) => !s)}
        />
        <IconButton icon={Paperclip} label="Anexar arquivo (simulado)" variant="ghost" onClick={onAttach} />
        <label htmlFor="message-composer" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="message-composer"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-sm border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:border-gold-500 focus:outline-none focus:shadow-focus"
        />
        <IconButton icon={SendHorizontal} label="Enviar mensagem" variant="secondary" onClick={send} disabled={!text.trim()} />
      </div>
    </div>
  );
}
