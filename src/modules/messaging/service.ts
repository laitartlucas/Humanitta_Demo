/**
 * Agente 07 — operações da Central WhatsApp (SIMULADA). Nenhuma mensagem sai do navegador.
 *
 * Composição dos serviços do core (`messagingService`, `appointmentService`) sobre o MESMO banco
 * compartilhado. Onde o core ainda não tem a operação (status da conversa, etiquetas, mensagens de
 * sistema, recebimento simulado) a escrita usa os repositórios do core com a mesma checagem de
 * permissão (`assertCan`) — e o pedido de promoção ao core está em
 * docs/change-requests/07-whatsapp-ia.md. Assinatura padrão: `fn(ctx, ...args)`; lança `AppError`.
 * Nas telas, use via `useAction`.
 *
 * Ponto de extensão: no produto, cada função vira uma chamada ao backend, que conversa com a API
 * oficial do WhatsApp Business (envio) e recebe webhooks (recebimento). Ver INTEGRATIONS.md.
 */
import {
  appointmentService,
  assertCan,
  conflict,
  messagingService,
  newId,
  now,
  nowIso,
  repositories as r,
  validation,
  type AccessContext,
  type AppointmentRecord,
  type ConversationRecord,
  type ID,
  type MessageRecord,
} from '@core';
import { TRANSFER_TARGETS } from '@ds/mocks/business';
import { simulateReply, INTENT_LABEL, isWithinHours, type SimulationResult } from '@modules/ai-assistant/engine';
import { withExtras } from '@modules/ai-assistant/settings';
import { findAvailableSlots, formatSlot } from './availability';
import {
  CONVERSATION_STATUS_LABEL,
  TAG_HUMAN,
  statusOf,
  type ConversationPatch,
  type ConversationStatus,
  type MessageView,
} from './model';

const ov = () => r.clinicSettings.get().permissionOverrides;
const actorName = (ctx: AccessContext) => r.users.getById(ctx.userId)?.name ?? 'Equipe';

const pad = (n: number) => String(n).padStart(2, '0');
function addSeconds(iso: string, s: number): string {
  const d = new Date(iso);
  d.setSeconds(d.getSeconds() + s);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Horário da próxima mensagem: o relógio da demonstração, mas nunca antes da última mensagem do
 * banco (a semente tem mensagens depois de 10:24). Mantém histórico e lista sempre em ordem.
 */
export function nextTimestamp(): string {
  const base = nowIso();
  const latest = r.messages.list().reduce((m, x) => (x.at > m ? x.at : m), '');
  return latest && latest >= base ? addSeconds(latest, 1) : base;
}

function requireConversation(id: ID): ConversationRecord {
  return r.conversations.require(id);
}

function patchConversation(id: ID, patch: ConversationPatch): ConversationRecord {
  return r.conversations.update(id, patch);
}

/** Registro visual no histórico (transferências, mudanças de status…). Não altera a prévia da lista. */
function logSystem(conversationId: ID, text: string): MessageView {
  const msg: MessageView = { id: newId('m'), conversationId, from: 'atendente', text, at: nextTimestamp(), kind: 'sistema' };
  r.messages.create(msg);
  return msg;
}

function retime(msg: MessageRecord, at: string, conversationPatch: ConversationPatch = {}): MessageRecord {
  const updated = r.messages.update(msg.id, { at });
  patchConversation(msg.conversationId, { lastAt: at, ...conversationPatch });
  return updated;
}

/* ----------------------------- Mensagens ----------------------------- */

/** Envio manual (modo humano). Simulado: a mensagem fica só no banco local. */
export function sendMessage(ctx: AccessContext, conversationId: ID, text: string): MessageRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const conv = requireConversation(conversationId);
  if (statusOf(conv) === 'encerrada') throw conflict('Esta conversa está encerrada. Reabra-a para enviar mensagens.');
  if (conv.mode === 'ia') throw conflict('Assuma o atendimento antes de enviar mensagens.');
  const at = nextTimestamp();
  const msg = messagingService.sendMessage(ctx, conversationId, text);
  return retime(msg, at, { unread: 0 });
}

const STATUS_ORDER: NonNullable<MessageRecord['status']>[] = ['enviada', 'entregue', 'lida'];

/** Avança o status simulado de entrega (enviada → entregue → lida). Nunca retrocede. */
export function advanceDelivery(ctx: AccessContext, messageId: ID, status: NonNullable<MessageRecord['status']>): MessageRecord | undefined {
  assertCan(ctx, 'whatsapp', 'ver', ov());
  const msg = r.messages.getById(messageId);
  if (!msg || msg.from === 'paciente') return msg;
  if (STATUS_ORDER.indexOf(status) <= STATUS_ORDER.indexOf(msg.status ?? 'enviada')) return msg;
  return r.messages.update(messageId, { status });
}

