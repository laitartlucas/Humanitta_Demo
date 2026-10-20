import { useMemo, useState } from 'react';
import { Bot, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import { Badge, EmptyState, useToast } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { ChatMessage, Conversation } from '@ds/mocks/types';
import {
  chatMessages,
  conversationPatientInfo,
  conversations as initialConversations,
  defaultAiConfig,
} from '@ds/mocks/business';
import { ChatThread, ConversationList, PatientPanel } from './components';

type MobileStep = 'lista' | 'conversa' | 'painel';

const NOW_ISO = '2026-10-19T10:46:00';

function nowIso(offsetSec: number): string {
  const d = new Date(`${NOW_ISO}`);
  d.setSeconds(d.getSeconds() + offsetSec);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function MessagingScreen() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [step, setStep] = useState<MobileStep>('lista');
  const [tick, setTick] = useState(0);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const thread = useMemo(
    () => messages.filter((m) => m.conversationId === selectedId).sort((a, b) => a.at.localeCompare(b.at)),
    [messages, selectedId],
  );
  const info = conversationPatientInfo.find((i) => i.conversationId === selectedId);

  const stats = useMemo(
    () => ({
      open: conversations.length,
      unread: conversations.reduce((s, c) => s + c.unread, 0),
      ia: conversations.filter((c) => c.mode === 'ia').length,
      humano: conversations.filter((c) => c.mode === 'humano').length,
    }),
    [conversations],
  );

  const patchConversation = (id: string, patch: Partial<Conversation>) =>
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const select = (id: string) => {
    setSelectedId(id);
    patchConversation(id, { unread: 0 });
    setStep('conversa');
  };

  const changeMode = (mode: 'ia' | 'humano') => {
    if (!selected || selected.mode === mode) return;
    patchConversation(selected.id, {
      mode,
      assignedTo: mode === 'humano' ? selected.assignedTo ?? 'Camila S.' : undefined,
    });
    toast({
      tone: 'info',
      title: mode === 'humano' ? 'Você assumiu a conversa' : 'Assistente IA reativado',
      description:
        mode === 'humano'
          ? `O Assistente IA foi pausado para ${selected.contactName}.`
          : `O ${defaultAiConfig.name} volta a responder ${selected.contactName}.`,
    });
  };

  const transfer = (target: { id: string; label: string }) => {
    if (!selected) return;
    const next = tick + 1;
    setTick(next);
    if (selected.mode === 'ia') {
      setMessages((list) => [
        ...list,
        {
          id: `m-tr-${next}`,
          conversationId: selected.id,
          from: 'ia',
          text: defaultAiConfig.transferMessage,
          at: nowIso(next * 30),
          status: 'entregue',
        },
      ]);
    }
    patchConversation(selected.id, { mode: 'humano', assignedTo: target.label, lastMessage: 'Conversa transferida', lastAt: nowIso(next * 30) });
    toast({ tone: 'success', title: 'Conversa transferida', description: `${selected.contactName} → ${target.label}` });
  };

  const send = (text: string) => {
    if (!selected) return;
    const next = tick + 1;
    setTick(next);
    const id = `m-local-${next}`;
    const at = nowIso(next * 30);
    setMessages((list) => [...list, { id, conversationId: selected.id, from: 'atendente', text, at, status: 'enviada' }]);
    patchConversation(selected.id, { lastMessage: text, lastAt: at });
    window.setTimeout(() => {
      setMessages((list) => list.map((m) => (m.id === id ? { ...m, status: 'entregue' } : m)));
    }, 900);
    window.setTimeout(() => {
      setMessages((list) => list.map((m) => (m.id === id ? { ...m, status: 'lida' } : m)));
    }, 2400);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Stat icon={MessageCircle} label="Conversas abertas" value={stats.open} />
          <Stat icon={MessageCircle} label="Não lidas" value={stats.unread} />
          <Stat icon={Bot} label="Com o Assistente IA" value={stats.ia} />
          <Stat icon={UserRound} label="Com a equipe" value={stats.humano} />
        </dl>
        <Badge tone="gold" icon={ShieldCheck}>
          Simulação de WhatsApp — ambiente de demonstração
        </Badge>
      </div>

      <div className="grid h-[calc(100dvh-220px)] min-h-[560px] overflow-hidden rounded-md border border-graphite-200 bg-white shadow-sm md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px] 2xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={select}
          className={cn('min-h-0 border-graphite-200 md:flex md:border-r', step === 'lista' ? 'flex' : 'hidden')}
        />

        {selected ? (
          <>
            <ChatThread
              className={cn('min-h-0', step === 'conversa' ? 'flex' : 'hidden', step === 'painel' ? 'md:hidden xl:flex' : 'md:flex')}
              conversation={selected}
              messages={thread}
              onBack={() => setStep('lista')}
              onOpenPanel={() => setStep('painel')}
              onModeChange={changeMode}
              onTransfer={transfer}
              onSend={send}
              onAttach={() => toast({ tone: 'info', title: 'Anexo simulado', description: 'Na demonstração, arquivos não são enviados.' })}
            />
            <PatientPanel
              className={cn('min-h-0 border-graphite-200 xl:flex xl:border-l', step === 'painel' ? 'flex' : 'hidden')}
              conversation={selected}
              info={info}
              onBack={() => setStep('conversa')}
              onSchedule={() => toast({ tone: 'success', title: 'Abrindo agenda', description: `Novo agendamento para ${selected.contactName} (simulado).` })}
              onOpenRecord={() => toast({ tone: 'info', title: 'Ficha do paciente', description: 'Disponível no módulo Pacientes.' })}
            />
          </>
        ) : (
          <div className={cn('items-center justify-center p-8 md:flex xl:col-span-2', step === 'lista' ? 'hidden' : 'flex')}>
            <EmptyState
              icon={MessageCircle}
              title="Selecione uma conversa"
              description="Escolha uma conversa na lista para visualizar as mensagens."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-gold-600" aria-hidden="true" />
      <dt className="text-graphite-500">{label}</dt>
      <dd className="font-bold tabular-nums text-graphite-900">{value}</dd>
    </div>
  );
}
