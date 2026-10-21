/**
 * Agente 07 — Central WhatsApp (simulada). Cobre envio/recebimento, IA × humano, status,
 * etiquetas, vínculo com paciente, agenda e negação de permissão.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  db,
  messagingService,
  resetDemoData,
  selectConversations,
  selectMessages,
  toAccessContext,
  type AccessContext,
} from '@core';
import * as svc from '@modules/messaging/service';
import { computeStats, isSystemMessage, statusOf } from '@modules/messaging/model';
import { findAvailableSlots } from '@modules/messaging/availability';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente`);
  return toAccessContext(u);
};
const conv = (id: string) => {
  const c = db.getState().conversations.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};
const thread = (ctx: AccessContext, id: string) => selectMessages(db.getState(), ctx, id);

let recepcao: AccessContext;
let admin: AccessContext;
let financeiro: AccessContext;
let profissional: AccessContext;

beforeEach(() => {
  resetDemoData();
  recepcao = ctxOf('u-recepcao');
  admin = ctxOf('u-admin');
  financeiro = ctxOf('u-financeiro');
  profissional = ctxOf('u-prof-lauren');
});

describe('listagem e leitura', () => {
  it('recepção lista as conversas ordenadas pela última mensagem', () => {
    const list = selectConversations(db.getState(), recepcao);
    expect(list.length).toBeGreaterThan(0);
    const times = list.map((c) => c.lastAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('financeiro e profissional não veem conversas (sem permissão whatsapp)', () => {
    expect(selectConversations(db.getState(), financeiro)).toEqual([]);
    expect(selectConversations(db.getState(), profissional)).toEqual([]);
    expect(thread(financeiro, 'cv-01')).toEqual([]);
  });

  it('marcar como lida zera o contador', () => {
    expect(conv('cv-01').unread).toBeGreaterThan(0);
    svc.markRead(recepcao, 'cv-01');
    expect(conv('cv-01').unread).toBe(0);
  });
});

describe('envio e recebimento simulados', () => {
  it('envio exige modo humano e atualiza histórico, prévia e ordenação', () => {
    expect(() => svc.sendMessage(recepcao, 'cv-01', 'Olá!')).toThrowError(/Assuma o atendimento/);
    svc.setMode(recepcao, 'cv-05', 'humano');
    const msg = svc.sendMessage(recepcao, 'cv-05', '  Bom dia, Sofia!  ');
    expect(msg.text).toBe('Bom dia, Sofia!');
    expect(msg.from).toBe('atendente');
    const c = conv('cv-05');
    expect(c.lastMessage).toBe('Bom dia, Sofia!');
    expect(selectConversations(db.getState(), recepcao)[0].id).toBe('cv-05');
    const t = thread(recepcao, 'cv-05');
    expect(t[t.length - 1].id).toBe(msg.id);
  });

  it('mensagem vazia é recusada com erro de validação', () => {
    svc.setMode(recepcao, 'cv-02', 'humano');
    expect(() => svc.sendMessage(recepcao, 'cv-02', '   ')).toThrowError();
  });

  it('o histórico persiste no banco compartilhado (sobrevive à releitura)', () => {
    svc.setMode(recepcao, 'cv-02', 'humano');
    const msg = svc.sendMessage(recepcao, 'cv-02', 'Pode trazer a carteirinha.');
    const persisted = JSON.parse(JSON.stringify(db.getState())) as ReturnType<typeof db.getState>;
    expect(persisted.messages.some((m) => m.id === msg.id)).toBe(true);
  });

  it('recebimento simulado incrementa não lidas e reabre conversa finalizada', () => {
    svc.setStatus(recepcao, 'cv-09', 'encerrada');
    const before = conv('cv-09').unread;
    svc.receiveSimulatedMessage(recepcao, 'cv-09', 'Oi, voltei!');
    expect(conv('cv-09').unread).toBe(before + 1);
    expect(statusOf(conv('cv-09'))).toBe('aberta');
    expect(conv('cv-09').lastMessage).toBe('Oi, voltei!');
  });

  it('status de entrega só avança', () => {
    svc.setMode(recepcao, 'cv-02', 'humano');
    const msg = svc.sendMessage(recepcao, 'cv-02', 'Teste');
    svc.advanceDelivery(recepcao, msg.id, 'lida');
    svc.advanceDelivery(recepcao, msg.id, 'entregue');
    expect(db.getState().messages.find((m) => m.id === msg.id)?.status).toBe('lida');
  });
});

describe('IA simulada × atendimento humano', () => {
  it('IA responde a pergunta frequente quando a conversa está em modo IA', () => {
    svc.receiveSimulatedMessage(recepcao, 'cv-05', 'Qual o endereço de vocês?');
    const out = svc.replyWithSimulatedAi(recepcao, 'cv-05');
    expect(out.status).toBe('respondida');
    if (out.status === 'respondida') {
      expect(out.result.intent).toBe('faq');
      expect(out.message.from).toBe('ia');
    }
  });

  it('não envia resposta automática depois que um humano assumiu', () => {
    svc.receiveSimulatedMessage(recepcao, 'cv-05', 'Quero marcar uma consulta');
    svc.setMode(recepcao, 'cv-05', 'humano'); // assumiu durante o "digitando…"
    const before = db.getState().messages.length;
    expect(svc.replyWithSimulatedAi(recepcao, 'cv-05').status).toBe('bloqueada_humano');
    expect(db.getState().messages.length).toBe(before);
  });

  it('IA desativada não responde e não pode ser reativada na conversa', () => {
    messagingService.updateAiConfig(admin, { enabled: false });
    svc.receiveSimulatedMessage(recepcao, 'cv-05', 'Oi');
    expect(svc.replyWithSimulatedAi(recepcao, 'cv-05').status).toBe('ia_desativada');
    expect(() => svc.setMode(recepcao, 'cv-02', 'ia')).toThrowError(/desativado/);
  });

  it('pedido de atendente transfere para humano e registra mensagem de sistema', () => {
    svc.receiveSimulatedMessage(recepcao, 'cv-05', 'Preciso falar com uma atendente');
    const out = svc.replyWithSimulatedAi(recepcao, 'cv-05');
    expect(out.status).toBe('respondida');
    const c = conv('cv-05');
    expect(c.mode).toBe('humano');
    expect(c.assignedTo).toBe('Recepção');
    expect(c.tags).toContain('Atendimento humano');
    expect(thread(recepcao, 'cv-05').some(isSystemMessage)).toBe(true);
  });

  it('ativar e desativar IA por conversa', () => {
    svc.setMode(recepcao, 'cv-02', 'ia');
    expect(conv('cv-02').mode).toBe('ia');
    expect(conv('cv-02').assignedTo).toBeUndefined();
    svc.setMode(recepcao, 'cv-02', 'humano');
    expect(conv('cv-02').mode).toBe('humano');
    expect(conv('cv-02').assignedTo).toBe('Juliana P.');
    expect(conv('cv-01').mode).toBe('ia'); // outras conversas não mudam
  });

  it('transferência para colaborador fica registrada', () => {
    svc.transferConversation(recepcao, 'cv-01', 'Camila S.');
    const c = conv('cv-01');
    expect(c.mode).toBe('humano');
    expect(c.assignedTo).toBe('Camila S.');
    const t = thread(recepcao, 'cv-01');
    expect(t[t.length - 1].text).toMatch(/transferiu o atendimento para Camila S\./);
  });
});

describe('gestão da conversa', () => {
  it('encerrar, reabrir e marcar pendente', () => {
    svc.setStatus(recepcao, 'cv-01', 'pendente');
    expect(statusOf(conv('cv-01'))).toBe('pendente');
    svc.setStatus(recepcao, 'cv-01', 'encerrada');
    expect(statusOf(conv('cv-01'))).toBe('encerrada');
    expect(() => svc.transferConversation(recepcao, 'cv-01', 'Recepção')).toThrowError(/Reabra/);
    svc.setStatus(recepcao, 'cv-01', 'aberta');
    expect(statusOf(conv('cv-01'))).toBe('aberta');
  });

  it('etiquetas: adiciona sem duplicar e remove', () => {
    svc.addTag(recepcao, 'cv-05', 'Retorno');
    svc.addTag(recepcao, 'cv-05', 'retorno');
    expect(conv('cv-05').tags.filter((t) => t.toLowerCase() === 'retorno')).toHaveLength(1);
    svc.removeTag(recepcao, 'cv-05', 'Retorno');
    expect(conv('cv-05').tags).not.toContain('Retorno');
  });

  it('indicadores refletem os dados', () => {
    const before = computeStats(db.getState().conversations);
    svc.setStatus(recepcao, 'cv-01', 'encerrada');
    const after = computeStats(db.getState().conversations);
    expect(after.closed).toBe(before.closed + 1);
    expect(after.open).toBe(before.open - 1);
  });

  it('vincula contato novo a paciente existente sem duplicar cadastro', () => {
    const patients = db.getState().patients.length;
    const pid = db.getState().patients[0].id;
    svc.linkPatient(recepcao, 'cv-06', pid);
    expect(conv('cv-06').patientId).toBe(pid);
    expect(db.getState().patients.length).toBe(patients);
  });

  it('não há IDs de conversa duplicados após operações', () => {
    svc.addTag(recepcao, 'cv-01', 'Retorno');
    svc.setMode(recepcao, 'cv-01', 'humano');
    const ids = db.getState().conversations.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('integração com a agenda', () => {
  it('oferece apenas horários livres segundo a agenda compartilhada', () => {
    const slots = findAvailableSlots(db.getState().professionals, { specialty: 'odontologia', limit: 3 });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.specialty).toBe('odontologia');
      expect(s.start > '2026-10-19T10:24:00').toBe(true);
    }
  });

  it('agenda pela central via appointmentService com canal whatsapp', () => {
    const [slot] = findAvailableSlots(db.getState().professionals, { limit: 1 });
    const appt = svc.scheduleFromConversation(recepcao, 'cv-01', {
      professionalId: slot.professionalId,
      start: slot.start,
      durationMin: 50,
      service: 'Consulta',
    });
    expect(appt.channel).toBe('whatsapp');
    expect(appt.patientId).toBe(conv('cv-01').patientId);
    expect(db.getState().appointments.some((a) => a.id === appt.id)).toBe(true);
    // o mesmo horário agora conflita
    expect(() =>
      svc.scheduleFromConversation(recepcao, 'cv-01', { professionalId: slot.professionalId, start: slot.start, durationMin: 50, service: 'Consulta' }),
    ).toThrowError();
  });

  it('contato sem cadastro não pode ser agendado', () => {
    const [slot] = findAvailableSlots(db.getState().professionals, { limit: 1 });
    expect(() =>
      svc.scheduleFromConversation(recepcao, 'cv-06', { professionalId: slot.professionalId, start: slot.start, durationMin: 50, service: 'Consulta' }),
    ).toThrowError();
  });
});

describe('permissões (espelho do 403)', () => {
  it('financeiro e profissional não enviam, não assumem e não etiquetam', () => {
    for (const ctx of [financeiro, profissional]) {
      expect(() => svc.sendMessage(ctx, 'cv-02', 'x')).toThrowError(/perfil de acesso/);
      expect(() => svc.setMode(ctx, 'cv-01', 'humano')).toThrowError(/perfil de acesso/);
      expect(() => svc.addTag(ctx, 'cv-01', 'Retorno')).toThrowError(/perfil de acesso/);
      expect(() => svc.receiveSimulatedMessage(ctx, 'cv-01', 'oi')).toThrowError(/perfil de acesso/);
      expect(() => svc.replyWithSimulatedAi(ctx, 'cv-01')).toThrowError(/perfil de acesso/);
    }
  });

  it('recepção não altera a configuração da IA (somente leitura)', () => {
    expect(() => messagingService.updateAiConfig(recepcao, { name: 'X' })).toThrowError(/perfil de acesso/);
  });

  it('ajuste de matriz que remove whatsapp da recepção bloqueia o serviço', () => {
    db.setState((s) => ({
      ...s,
      clinicSettings: { ...s.clinicSettings, permissionOverrides: { recepcao: { whatsapp: 'ver' } } },
    }));
    expect(() => svc.addTag(recepcao, 'cv-01', 'Retorno')).toThrowError(/perfil de acesso/);
    expect(selectConversations(db.getState(), recepcao).length).toBeGreaterThan(0);
  });
});

describe('privacidade', () => {
  it('respostas simuladas não expõem prontuário', () => {
    const summaries = db.getState().clinicalRecords.map((r) => r.summary);
    for (const text of ['Estou com muita dor no dente', 'Qual meu diagnóstico?', 'Quero saber do meu exame']) {
      svc.receiveSimulatedMessage(recepcao, 'cv-03', text);
      if (conv('cv-03').mode !== 'ia') svc.setMode(recepcao, 'cv-03', 'ia');
      const out = svc.replyWithSimulatedAi(recepcao, 'cv-03');
      if (out.status === 'respondida') {
        for (const s of summaries) expect(out.message.text).not.toContain(s);
        expect(out.result.intent).toBe('clinico');
      }
      svc.setMode(recepcao, 'cv-03', 'ia');
    }
  });
});
