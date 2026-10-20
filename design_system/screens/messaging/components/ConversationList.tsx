import { useMemo, useState } from 'react';
import { Bot, UserRound } from 'lucide-react';
import { Avatar, FilterChip, SearchInput } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { Conversation } from '@ds/mocks/types';
import { DEMO_TODAY } from '@ds/mocks/business';

type ListFilter = 'todas' | 'nao_lidas' | 'ia' | 'humano';

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

function formatListTime(iso: string): string {
  if (iso.slice(0, 10) === DEMO_TODAY) return iso.slice(11, 16);
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function ConversationList({ conversations, selectedId, onSelect, className }: ConversationListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>('todas');

  const counts = useMemo(
    () => ({
      nao_lidas: conversations.filter((c) => c.unread > 0).length,
      ia: conversations.filter((c) => c.mode === 'ia').length,
      humano: conversations.filter((c) => c.mode === 'humano').length,
    }),
    [conversations],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (filter === 'nao_lidas' && c.unread === 0) return false;
        if (filter === 'ia' && c.mode !== 'ia') return false;
        if (filter === 'humano' && c.mode !== 'humano') return false;
        if (q && !`${c.contactName} ${c.phone} ${c.lastMessage}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [conversations, filter, query]);

  return (
    <section aria-label="Conversas" className={cn('flex min-h-0 flex-col bg-white', className)}>
      <div className="flex flex-col gap-3 border-b border-graphite-100 p-4">
        <SearchInput
          aria-label="Buscar conversas"
          placeholder="Buscar conversa ou telefone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar conversas">
          <FilterChip label="Todas" active={filter === 'todas'} onClick={() => setFilter('todas')} />
          <FilterChip label="Não lidas" count={counts.nao_lidas} active={filter === 'nao_lidas'} onClick={() => setFilter('nao_lidas')} />
          <FilterChip label="IA" count={counts.ia} active={filter === 'ia'} onClick={() => setFilter('ia')} />
          <FilterChip label="Humano" count={counts.humano} active={filter === 'humano'} onClick={() => setFilter('humano')} />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto" role="list">
        {visible.length === 0 && (
          <li className="p-6 text-center text-[13px] text-graphite-500">Nenhuma conversa encontrada.</li>
        )}
        {visible.map((c) => {
          const selected = c.id === selectedId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-graphite-100 px-4 py-3 text-left transition-colors',
                  'hover:bg-graphite-50 focus-visible:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus',
                  selected && 'bg-gold-50 hover:bg-gold-50',
                )}
              >
                <Avatar name={c.contactName} size="md" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className={cn('flex-1 truncate text-[14px] text-graphite-900', c.unread > 0 ? 'font-bold' : 'font-semibold')}>
                      {c.contactName}
                    </span>
                    <span className={cn('shrink-0 text-[12px] tabular-nums', c.unread > 0 ? 'font-bold text-gold-600' : 'text-graphite-500')}>
                      {formatListTime(c.lastAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-[13px] text-graphite-500">{c.lastMessage}</span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-graphite-900">
                        <span className="sr-only">Não lidas: </span>
                        {c.unread}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      c.mode === 'ia' ? 'bg-ai-bg text-ai' : 'bg-info-bg text-info',
                    )}
                  >
                    {c.mode === 'ia' ? <Bot size={12} aria-hidden="true" /> : <UserRound size={12} aria-hidden="true" />}
                    {c.mode === 'ia' ? 'Assistente IA' : c.assignedTo ?? 'Atendimento humano'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
