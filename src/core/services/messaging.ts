/** Central WhatsApp (simulada) + Assistente IA. Nenhuma mensagem sai do navegador. */
import type { AiConfig, ConversationRecord, ID, MessageRecord } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';
import { nowIso } from '../clock';

const ov = () => r.clinicSettings.get().permissionOverrides;

export function sendMessage(ctx: AccessContext, conversationId: ID, text: string): MessageRecord {
  assertCan(ctx, 'whatsapp', 'editar', ov());
  if (!text.trim()) throw validation({ text: 'Digite uma mensagem.' });
  const at = nowIso();
  const msg = r.messages.create({ id: newId('m'), conversationId, from: 'atendente', text: text.trim(), at, status: 'enviada' });
  r.conversations.update(conversationId, { lastMessage: msg.text, lastAt: at });
  return msg;
}

/** Mensagem gerada pelo Assistente IA (simulação local). */
export function appendAiMessage(conversationId: ID, text: string): MessageRecord {
  const at = nowIso();
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
