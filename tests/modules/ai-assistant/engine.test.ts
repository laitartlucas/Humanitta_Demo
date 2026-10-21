/** Agente 07 — motor de respostas simuladas e persistência das configurações do assistente. */
import { beforeEach, describe, expect, it } from 'vitest';
import { db, messagingService, resetDemoData, toAccessContext, type AccessContext } from '@core';
import { describeHours, isWithinHours, simulateReply } from '@modules/ai-assistant/engine';
import { defaultAiSettings, withExtras, type AiSettings } from '@modules/ai-assistant/settings';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(userId);
  return toAccessContext(u);
};

let config: AiSettings;
const MONDAY_10H = new Date(2026, 9, 19, 10, 0);
const MONDAY_21H = new Date(2026, 9, 19, 21, 0);

beforeEach(() => {
  resetDemoData();
  config = defaultAiSettings();
});

describe('intenções', () => {
  it('saudação usa a mensagem inicial configurada', () => {
    const r = simulateReply('Oi, bom dia!', config, { at: MONDAY_10H });
    expect(r.intent).toBe('saudacao');
    expect(r.reply).toContain(config.greeting);
    expect(r.outOfHours).toBe(false);
  });

  it('"oi" não é detectado dentro de outra palavra', () => {
    expect(simulateReply('oito', config, { at: MONDAY_10H }).intent).toBe('desconhecida');
  });

  it('pergunta frequente responde com a FAQ cadastrada', () => {
    const r = simulateReply('Qual o endereço?', config, { at: MONDAY_10H });
    expect(r.intent).toBe('faq');
    expect(r.faqId).toBe('faq-1');
    expect(r.source).toBe('faq');
  });

  it('FAQ desativada não é usada', () => {
    config.faqs = config.faqs.map((f) => (f.id === 'faq-1' ? { ...f, enabled: false } : f));
    expect(simulateReply('Qual o endereço?', config, { at: MONDAY_10H }).faqId).not.toBe('faq-1');
  });

  it('resposta personalizada tem prioridade e é editável', () => {
    config.customReplies = [{ id: 'cr-x', label: 'Wi-fi', keywords: ['wifi'], answer: 'Senha na recepção.', enabled: true }];
    const r = simulateReply('Tem wifi?', config, { at: MONDAY_10H });
    expect(r.intent).toBe('personalizada');
    expect(r.reply).toBe('Senha na recepção.');
  });

  it('pedido de atendente transfere', () => {
    const r = simulateReply('Quero falar com uma atendente', config, { at: MONDAY_10H });
    expect(r.intent).toBe('humano');
    expect(r.transfer).toBe(true);
    expect(r.reply).toContain(config.transferMessage);
  });

  it('fora do horário avisa o expediente', () => {
    const r = simulateReply('Preciso falar com a recepção', config, { at: MONDAY_21H });
    expect(r.outOfHours).toBe(true);
    expect(r.reply).toContain(config.outOfHoursMessage);
    expect(simulateReply('Oi', config, { forceOutOfHours: true }).reply).toContain(config.outOfHoursMessage);
  });

  it('agendamento só oferece horários vindos da agenda', () => {
    const none = simulateReply('Quero marcar fisioterapia', config, { at: MONDAY_10H });
    expect(none.intent).toBe('agendamento');
    expect(none.reply).toMatch(/verificar os horários/);
    const withSlots = simulateReply('Quero marcar fisioterapia', config, {
      at: MONDAY_10H,
      findSlots: (s) => (s === 'fisioterapia' ? ['ter, 20/10 · 09h00 · Dr. X'] : []),
    });
    expect(withSlots.reply).toContain('ter, 20/10 · 09h00 · Dr. X');
  });

  it('"atendente" não é confundido com odontologia', () => {
    const r = simulateReply('Preciso falar com uma atendente', config, { at: MONDAY_10H });
    expect(r.entities.find((e) => e.label === 'Especialidade')).toBeUndefined();
  });

  it('capacidade de agendar desligada transfere em vez de responder', () => {
    config.capabilities = config.capabilities.map((c) => (c.id === 'agendar' ? { ...c, enabled: false } : c));
    expect(simulateReply('Quero agendar uma consulta', config, { at: MONDAY_10H }).transfer).toBe(true);
  });

  it('dúvidas clínicas nunca recebem orientação — mesmo sem regra de transferência', () => {
    config.transferRules = config.transferRules.map((r) => (r.id === 'clinico' ? { ...r, enabled: false } : r));
    const r = simulateReply('Estou com dor, qual remédio tomo?', config, { at: MONDAY_10H });
    expect(r.intent).toBe('clinico');
    expect(r.reply).toMatch(/Não posso dar orientações clínicas/);
  });

  it('fallback por tom de voz e transferência após falhas', () => {
    expect(simulateReply('xyz', config, { at: MONDAY_10H }).source).toBe('fallback');
    config.tone = 'formal';
    expect(simulateReply('xyz', config, { at: MONDAY_10H }).reply).toMatch(/senhor/);
    config.transferRules = config.transferRules.map((r) => (r.id === 'falhas' ? { ...r, enabled: true } : r));
    expect(simulateReply('xyz', config, { at: MONDAY_10H, previousFailures: 1 }).transfer).toBe(true);
  });

  it('cancelamento, status e horário de funcionamento', () => {
    expect(simulateReply('Quero cancelar minha consulta', config, { at: MONDAY_10H }).intent).toBe('cancelamento');
    expect(simulateReply('Quando é minha consulta?', config, { at: MONDAY_10H, nextAppointment: 'qui, 22/10' }).reply).toContain('qui, 22/10');
    const h = simulateReply('Que horas vocês abrem?', config, { at: MONDAY_10H });
    expect(h.intent).toBe('horario');
    expect(h.reply).toContain('Segunda-feira a Sexta-feira, das 08:00 às 18:00');
  });
});

describe('horários', () => {
  it('isWithinHours e describeHours seguem a configuração', () => {
    expect(isWithinHours(config, MONDAY_10H)).toBe(true);
    expect(isWithinHours(config, MONDAY_21H)).toBe(false);
    config.hours = config.hours.map((h) => ({ ...h, open: false }));
    expect(describeHours(config)).toMatch(/não há horário/);
  });
});

describe('configurações persistidas', () => {
  it('admin salva campos humanizados no documento compartilhado aiConfig', () => {
    const admin = ctxOf('u-admin');
    const next: AiSettings = { ...withExtras(db.getState().aiConfig), name: 'Assistente Teste', personality: 'Muito acolhedora' };
    messagingService.updateAiConfig(admin, next);
    const saved = withExtras(db.getState().aiConfig);
    expect(saved.name).toBe('Assistente Teste');
    expect(saved.personality).toBe('Muito acolhedora');
  });

  it('restaurar padrão volta à configuração fictícia de fábrica', () => {
    const admin = ctxOf('u-admin');
    messagingService.updateAiConfig(admin, { name: 'Outro' });
    messagingService.updateAiConfig(admin, defaultAiSettings());
    expect(db.getState().aiConfig.name).toBe(defaultAiSettings().name);
  });

  it('perfis sem assistente_ia ≥ editar não salvam', () => {
    for (const id of ['u-recepcao', 'u-financeiro', 'u-prof-lauren']) {
      expect(() => messagingService.updateAiConfig(ctxOf(id), { enabled: false })).toThrowError(/perfil de acesso/);
    }
  });
});
