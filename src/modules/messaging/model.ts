/**
 * Agente 07 — extensões LOCAIS e opcionais dos tipos de conversa/mensagem.
 *
 * O tipo compartilhado `ConversationRecord` ainda não tem status (aberta/pendente/encerrada) e
 * `MessageRecord` não distingue mensagens de sistema. Os campos abaixo são OPCIONAIS e gravados no
 * mesmo registro do banco compartilhado; leitores que não os conhecem continuam funcionando
 * (conversa sem `status` = aberta). Pedido de promoção: docs/change-requests/07-whatsapp-ia.md.
 */
import type { ConversationRecord, MessageRecord } from '@core';

export type ConversationStatus = 'aberta' | 'pendente' | 'encerrada';

export const CONVERSATION_STATUS_LABEL: Record<ConversationStatus, string> = {
  aberta: 'Aberta',
  pendente: 'Pendente',
  encerrada: 'Finalizada',
};

export interface ConversationView extends ConversationRecord {
  status?: ConversationStatus;
}

export interface MessageView extends MessageRecord {
  /** 'sistema' = registro de evento (transferência, status…), nunca enviado ao contato. */
  kind?: 'sistema';
}

export type ConversationPatch = Partial<Omit<ConversationView, 'id'>>;

export function statusOf(c: ConversationRecord): ConversationStatus {
  return (c as ConversationView).status ?? 'aberta';
}

export function isSystemMessage(m: MessageRecord): boolean {
  return (m as MessageView).kind === 'sistema';
}

export const TAG_HUMAN = 'Atendimento humano';

/** Etiquetas demonstrativas sugeridas (a equipe também pode criar outras). */
export const DEMO_TAGS: string[] = ['Novo contato', 'Agendamento', 'Aguardando confirmação', 'Retorno', TAG_HUMAN, 'Finalizado'];

/** Indicadores calculados a partir das conversas visíveis (sem números fixos). */
export interface MessagingStats {
  open: number;
  pending: number;
  closed: number;
  ia: number;
  humano: number;
  unread: number;
}

export function computeStats(conversations: ConversationRecord[]): MessagingStats {
  const s: MessagingStats = { open: 0, pending: 0, closed: 0, ia: 0, humano: 0, unread: 0 };
  for (const c of conversations) {
    const st = statusOf(c);
    if (st === 'aberta') s.open++;
    else if (st === 'pendente') s.pending++;
    else s.closed++;
    if (st !== 'encerrada') {
      if (c.mode === 'ia') s.ia++;
      else s.humano++;
    }
    s.unread += c.unread;
  }
  return s;
}
