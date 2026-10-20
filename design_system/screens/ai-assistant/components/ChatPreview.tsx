import { Bot } from 'lucide-react';
import { Badge } from '@ds/components';
import type { AiSettings } from '@modules/ai-assistant/settings';

export interface ChatPreviewProps {
  config: AiSettings;
}

/** Prévia estática de como o paciente vê a primeira mensagem do assistente. */
export function ChatPreview({ config }: ChatPreviewProps) {
  return (
    <section aria-label="Prévia da conversa" className="overflow-hidden rounded-lg border border-graphite-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 bg-graphite-900 px-4 py-3 text-[#F3EFE8]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400 text-gold-300">
          <Bot size={18} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-bold">{config.name || 'Assistente'}</span>
          <span className="text-[11px] text-graphite-300">{config.enabled ? 'online · responde em segundos' : 'desativado'}</span>
        </div>
      </header>
      <div className="flex flex-col gap-3 bg-ivory p-4">
        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-md rounded-tr-xs border border-graphite-200 bg-white px-3 py-2 text-[13px] text-graphite-900">
            Olá, boa tarde!
          </p>
        </div>
        {config.enabled ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-md rounded-tl-xs border border-ai/20 bg-ai-bg px-3 py-2 text-[13px] text-graphite-900">
              <p className="whitespace-pre-wrap">{config.greeting}</p>
              {config.signature && <p className="mt-2 text-[11px] font-semibold text-ai">— {config.signature}</p>}
            </div>
          </div>
        ) : (
          <p className="rounded-sm bg-warning-bg p-3 text-[12px] text-warning">
            Assistente desativado: todas as mensagens vão direto para a equipe.
          </p>
        )}
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-graphite-100 px-4 py-3">
        <span className="text-[12px] text-graphite-500">Prévia no WhatsApp</span>
        <Badge tone="neutral" size="sm">
          Demonstração
        </Badge>
      </footer>
    </section>
  );
}
