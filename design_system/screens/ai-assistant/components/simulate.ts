import type { AiAssistantConfig } from '@ds/mocks/business';

export type SimulatedIntent =
  | 'saudacao'
  | 'agendamento'
  | 'reagendamento'
  | 'cancelamento'
  | 'confirmacao'
  | 'faq'
  | 'financeiro'
  | 'clinico'
  | 'humano'
  | 'reclamacao'
  | 'desconhecida';

export const INTENT_LABEL: Record<SimulatedIntent, string> = {
  saudacao: 'Saudação',
  agendamento: 'Agendar consulta',
  reagendamento: 'Reagendar consulta',
  cancelamento: 'Cancelar consulta',
  confirmacao: 'Confirmar presença',
  faq: 'Dúvida frequente',
  financeiro: 'Assunto financeiro',
  clinico: 'Dúvida clínica / urgência',
  humano: 'Pedido de atendente',
  reclamacao: 'Insatisfação',
  desconhecida: 'Não identificada',
};

export interface SimulationResult {
  intent: SimulatedIntent;
  confidence: number; // 0..1
  reply: string;
  transfer: boolean;
  matchedKeywords: string[];
  faqId?: string;
  entities: { label: string; value: string }[];
}

const SPECIALTY_WORDS: { word: string; label: string }[] = [
  { word: 'dent', label: 'Odontologia' },
  { word: 'odonto', label: 'Odontologia' },
  { word: 'aparelho', label: 'Odontologia' },
  { word: 'fono', label: 'Fonoaudiologia' },
  { word: 'fala', label: 'Fonoaudiologia' },
  { word: 'estétic', label: 'Estética Avançada' },
  { word: 'estetic', label: 'Estética Avançada' },
  { word: 'pele', label: 'Estética Avançada' },
  { word: 'psic', label: 'Psicologia' },
  { word: 'terapia', label: 'Psicologia' },
  { word: 'quiro', label: 'Quiropraxia' },
  { word: 'coluna', label: 'Quiropraxia' },
  { word: 'podo', label: 'Podologia' },
  { word: 'unha', label: 'Podologia' },
  { word: 'fisio', label: 'Fisioterapia' },
  { word: 'nutri', label: 'Nutrição' },
  { word: 'dieta', label: 'Nutrição' },
];

const DAY_WORDS = ['segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado', 'amanhã', 'amanha', 'hoje'];

function normalize(s: string): string {
  return s.toLowerCase();
}

function findAny(text: string, words: string[]): string[] {
  return words.filter((w) => text.includes(w));
}

function ruleEnabled(config: AiAssistantConfig, id: string): boolean {
  return config.transferRules.find((r) => r.id === id)?.enabled ?? false;
}

function capabilityEnabled(config: AiAssistantConfig, id: string): boolean {
  return config.capabilities.find((c) => c.id === id)?.enabled ?? false;
}

