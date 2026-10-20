/**
 * Agente 07 — motor de respostas SIMULADAS do Assistente IA.
 *
 * NÃO é inteligência artificial: é um conjunto de regras locais, previsível e testável, que usa
 * apenas o que a clínica cadastrou (FAQ, respostas personalizadas, horários, regras de
 * transferência e capacidades). Nenhum dado sai do navegador e nada é inventado: horários livres
 * só aparecem quando vêm da agenda compartilhada (`findSlots`).
 *
 * Ponto de extensão: um provedor de IA real substituirá `simulateReply` no BACKEND, recebendo as
 * mesmas configurações (ver src/modules/messaging/INTEGRATIONS.md).
 */
import type { AiConfig, Specialty } from '@core';
import { now } from '@core';
import type { AiConfigExtras, AiSettings } from './settings';

export type SimulatedIntent =
  | 'saudacao'
  | 'informacoes'
  | 'horario'
  | 'especialidades'
  | 'agendamento'
  | 'disponibilidade'
  | 'reagendamento'
  | 'cancelamento'
  | 'confirmacao'
  | 'status_consulta'
  | 'faq'
  | 'personalizada'
  | 'financeiro'
  | 'clinico'
  | 'humano'
  | 'reclamacao'
  | 'desconhecida';

export const INTENT_LABEL: Record<SimulatedIntent, string> = {
  saudacao: 'Saudação',
  informacoes: 'Informações da clínica',
  horario: 'Horário de funcionamento',
  especialidades: 'Especialidades',
  agendamento: 'Agendar consulta',
  disponibilidade: 'Consultar disponibilidade',
  reagendamento: 'Reagendar consulta',
  cancelamento: 'Cancelar consulta',
  confirmacao: 'Confirmar presença',
  status_consulta: 'Status da consulta',
  faq: 'Dúvida frequente',
  personalizada: 'Resposta personalizada',
  financeiro: 'Assunto financeiro',
  clinico: 'Dúvida clínica / urgência',
  humano: 'Pedido de atendente',
  reclamacao: 'Insatisfação',
  desconhecida: 'Não identificada',
};

export interface SimulationContext {
  /** "Agora" para regra de horário (padrão: relógio da demonstração). */
  at?: Date;
  /** Força o cenário fora do expediente (ambiente de testes). */
  forceOutOfHours?: boolean;
  /** Horários livres da agenda compartilhada, já formatados. Sem função = não oferece horários. */
  findSlots?: (specialty?: Specialty) => string[];
  /** Nomes das especialidades ativas (cadastro da clínica). */
  specialties?: string[];
  /** Próxima consulta do contato vinculado (texto administrativo, sem dado clínico). */
  nextAppointment?: string;
  /** Respostas não compreendidas seguidas antes desta mensagem. */
  previousFailures?: number;
}

export interface SimulationResult {
  intent: SimulatedIntent;
  confidence: number; // 0..1
  reply: string;
  transfer: boolean;
  outOfHours: boolean;
  /** De onde veio a resposta. */
  source: 'faq' | 'personalizada' | 'regra' | 'fallback';
  matchedKeywords: string[];
  faqId?: string;
  customReplyId?: string;
  entities: { label: string; value: string }[];
}

/** Ordem importa: termos mais específicos primeiro ("fisioterapia" antes de "terapia"). */
const SPECIALTY_WORDS: { word: string; label: string; code: Specialty }[] = [
  { word: 'fisio', label: 'Fisioterapia', code: 'fisioterapia' },
  { word: 'dente', label: 'Odontologia', code: 'odontologia' },
  { word: 'dentista', label: 'Odontologia', code: 'odontologia' },
  { word: 'odonto', label: 'Odontologia', code: 'odontologia' },
  { word: 'aparelho', label: 'Odontologia', code: 'odontologia' },
  { word: 'fono', label: 'Fonoaudiologia', code: 'fonoaudiologia' },
  { word: 'estetic', label: 'Estética Avançada', code: 'estetica' },
  { word: 'pele', label: 'Estética Avançada', code: 'estetica' },
  { word: 'psic', label: 'Psicologia', code: 'psicologia' },
  { word: 'terapia', label: 'Psicologia', code: 'psicologia' },
  { word: 'quiro', label: 'Quiropraxia', code: 'quiropraxia' },
  { word: 'coluna', label: 'Quiropraxia', code: 'quiropraxia' },
  { word: 'podo', label: 'Podologia', code: 'podologia' },
  { word: 'unha', label: 'Podologia', code: 'podologia' },
  { word: 'nutri', label: 'Nutrição', code: 'nutricao' },
  { word: 'dieta', label: 'Nutrição', code: 'nutricao' },
];