/** Simula uma mensagem RECEBIDA do contato (demonstração — não existe webhook nesta etapa). */
export function receiveSimulatedMessage(ctx: AccessContext, conversationId: ID, text: string): MessageRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const t = text.trim();
  if (!t) throw validation({ text: 'Digite a mensagem simulada do contato.' });
  const conv = requireConversation(conversationId);
  if (statusOf(conv) === 'encerrada') {
    patchConversation(conversationId, { status: 'aberta' });
    logSystem(conversationId, 'Conversa reaberta automaticamente: nova mensagem do contato.');
  }
  const at = nextTimestamp();
  const msg = r.messages.create({ id: newId('m'), conversationId, from: 'paciente', text: t, at });
  patchConversation(conversationId, { lastMessage: t, lastAt: at, unread: requireConversation(conversationId).unread + 1 });
  return msg;
}

export function markRead(ctx: AccessContext, conversationId: ID): ConversationRecord {
  const conv = requireConversation(conversationId);
  if (conv.unread === 0) return conv;
  return messagingService.markConversationRead(ctx, conversationId);
}

/* ------------------------- Assistente (simulado) ------------------------- */

export type AiReplyOutcome =
  | { status: 'respondida'; result: SimulationResult; message: MessageRecord }
  | { status: 'bloqueada_humano' | 'ia_desativada' | 'encerrada' | 'sem_mensagem' };

function transferTargetLabel(id: string): string {
  return TRANSFER_TARGETS.find((t) => t.id === id)?.label ?? 'Recepção';
}

function nextAppointmentLabel(patientId: ID | undefined): string | undefined {
  if (!patientId) return undefined;
  const today = nowIso();
  const next = r.appointments
    .list()
    .filter((a) => a.patientId === patientId && a.start >= today && ['agendada', 'confirmada'].includes(a.status))
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  return next ? `${formatSlot(next.start)} · ${next.professionalName}` : undefined;
}

/**
 * Resposta automática SIMULADA para a última mensagem do contato.
 * Revalida tudo no momento da execução: se a conversa passou para atendimento humano (ou a IA foi
 * desativada) enquanto o "digitando…" corria, NADA é enviado.
 */
export function replyWithSimulatedAi(ctx: AccessContext, conversationId: ID): AiReplyOutcome {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const conv = requireConversation(conversationId);
  if (conv.mode !== 'ia') return { status: 'bloqueada_humano' };
  if (statusOf(conv) === 'encerrada') return { status: 'encerrada' };
  const config = withExtras(r.aiConfig.get());
  if (!config.enabled || !config.autoReplyInCentral) return { status: 'ia_desativada' };

  const thread = r.messages
    .list()
    .filter((m) => m.conversationId === conversationId && (m as MessageView).kind !== 'sistema')
    .sort((a, b) => a.at.localeCompare(b.at));
  const last = thread[thread.length - 1];
  if (!last || last.from !== 'paciente') return { status: 'sem_mensagem' };

  const professionals = r.professionals.list();
  const result = simulateReply(last.text, config, {
    findSlots: (specialty) => findAvailableSlots(professionals, { specialty, limit: 3 }).map((s) => s.label),
    specialties: r.specialties.list().filter((s) => s.active).map((s) => s.name),
    nextAppointment: nextAppointmentLabel(conv.patientId),
  });

  const at = nextTimestamp();
  const message = retime(messagingService.appendAiMessage(conversationId, result.reply), at);
  if (result.transfer) {
    const target = transferTargetLabel(config.transferTarget);
    messagingService.setConversationMode(ctx, conversationId, 'humano', target);
    if (!conv.tags.includes(TAG_HUMAN)) patchConversation(conversationId, { tags: [...conv.tags, TAG_HUMAN] });
    logSystem(conversationId, `Assistente IA (simulação) transferiu para ${target} — motivo: ${INTENT_LABEL[result.intent]}.`);
  }
  return { status: 'respondida', result, message };
}

/** A regra de horário do assistente considera o relógio da demonstração agora? */
export function isAiWithinHours(): boolean {
  return isWithinHours(r.aiConfig.get(), now());
}

/* --------------------------- Gestão da conversa --------------------------- */

