/**
 * Agente 07 — configurações do Assistente IA (SIMULAÇÃO).
 *
 * `AiConfig` (core) cobre identidade, FAQ, horários e transferência. Os campos humanizados abaixo
 * (descrição, personalidade, objetivo, limites, instruções e respostas personalizadas) ainda não
 * existem no tipo compartilhado: são gravados como campos OPCIONAIS no mesmo documento `aiConfig`
 * via `messagingService.updateAiConfig` (nenhum armazenamento paralelo) e lidos com `withExtras`.
 * Pedido de promoção ao core: docs/change-requests/07-whatsapp-ia.md.
 */
import type { AiConfig } from '@core';
import { defaultAiConfig } from '@ds/mocks/business';

/** Resposta personalizada: palavras-chave → texto definido pela clínica. */
export interface AiCustomReply {
  id: string;
  label: string;
  keywords: string[];
  answer: string;
  enabled: boolean;
}

export interface AiConfigExtras {
  /** Descrição curta do assistente (usada em "informações gerais"). */
  description: string;
  personality: string;
  objective: string;
  /** Limites de atuação em texto livre (complementa `forbiddenTopics`). */
  limits: string;
  /**
   * Instruções administrativas. Na simulação atual ficam apenas registradas — serão o
   * "prompt de sistema" quando houver um provedor de IA real no backend.
   */
  adminInstructions: string;
  customReplies: AiCustomReply[];
  /** A Central WhatsApp responde automaticamente (simulação) nas conversas em modo IA. */
  autoReplyInCentral: boolean;
}

export type AiSettings = AiConfig & AiConfigExtras;

export const DEFAULT_AI_EXTRAS: AiConfigExtras = {
  description: 'Assistente administrativo da Humanittá Saúde Integral no WhatsApp (demonstração).',
  personality: 'Acolhedora, educada, objetiva e profissional.',
  objective: 'Ajudar pacientes com informações administrativas, horários, serviços e agendamentos.',
  limits: 'Não fornece diagnósticos, prescrições ou orientações clínicas individualizadas. Não informa valores não cadastrados.',
  adminInstructions:
    'Sempre se apresentar como assistente da clínica. Confirmar nome completo antes de tratar de agendamentos. Solicitar intervenção de um colaborador quando necessário.',
  customReplies: [
    {
      id: 'cr-estacionamento',
      label: 'Estacionamento',
      keywords: ['estacionamento', 'estacionar', 'vaga de carro'],
      answer: 'Informações sobre estacionamento: [a confirmar com a clínica]. Nossa recepção pode orientar você.',
      enabled: true,
    },
    {
      id: 'cr-documentos',
      label: 'Documentos para a consulta',
      keywords: ['documento', 'documentos', 'levar'],
      answer: 'Para a consulta, traga um documento com foto. Outras orientações: [a confirmar com a clínica].',
      enabled: true,
    },
  ],
  autoReplyInCentral: true,
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Configuração salva + campos humanizados (com padrão para os que ainda não foram gravados). */
export function withExtras(config: AiConfig): AiSettings {
  const partial = config as AiConfig & Partial<AiConfigExtras>;
  return {
    ...clone(DEFAULT_AI_EXTRAS),
    ...config,
    customReplies: partial.customReplies ?? clone(DEFAULT_AI_EXTRAS.customReplies),
  };
}

/** Configuração fictícia de fábrica (restaurar padrão). */
export function defaultAiSettings(): AiSettings {
  return { ...clone(defaultAiConfig), ...clone(DEFAULT_AI_EXTRAS) };
}