const DAY_WORDS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'amanha', 'hoje'];

/** Minúsculas e sem acentos: "Horário" → "horario". */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Palavras curtas (≤ 3 letras) exigem palavra inteira para evitar falsos positivos ("oi" em "oito"). */
function has(text: string, word: string): boolean {
  const w = normalize(word);
  if (w.length <= 3) return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text);
  return text.includes(w);
}

function findAny(text: string, words: string[]): string[] {
  return words.filter((w) => has(text, w));
}

function ruleEnabled(config: AiConfig, id: string): boolean {
  return config.transferRules.find((r) => r.id === id)?.enabled ?? false;
}

function capabilityEnabled(config: AiConfig, id: string): boolean {
  return config.capabilities.find((c) => c.id === id)?.enabled ?? false;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** O horário informado está dentro do atendimento humano configurado? */
export function isWithinHours(config: AiConfig, at: Date): boolean {
  const day = config.hours.find((h) => h.weekday === at.getDay());
  if (!day || !day.open) return false;
  const m = at.getHours() * 60 + at.getMinutes();
  return m >= toMin(day.start) && m < toMin(day.end);
}

/** "Segunda-feira a Sexta-feira, das 08:00 às 18:00" — agrupa dias consecutivos com o mesmo horário. */
export function describeHours(config: AiConfig): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.map((w) => config.hours.find((h) => h.weekday === w)).filter((h) => h?.open) as AiConfig['hours'];
  if (!days.length) return 'No momento não há horário de atendimento humano cadastrado.';
  const groups: { from: string; to: string; start: string; end: string; last: number }[] = [];
  for (const d of days) {
    const idx = order.indexOf(d.weekday);
    const g = groups[groups.length - 1];
    if (g && g.start === d.start && g.end === d.end && g.last === idx - 1) {
      g.to = d.label;
      g.last = idx;
    } else groups.push({ from: d.label, to: d.label, start: d.start, end: d.end, last: idx });
  }
  return groups
    .map((g) => `${g.from === g.to ? g.from : `${g.from} a ${g.to}`}, das ${g.start} às ${g.end}`)
    .join('; ');
}