/** Motor de regras simples para o ambiente de testes (não é IA real). */
export function simulateReply(input: string, config: AiAssistantConfig): SimulationResult {
  const text = normalize(input);
  const entities: SimulationResult['entities'] = [];
  const spec = SPECIALTY_WORDS.find((s) => text.includes(s.word));
  if (spec) entities.push({ label: 'Especialidade', value: spec.label });
  const day = DAY_WORDS.find((d) => text.includes(d));
  if (day) entities.push({ label: 'Data mencionada', value: day });
  const hour = text.match(/\b(\d{1,2})\s?(h|:\d{2})/);
  if (hour) entities.push({ label: 'Horário mencionado', value: hour[0] });

  const transferTo = (intent: SimulatedIntent, matched: string[], confidence: number): SimulationResult => ({
    intent,
    confidence,
    reply: config.transferMessage,
    transfer: true,
    matchedKeywords: matched,
    entities,
  });

  // 1. Pedido explícito de humano
  const human = findAny(text, ['atendente', 'humano', 'pessoa', 'recepção', 'recepcao', 'falar com alguém', 'falar com alguem']);
  if (human.length && ruleEnabled(config, 'pedido')) return transferTo('humano', human, 0.96);

  // 2. Clínico / urgência
  const clinical = findAny(text, ['dor', 'sangr', 'urgên', 'urgen', 'febre', 'inchad', 'remédio', 'remedio', 'sintoma']);
  if (clinical.length && ruleEnabled(config, 'clinico')) {
    return {
      ...transferTo('clinico', clinical, 0.9),
      reply: `Sinto muito que você esteja passando por isso. Não posso dar orientações clínicas por aqui, então ${config.transferMessage.charAt(0).toLowerCase()}${config.transferMessage.slice(1)} Em caso de emergência, procure o pronto atendimento mais próximo.`,
    };
  }

  // 3. Reclamação
  const complaint = findAny(text, ['reclama', 'péssim', 'pessim', 'absurdo', 'insatisfeit', 'demora']);
  if (complaint.length && ruleEnabled(config, 'insatisfacao')) {
    return { ...transferTo('reclamacao', complaint, 0.82), reply: `Lamentamos muito pela experiência. ${config.transferMessage}` };
  }

  // 4. Financeiro (antes do FAQ só se a regra estiver ativa e envolver parcelamento/valor)
  const finance = findAny(text, ['valor', 'preço', 'preco', 'quanto custa', 'parcel', 'reembolso', 'boleto', 'cobran']);
  if (finance.length && ruleEnabled(config, 'financeiro')) return transferTo('financeiro', finance, 0.88);

  // 5. FAQ
  for (const faq of config.faqs) {
    if (!faq.enabled) continue;
    const matched = faq.keywords.filter((k) => text.includes(normalize(k)));
    if (matched.length) {
      if (!capabilityEnabled(config, 'faq')) break;
      return {
        intent: 'faq',
        confidence: Math.min(0.97, 0.7 + matched.length * 0.1),
        reply: faq.answer,
        transfer: false,
        matchedKeywords: matched,
        faqId: faq.id,
        entities,
      };
    }
  }

  // 6. Agenda
  const cancel = findAny(text, ['cancelar', 'desmarcar']);
  if (cancel.length) {
    return capabilityEnabled(config, 'reagendar')
      ? { intent: 'cancelamento', confidence: 0.9, reply: 'Posso ajudar com o cancelamento. Para confirmar, me informe o nome completo do paciente e a data da consulta.', transfer: false, matchedKeywords: cancel, entities }
      : transferTo('cancelamento', cancel, 0.9);
  }
  const resched = findAny(text, ['reagendar', 'remarcar', 'trocar o horário', 'trocar o horario', 'mudar o horário', 'mudar o horario']);
  if (resched.length) {
    return capabilityEnabled(config, 'reagendar')
      ? { intent: 'reagendamento', confidence: 0.91, reply: 'Claro! Tenho horários livres na terça (20/10) às 10h00 e na quarta (21/10) às 16h30. Algum deles funciona para você?', transfer: false, matchedKeywords: resched, entities }
      : transferTo('reagendamento', resched, 0.91);
  }
  const confirm = findAny(text, ['confirmo', 'confirmar', 'confirmado', 'estarei']);
  if (confirm.length || text.trim() === '1') {
    return { intent: 'confirmacao', confidence: 0.93, reply: 'Presença confirmada! Obrigado, até breve.', transfer: false, matchedKeywords: confirm.length ? confirm : ['1'], entities };
  }
  const schedule = findAny(text, ['marcar', 'agendar', 'agenda', 'consulta', 'horário', 'horario', 'vaga']);
  if (schedule.length) {
    if (!capabilityEnabled(config, 'agendar')) return transferTo('agendamento', schedule, 0.88);
    const who = spec ? ` de ${spec.label}` : '';
    return {
      intent: 'agendamento',
      confidence: spec ? 0.94 : 0.84,
      reply: spec
        ? `Ótimo! Para ${spec.label}, tenho estes horários: terça (20/10) às 9h00, quarta (21/10) às 14h30 ou quinta (22/10) às 16h00. Qual prefere?`
        : `Será um prazer agendar sua consulta${who}. Qual especialidade você procura? Atendemos Odontologia, Fonoaudiologia, Estética Avançada, Psicologia, Quiropraxia, Podologia, Fisioterapia e Nutrição.`,
      transfer: false,
      matchedKeywords: schedule,
      entities,
    };
  }

  // 7. Saudação
  const greet = findAny(text, ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite']);
  if (greet.length) {
    return { intent: 'saudacao', confidence: 0.95, reply: config.greeting, transfer: false, matchedKeywords: greet, entities };
  }

  return {
    intent: 'desconhecida',
    confidence: 0.32,
    reply: ruleEnabled(config, 'falhas')
      ? `Desculpe, não entendi bem. ${config.transferMessage}`
      : 'Desculpe, não entendi bem. Você pode me dizer se deseja agendar, confirmar ou tirar uma dúvida?',
    transfer: ruleEnabled(config, 'falhas'),
    matchedKeywords: [],
    entities,
  };
}