/** Humano assume (pausa a IA) ou devolve para a IA simulada. */
export function setMode(ctx: AccessContext, conversationId: ID, mode: ConversationRecord['mode']): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const conv = requireConversation(conversationId);
  if (conv.mode === mode) return conv;
  if (mode === 'ia') {
    if (statusOf(conv) === 'encerrada') throw conflict('Reabra a conversa antes de reativar o Assistente IA.');
    if (!r.aiConfig.get().enabled) throw conflict('O Assistente IA está desativado. Ative-o na tela Assistente IA.');
  }
  const updated = messagingService.setConversationMode(ctx, conversationId, mode);
  logSystem(
    conversationId,
    mode === 'humano'
      ? `${actorName(ctx)} assumiu o atendimento. Respostas automáticas pausadas.`
      : `${actorName(ctx)} reativou o Assistente IA (simulação).`,
  );
  return updated;
}

/** Transfere/atribui para um setor ou colaborador. Sempre resulta em atendimento humano. */
export function transferConversation(ctx: AccessContext, conversationId: ID, assignee: string): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const to = assignee.trim();
  if (!to) throw validation({ assignee: 'Escolha para quem transferir.' });
  const conv = requireConversation(conversationId);
  if (statusOf(conv) === 'encerrada') throw conflict('Reabra a conversa antes de transferir.');
  if (conv.mode === 'humano' && conv.assignedTo === to) return conv;
  if (conv.mode === 'ia') {
    const at = nextTimestamp();
    retime(messagingService.appendAiMessage(conversationId, r.aiConfig.get().transferMessage), at);
  }
  const updated = messagingService.setConversationMode(ctx, conversationId, 'humano', to);
  logSystem(conversationId, `${actorName(ctx)} transferiu o atendimento para ${to}.`);
  return updated;
}

export function setStatus(ctx: AccessContext, conversationId: ID, status: ConversationStatus): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const conv = requireConversation(conversationId);
  const current = statusOf(conv);
  if (current === status) return conv;
  const updated = patchConversation(conversationId, status === 'encerrada' ? { status, unread: 0 } : { status });
  const who = actorName(ctx);
  const text =
    status === 'encerrada'
      ? `${who} encerrou a conversa.`
      : current === 'encerrada'
        ? `${who} reabriu a conversa.`
        : `${who} marcou a conversa como ${CONVERSATION_STATUS_LABEL[status].toLowerCase()}.`;
  logSystem(conversationId, text);
  return updated;
}

export function addTag(ctx: AccessContext, conversationId: ID, tag: string): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const t = tag.trim();
  if (!t) throw validation({ tag: 'Informe a etiqueta.' });
  if (t.length > 32) throw validation({ tag: 'Use até 32 caracteres.' });
  const conv = requireConversation(conversationId);
  if (conv.tags.some((x) => x.toLowerCase() === t.toLowerCase())) return conv;
  return patchConversation(conversationId, { tags: [...conv.tags, t] });
}

export function removeTag(ctx: AccessContext, conversationId: ID, tag: string): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const conv = requireConversation(conversationId);
  return patchConversation(conversationId, { tags: conv.tags.filter((x) => x !== tag) });
}

/** Vincula a conversa a um paciente JÁ cadastrado (não cria cadastro). */
export function linkPatient(ctx: AccessContext, conversationId: ID, patientId: ID): ConversationRecord {
  assertCan(ctx, 'pacientes_cadastro', 'ver', ov());
  const conv = requireConversation(conversationId);
  if (conv.patientId === patientId) return conv;
  const updated = messagingService.linkConversationToPatient(ctx, conversationId, patientId);
  logSystem(conversationId, `${actorName(ctx)} vinculou a conversa ao cadastro de ${updated.contactName}.`);
  return updated;
}

export interface ScheduleFromConversationInput {
  professionalId: ID;
  start: string;
  durationMin: number;
  service: string;
  serviceId?: ID;
}

/**
 * Agenda pela central usando o serviço COMPARTILHADO da Agenda (mesmas validações e conflitos).
 * Exige conversa vinculada a um paciente cadastrado e `agenda_clinica ≥ editar`.
 */
export function scheduleFromConversation(ctx: AccessContext, conversationId: ID, input: ScheduleFromConversationInput): AppointmentRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const conv = requireConversation(conversationId);
  if (!conv.patientId) throw validation({ patientId: 'Vincule a conversa a um paciente cadastrado antes de agendar.' });
  const appt = appointmentService.createAppointment(ctx, {
    patientId: conv.patientId,
    professionalId: input.professionalId,
    service: input.service,
    serviceId: input.serviceId,
    start: input.start,
    durationMin: input.durationMin,
    channel: 'whatsapp',
    status: 'agendada',
  });
  if (!conv.tags.includes('Agendamento')) patchConversation(conversationId, { tags: [...conv.tags, 'Agendamento'] });
  logSystem(conversationId, `${actorName(ctx)} agendou ${appt.service} — ${formatSlot(appt.start)} · ${appt.professionalName}.`);
  return appt;
}