function joinOptions(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join('; ')} ou ${items[items.length - 1]}`;
}

const FALLBACK_BY_TONE: Record<AiConfig['tone'], string> = {
  acolhedor: 'Desculpe, não entendi bem. Você pode me contar se deseja agendar, confirmar uma consulta ou tirar uma dúvida?',
  formal: 'Peço desculpas, não compreendi sua solicitação. O(a) senhor(a) deseja agendar, confirmar uma consulta ou esclarecer uma dúvida?',
  objetivo: 'Não entendi. Deseja agendar, confirmar ou tirar uma dúvida?',
};

/**
 * Responde uma mensagem de paciente com regras locais (simulação). Ordem de prioridade:
 * atendente → clínico → reclamação → financeiro → respostas personalizadas → FAQ → agenda →
 * horário/especialidades/informações → saudação → fallback.
 */
export function simulateReply(
  input: string,
  config: AiConfig | AiSettings,
  ctx: SimulationContext = {},
): SimulationResult {
  const extras = config as AiConfig & Partial<AiConfigExtras>;
  const text = normalize(input);
  const outOfHours = ctx.forceOutOfHours ?? !isWithinHours(config, ctx.at ?? now());
  const entities: SimulationResult['entities'] = [];
  // Início de palavra: "dente" não casa com "atendente", "terapia" não casa com "fisioterapia".
  const spec = SPECIALTY_WORDS.find((s) => new RegExp(`(^|[^a-z])${s.word}`).test(text));
  if (spec) entities.push({ label: 'Especialidade', value: spec.label });
  const day = DAY_WORDS.find((d) => has(text, d));
  if (day) entities.push({ label: 'Data mencionada', value: day });
  const hour = text.match(/\b(\d{1,2})\s?(h|:\d{2})/);
  if (hour) entities.push({ label: 'Horário mencionado', value: hour[0] });

  const base = { outOfHours, entities, matchedKeywords: [] as string[] };
  const answer = (intent: SimulatedIntent, reply: string, matched: string[], confidence: number, source: SimulationResult['source'] = 'regra'): SimulationResult => ({
    ...base,
    intent,
    reply,
    matchedKeywords: matched,
    confidence,
    transfer: false,
    source,
  });
  const transferTo = (intent: SimulatedIntent, matched: string[], confidence: number, prefix = ''): SimulationResult => ({
    ...answer(intent, `${prefix}${config.transferMessage}${outOfHours ? `\n\n${config.outOfHoursMessage}` : ''}`, matched, confidence),
    transfer: true,
  });

  // 1. Pedido explícito de atendimento humano
  const human = findAny(text, ['atendente', 'humano', 'pessoa', 'recepcao', 'recepcionista', 'falar com alguem']);
  if (human.length && ruleEnabled(config, 'pedido')) return transferTo('humano', human, 0.96);

  // 2. Clínico / urgência — limite fixo: nunca orienta, com ou sem regra de transferência
  const clinical = findAny(text, ['dor', 'dores', 'doendo', 'sangr', 'urgen', 'febre', 'inchad', 'remedio', 'sintoma', 'diagnostico', 'exame']);
  if (clinical.length) {
    const prefix = 'Sinto muito que você esteja passando por isso. Não posso dar orientações clínicas por aqui. ';
    const emergency = ' Em caso de emergência, procure o pronto atendimento mais próximo.';
    if (ruleEnabled(config, 'clinico')) {
      const r = transferTo('clinico', clinical, 0.9, prefix);
      return { ...r, reply: `${r.reply}${emergency}` };
    }
    return answer('clinico', `${prefix}Nossa equipe pode orientar você presencialmente.${emergency}`, clinical, 0.9);
  }

  // 3. Reclamação
  const complaint = findAny(text, ['reclama', 'pessim', 'absurdo', 'insatisfeit', 'demora']);
  if (complaint.length && ruleEnabled(config, 'insatisfacao')) {
    return transferTo('reclamacao', complaint, 0.82, 'Lamentamos muito pela experiência. ');
  }

  // 4. Financeiro
  const finance = findAny(text, ['valor', 'preco', 'quanto custa', 'parcel', 'reembolso', 'boleto', 'cobranc']);
  if (finance.length && ruleEnabled(config, 'financeiro')) return transferTo('financeiro', finance, 0.88);

  // 5. Respostas personalizadas
  for (const cr of extras.customReplies ?? []) {
    if (!cr.enabled) continue;
    const matched = cr.keywords.filter((k) => has(text, k));
    if (matched.length) {
      return { ...answer('personalizada', cr.answer, matched, Math.min(0.97, 0.75 + matched.length * 0.1), 'personalizada'), customReplyId: cr.id };
    }
  }

  // 6. FAQ
  if (capabilityEnabled(config, 'faq')) {
    for (const faq of config.faqs) {
      if (!faq.enabled) continue;
      const matched = faq.keywords.filter((k) => has(text, k));
      if (matched.length) {
        return { ...answer('faq', faq.answer, matched, Math.min(0.97, 0.7 + matched.length * 0.1), 'faq'), faqId: faq.id };
      }
    }
  }

  // 7. Agenda
  const slotsText = () => {
    const slots = ctx.findSlots?.(spec?.code) ?? [];
    return slots.length
      ? `Encontrei estes horários livres na agenda${spec ? ` de ${spec.label}` : ''}: ${joinOptions(slots)}. Qual prefere? A reserva é confirmada pela nossa equipe.`
      : 'Vou verificar os horários disponíveis com a nossa equipe e retorno em instantes.';
  };

  const cancel = findAny(text, ['cancelar', 'desmarcar']);
  if (cancel.length) {
    return capabilityEnabled(config, 'reagendar')
      ? answer('cancelamento', 'Posso registrar o pedido de cancelamento. Para confirmar, me informe o nome completo do paciente e a data da consulta — nossa equipe conclui o cancelamento.', cancel, 0.9)
      : transferTo('cancelamento', cancel, 0.9);
  }
  const resched = findAny(text, ['reagendar', 'remarcar', 'trocar o horario', 'mudar o horario']);
  if (resched.length) {
    return capabilityEnabled(config, 'reagendar') ? answer('reagendamento', `Claro! ${slotsText()}`, resched, 0.91) : transferTo('reagendamento', resched, 0.91);
  }
  const confirm = findAny(text, ['confirmo', 'confirmar', 'confirmado', 'estarei']);
  if (confirm.length || text.trim() === '1') {
    return capabilityEnabled(config, 'confirmar')
      ? answer('confirmacao', 'Obrigado! Registrei sua confirmação para a nossa equipe. Até breve!', confirm.length ? confirm : ['1'], 0.93)
      : transferTo('confirmacao', confirm, 0.9);
  }
  const status = findAny(text, ['minha consulta', 'quando e', 'status', 'esta marcada', 'ta marcada']);
  if (status.length) {
    return answer(
      'status_consulta',
      ctx.nextAppointment
        ? `Sua próxima consulta registrada é: ${ctx.nextAppointment}. Posso ajudar com mais alguma coisa?`
        : 'Não encontrei uma consulta futura vinculada a este contato. Quer que eu verifique horários para agendar?',
      status,
      0.86,
    );
  }
  const availability = findAny(text, ['disponivel', 'disponibilidade', 'horarios livres', 'tem horario', 'tem vaga']);
  if (availability.length) {
    return capabilityEnabled(config, 'agendar') ? answer('disponibilidade', slotsText(), availability, 0.88) : transferTo('disponibilidade', availability, 0.85);
  }
  const schedule = findAny(text, ['marcar', 'agendar', 'agendamento', 'consulta', 'vaga']);
  if (schedule.length) {
    if (!capabilityEnabled(config, 'agendar')) return transferTo('agendamento', schedule, 0.88);
    const reply = spec
      ? `Será um prazer agendar sua consulta de ${spec.label}. ${slotsText()}`
      : `Será um prazer agendar sua consulta. Qual especialidade você procura?${ctx.specialties?.length ? ` Atendemos ${joinOptions(ctx.specialties)}.` : ''}`;
    return answer('agendamento', reply, schedule, spec ? 0.94 : 0.84);
  }

  // 8. Horário, especialidades e informações gerais
  const hoursQ = findAny(text, ['funcionamento', 'que horas', 'abre', 'abrem', 'fecha', 'fecham', 'expediente', 'horario de atendimento']);
  if (hoursQ.length) {
    const reply = `Nosso atendimento humano funciona: ${describeHours(config)}.${outOfHours ? `\n\n${config.outOfHoursMessage}` : ''}`;
    return answer('horario', reply, hoursQ, 0.9);
  }
  const specQ = findAny(text, ['especialidade', 'especialidades', 'atendem', 'tratamento']);
  if (specQ.length && ctx.specialties?.length) {
    return answer('especialidades', `Atendemos ${joinOptions(ctx.specialties)}. Posso ajudar a agendar alguma delas?`, specQ, 0.86);
  }
  const infoQ = findAny(text, ['informac', 'sobre a clinica', 'clinica']);
  if (infoQ.length) {
    const desc = extras.description?.trim();
    return answer('informacoes', `${desc ? `${desc} ` : ''}Posso ajudar com agendamentos, confirmações, horários e dúvidas frequentes.`, infoQ, 0.78);
  }

  // 9. Saudação
  const greet = findAny(text, ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite']);
  if (greet.length) {
    const reply = `${config.greeting}${config.useEmojis ? ' 🙂' : ''}${outOfHours ? `\n\n${config.outOfHoursMessage}` : ''}`;
    return answer('saudacao', reply, greet, 0.95);
  }

  // 10. Fallback
  if (ruleEnabled(config, 'falhas') && (ctx.previousFailures ?? 0) >= 1) {
    return { ...transferTo('desconhecida', [], 0.32, 'Desculpe, não consegui entender. '), source: 'fallback' };
  }
  return answer('desconhecida', FALLBACK_BY_TONE[config.tone], [], 0.32, 'fallback');
}
