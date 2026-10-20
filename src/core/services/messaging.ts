/** Central WhatsApp (simulada) + Assistente IA. Nenhuma mensagem sai do navegador. */
import type { AiConfig, ConversationRecord, ID, MessageRecord } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { conflict, validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';
import { isoAfter } from '../clock';

const ov = () => r.clinicSettings.get().permissionOverrides;

/** Horário da próxima mensagem: nunca antes da última da conversa (a semente vai até 10:42). */
function nextMessageAt(conversationId: ID): string {
  const last = r.messages
    .list()
    .filter((m) => m.conversationId === conversationId)
    .reduce<string | undefined>((max, m) => (!max || m.at > max ? m.at : max), undefined);
  const conv = r.conversations.getById(conversationId);
  return isoAfter(conv && (!last || conv.lastAt > last) ? conv.lastAt : last);
}

export function sendMessage(ctx: AccessContext, conversationId: ID, text: string): MessageRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  if (!text.trim()) throw validation({ text: 'Digite uma mensagem.' });
  r.conversations.require(conversationId);
  const at = nextMessageAt(conversationId);
  const msg = r.messages.create({ id: newId('m'), conversationId, from: 'atendente', text: text.trim(), at, status: 'enviada' });
  r.conversations.update(conversationId, { lastMessage: msg.text, lastAt: at });
  return msg;
}

/**
 * Mensagem gerada pelo Assistente IA (simulação local).
 * Recusa (CONFLICT) se a conversa estiver em atendimento humano: depois da transferência,
 * nenhuma resposta automática pode sair (CR 07 §5).
 */
export function appendAiMessage(conversationId: ID, text: string): MessageRecord {
  const conv = r.conversations.require(conversationId);
  if (conv.mode !== 'ia') throw conflict('Conversa em atendimento humano: o Assistente IA não responde automaticamente.');
  const at = nextMessageAt(conversationId);
  const msg = r.messages.create({ id: newId('m'), conversationId, from: 'ia', text, at, status: 'entregue' });
  r.conversations.update(conversationId, { lastMessage: text, lastAt: at });
  return msg;
}

export function markConversationRead(ctx: AccessContext, conversationId: ID): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'ver', ov());
  return r.conversations.update(conversationId, { unread: 0 });
}

/** Assume a conversa (IA → humano) ou devolve para a IA. */
export function setConversationMode(ctx: AccessContext, conversationId: ID, mode: ConversationRecord['mode'], assignedTo?: string): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const who = assignedTo ?? r.users.getById(ctx.userId)?.name;
  return r.conversations.update(conversationId, { mode, assignedTo: mode === 'humano' ? who : undefined });
}

export function linkConversationToPatient(ctx: AccessContext, conversationId: ID, patientId: ID): ConversationRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  const p = r.patients.require(patientId);
  return r.conversations.update(conversationId, { patientId: p.id, contactName: p.name });
}

export function updateAiConfig(ctx: AccessContext, patch: Partial<AiConfig>): AiConfig {
  assertCan(ctx, 'assistente_ia', 'editar', ov());
  return r.aiConfig.update(patch);
}
