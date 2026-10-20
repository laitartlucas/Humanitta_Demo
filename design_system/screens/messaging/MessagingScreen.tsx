import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Bot, Clock3, Lock, MessageCircle, MessageSquareDot, ShieldCheck, UserRound } from 'lucide-react';
import { Badge, EmptyState, useToast } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { TRANSFER_TARGETS } from '@ds/mocks/business';
import {
  nowIso,
  selectAppointments,
  useAction,
  useAiConfig,
  useCan,
  useConversations,
  useMessages,
  usePatients,
  useProfessionals,
  useQuery,
  useServices,
  useSpecialties,
  useUsers,
} from '@core';
import * as chat from '@modules/messaging/service';
import { computeStats, isSystemMessage, type ConversationStatus } from '@modules/messaging/model';
import { withExtras } from '@modules/ai-assistant/settings';
import { INTENT_LABEL } from '@modules/ai-assistant/engine';
import { ChatThread, ConversationList, PatientPanel, type TransferTarget } from './components';
import { LinkPatientModal, ScheduleFromChatModal } from './modals';

type MobileStep = 'lista' | 'conversa' | 'painel';

/** Tempo do "digitando…" da resposta simulada. */
const AI_DELAY_MS = 1400;

export interface MessagingScreenProps {
  /** Abre a ficha do paciente no módulo Pacientes (sem id = lista, para novo cadastro). */
  onOpenPatient?: (patientId?: string) => void;
}

/**
 * Central WhatsApp — DEMONSTRAÇÃO. Lê conversas/mensagens do banco compartilhado (`@core`) e
 * escreve pelos serviços do módulo (`@modules/messaging/service`). Nenhuma mensagem é enviada a
 * números reais e as respostas da IA são simuladas por regras locais.
 */
export function MessagingScreen({ onOpenPatient }: MessagingScreenProps = {}) {
  const { toast } = useToast();
  const canView = useCan('whatsapp', 'ver');
  const canEdit = useCan('whatsapp', 'editar');
  const canSchedule = useCan('agenda_clinica', 'editar');
  const canSeeBalance = useCan('pacientes_financeiro', 'ver');
  const canLink = useCan('pacientes_cadastro', 'ver');

  const conversations = useConversations();
  const aiConfig = withExtras(useAiConfig());
  const patients = usePatients();
  const users = useUsers();
  const professionals = useProfessionals();
  const specialties = useSpecialties();
  const services = useServices();

  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [step, setStep] = useState<MobileStep>('lista');
  const [typing, setTyping] = useState<Set<string>>(() => new Set());
  const [modal, setModal] = useState<'agendar' | 'vincular' | null>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const messages = useMessages(selectedId ?? '');
  const patient = selected?.patientId ? patients.find((p) => p.id === selected.patientId) : undefined;
  const patientId = selected?.patientId;
  const appointments = useQuery((s, c) => (patientId ? selectAppointments(s, c, { patientId }) : []), [patientId]);
  const stats = useMemo(() => computeStats(conversations), [conversations]);

  const { upcoming, past } = useMemo(() => {
    const t = nowIso();
    const active = ['agendada', 'confirmada', 'em_atendimento'];
    return {
      upcoming: appointments.filter((a) => a.start >= t && active.includes(a.status)).sort((a, b) => a.start.localeCompare(b.start)),
      past: appointments.filter((a) => a.start < t).sort((a, b) => b.start.localeCompare(a.start)),
    };
  }, [appointments]);
  const events = useMemo(() => messages.filter(isSystemMessage), [messages]);

  const transferTargets = useMemo<TransferTarget[]>(
    () => [
      ...TRANSFER_TARGETS,
      ...users
        .filter((u) => (u.role === 'admin' || u.role === 'recepcao') && u.status === 'ativo')
        .map((u) => ({ id: u.id, label: u.name, description: `${u.title} · colaborador(a)` })),
    ],
    [users],
  );

  const send = useAction(chat.sendMessage);
  const deliver = useAction(chat.advanceDelivery, { toastOnError: false });
  const receive = useAction(chat.receiveSimulatedMessage);
  const aiReply = useAction(chat.replyWithSimulatedAi);
  const markRead = useAction(chat.markRead, { toastOnError: false });
  const setMode = useAction(chat.setMode);
  const transfer = useAction(chat.transferConversation, { success: 'Conversa transferida' });
  const setStatus = useAction(chat.setStatus);
  const addTag = useAction(chat.addTag);
  const removeTag = useAction(chat.removeTag);
  const link = useAction(chat.linkPatient, { success: 'Conversa vinculada ao paciente' });
  const schedule = useAction(chat.scheduleFromConversation, { success: 'Consulta agendada' });

  /* ---------------- resposta automática simulada (com cancelamento) ---------------- */

  const timers = useRef(new Map<string, number>());
  const stopTyping = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
    setTyping((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  const { run: runAiReply } = aiReply;
  const scheduleAiReply = useCallback(
    (id: string) => {
      stopTyping(id);
      setTyping((s) => new Set(s).add(id));
      const t = window.setTimeout(async () => {
        timers.current.delete(id);
        setTyping((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        // O serviço revalida: se um humano assumiu nesse meio-tempo, nada é enviado.
        const out = await runAiReply(id);
        if (out?.status === 'bloqueada_humano') {
          toast({ tone: 'info', title: 'Resposta automática cancelada', description: 'A conversa está em atendimento humano.' });
        } else if (out?.status === 'respondida' && out.result.transfer) {
          toast({ tone: 'info', title: 'Transferida para a equipe', description: `Motivo: ${INTENT_LABEL[out.result.intent]} (simulação).` });
        }
      }, AI_DELAY_MS);
      timers.current.set(id, t);
    },
    [runAiReply, stopTyping, toast],
  );

  /* ------------------------------- leitura ------------------------------- */

  const { run: runMarkRead } = markRead;
  useEffect(() => {
    if (selected && selected.unread > 0) void runMarkRead(selected.id);
  }, [selected?.id, selected?.unread, runMarkRead]);

  /* ------------------------------- ações ------------------------------- */

  const select = (id: string) => {
    setSelectedId(id);
    setStep('conversa');
  };

  const changeMode = async (mode: 'ia' | 'humano') => {
    if (!selected || selected.mode === mode) return;
    if (mode === 'humano') stopTyping(selected.id);
    const ok = await setMode.run(selected.id, mode);
    if (ok) {
      toast({
        tone: 'info',
        title: mode === 'humano' ? 'Você assumiu a conversa' : 'Assistente IA (simulação) reativado',
        description:
          mode === 'humano'
            ? `Respostas automáticas pausadas para ${selected.contactName}.`
            : `O ${aiConfig.name} volta a responder ${selected.contactName} com respostas simuladas.`,
      });
    }
  };

  const onTransfer = (target: { id: string; label: string }) => {
    if (!selected) return;
    stopTyping(selected.id);
    void transfer.run(selected.id, target.label);
  };

  const onSend = async (text: string) => {
    if (!selected) return;
    const msg = await send.run(selected.id, text);
    if (!msg) return;
    // Entrega simulada: nenhuma mensagem sai do navegador.
    window.setTimeout(() => void deliver.run(msg.id, 'entregue'), 900);
    window.setTimeout(() => void deliver.run(msg.id, 'lida'), 2400);
  };

  const onSimulateIncoming = async (text: string) => {
    if (!selected) return;
    const msg = await receive.run(selected.id, text);
    if (msg && selected.mode === 'ia' && aiConfig.enabled && aiConfig.autoReplyInCentral) scheduleAiReply(selected.id);
  };

  const onStatusChange = async (status: ConversationStatus) => {
    if (!selected) return;
    if (status === 'encerrada') stopTyping(selected.id);
    const ok = await setStatus.run(selected.id, status);
    if (ok) {
      const title = status === 'encerrada' ? 'Conversa finalizada' : status === 'pendente' ? 'Marcada como pendente' : 'Conversa reaberta';
      toast({ tone: 'success', title });
    }
  };

  /* ------------------------------- render ------------------------------- */

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="Central WhatsApp indisponível para o seu perfil"
        description="Peça à administração da clínica para liberar o acesso, se necessário."
      />
    );
  }

  const initialSpecialty = upcoming[0]?.specialty ?? past[0]?.specialty;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Stat icon={MessageCircle} label="Abertas" value={stats.open} />
          <Stat icon={Clock3} label="Pendentes" value={stats.pending} />
          <Stat icon={Archive} label="Finalizadas" value={stats.closed} />
          <Stat icon={MessageSquareDot} label="Não lidas" value={stats.unread} />
          <Stat icon={Bot} label="Com o Assistente IA" value={stats.ia} />
          <Stat icon={UserRound} label="Com a equipe" value={stats.humano} />
        </dl>
        <Badge tone="gold" icon={ShieldCheck}>
          Ambiente de demonstração — mensagens simuladas
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
              messages={messages}
              canEdit={canEdit}
              aiTyping={typing.has(selected.id)}
              assistantName={aiConfig.name}
              sending={send.loading}
              transferTargets={transferTargets}
              onBack={() => setStep('lista')}
              onOpenPanel={() => setStep('painel')}
              onModeChange={changeMode}
              onTransfer={onTransfer}
              onSend={onSend}
              onStatusChange={onStatusChange}
              onSimulateIncoming={onSimulateIncoming}
              onAttach={() => toast({ tone: 'info', title: 'Anexo simulado', description: 'Na demonstração, arquivos não são enviados.' })}
            />
            <PatientPanel
              className={cn('min-h-0 border-graphite-200 xl:flex xl:border-l', step === 'painel' ? 'flex' : 'hidden')}
              conversation={selected}
              patient={patient}
              upcoming={upcoming}
              past={past}
              events={events}
              canEdit={canEdit}
              canSchedule={canEdit && canSchedule}
              canSeeBalance={canSeeBalance}
              onBack={() => setStep('conversa')}
              onSchedule={() => setModal('agendar')}
              onLink={() => setModal('vincular')}
              onOpenRecord={() => (patient && onOpenPatient ? onOpenPatient(patient.id) : toast({ tone: 'info', title: 'Ficha do paciente', description: 'Disponível no módulo Pacientes.' }))}
              onAddTag={(t) => void addTag.run(selected.id, t)}
              onRemoveTag={(t) => void removeTag.run(selected.id, t)}
            />
            <ScheduleFromChatModal
              open={modal === 'agendar'}
              onClose={() => setModal(null)}
              contactName={selected.contactName}
              linked={Boolean(patient)}
              onLink={() => setModal(canLink && canEdit ? 'vincular' : null)}
              professionals={professionals}
              specialties={specialties}
              services={services}
              initialSpecialty={initialSpecialty}
              loading={schedule.loading}
              onConfirm={async (input) => Boolean(await schedule.run(selected.id, input))}
            />
            <LinkPatientModal
              open={modal === 'vincular'}
              onClose={() => setModal(null)}
              contactName={selected.contactName}
              phone={selected.phone}
              patients={patients}
              loading={link.loading}
              onLink={async (pid) => Boolean(await link.run(selected.id, pid))}
              onCreatePatient={onOpenPatient ? () => onOpenPatient() : undefined}
            />
          </>
        ) : (
          <div className={cn('items-center justify-center p-8 md:flex xl:col-span-2', step === 'lista' ? 'hidden' : 'flex')}>
            <EmptyState
              icon={MessageCircle}
              title={conversations.length ? 'Selecione uma conversa' : 'Nenhuma conversa ainda'}
              description={
                conversations.length
                  ? 'Escolha uma conversa na lista para visualizar as mensagens.'
                  : 'Quando houver integração com o WhatsApp, as conversas recebidas aparecerão aqui.'
              }
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
