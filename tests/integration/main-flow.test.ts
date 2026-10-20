/**
 * Agente 09 — testes de INTEGRAÇÃO entre os oito módulos (mesmos serviços usados pelas telas).
 * Cobre o fluxo principal de ponta a ponta e as regras transversais: relacionamentos, permissões,
 * conflitos, transições inválidas, pagamento duplicado, isolamento, relatórios e mensagens simuladas.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AppError,
  appointmentService,
  attendanceService,
  db,
  financeService,
  messagingService,
  patientService,
  resetDemoData,
  selectAppointments,
  selectClinicalRecords,
  selectFinanceTotals,
  selectMyPatients,
  toAccessContext,
  type AccessContext,
} from '@core';
import { buildReport } from '@ds/screens/reports/model';
import * as messaging from '@modules/messaging/service';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente`);
  return toAccessContext(u);
};
const recepcao = () => ctxOf('u-recepcao');
const admin = () => ctxOf('u-admin');
const financeiro = () => ctxOf('u-financeiro');
const lauren = () => ctxOf('u-prof-lauren');
const helena = () => ctxOf('u-prof-helena');

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    return e instanceof AppError ? e.code : 'UNKNOWN';
  }
}

const OCT = { from: '2026-10-01', to: '2026-10-31' };

beforeEach(() => resetDemoData());

describe('fluxo principal (cadastro → agenda → portal → financeiro → relatórios)', () => {
  it('percorre os 8 módulos com dados compartilhados e escopo correto', () => {
    const reportBefore = buildReport(db.getState(), admin(), { range: OCT });
    const totalsBefore = selectFinanceTotals(db.getState(), financeiro(), '2026-10');

    // Pacientes (03): cadastro e edição
    const p = patientService.createPatient(recepcao(), {
      name: 'Paciente Integração E2E', birthDate: '1990-05-12', phone: '(54) 99100-0998', city: 'Ronda Alta',
    });
    const edited = patientService.updatePatient(recepcao(), p.id, { name: 'Paciente Integração E2E (editado)' });
    expect(edited.name).toContain('editado');

    // Agenda (02): conflito e criação
    expect(codeOf(() => appointmentService.createAppointment(recepcao(), {
      patientId: p.id, professionalId: 'prof-lauren', service: 'Avaliação odontológica', start: '2026-10-19T14:00:00', durationMin: 40,
    }))).toBe('CONFLICT');
    const appt = appointmentService.createAppointment(recepcao(), {
      patientId: p.id, professionalId: 'prof-lauren', service: 'Avaliação odontológica', start: '2026-10-19T17:10:00', durationMin: 40, price: 220,
    });
    expect(appt.patientName).toBe(edited.name);
    appointmentService.confirmAppointment(recepcao(), appt.id);
    attendanceService.checkIn(recepcao(), appt.id);

    // Portal (04): a Dra. Lauren vê a consulta e o paciente; a Dra. Helena não.
    expect(selectAppointments(db.getState(), lauren()).some((a) => a.id === appt.id)).toBe(true);
    expect(selectAppointments(db.getState(), helena()).some((a) => a.id === appt.id)).toBe(false);
    expect(selectMyPatients(db.getState(), lauren()).some((x) => x.id === p.id)).toBe(true);
    expect(selectMyPatients(db.getState(), helena()).some((x) => x.id === p.id)).toBe(false);

    // Atendimentos (05): só o profissional responsável inicia; um em andamento por vez.
    expect(codeOf(() => attendanceService.startAttendance(helena(), appt.id))).toBe('FORBIDDEN');
    expect(codeOf(() => attendanceService.startAttendance(lauren(), appt.id))).toBe('CONFLICT'); // pl-101 em andamento
    attendanceService.finishAttendance(lauren(), 'pl-101');
    attendanceService.startAttendance(lauren(), appt.id);
    attendanceService.finishAttendance(lauren(), appt.id, 'Registro fictício de integração.');
    expect(db.getState().appointments.find((a) => a.id === appt.id)?.status).toBe('concluida');
    expect(selectClinicalRecords(db.getState(), lauren(), p.id)).toHaveLength(1);
    expect(selectClinicalRecords(db.getState(), helena(), p.id)).toHaveLength(0);
    expect(selectClinicalRecords(db.getState(), admin(), p.id)).toHaveLength(0);

    // Financeiro (06): receita vinculada, sem duplicidade.
    const entry = financeService.createEntry(financeiro(), {
      type: 'receita', description: 'Avaliação odontológica', category: 'Consulta', amount: 220, date: '2026-10-19',
      method: 'pix', status: 'pago', patientId: p.id, professionalId: 'prof-lauren', appointmentId: appt.id,
    });
    expect(entry.patientName).toBe(edited.name);
    expect(codeOf(() => financeService.createEntry(financeiro(), {
      type: 'receita', description: 'Duplicada', category: 'Consulta', amount: 220, date: '2026-10-19',
      method: 'pix', status: 'pago', appointmentId: appt.id,
    }))).toBe('CONFLICT');
    expect(codeOf(() => financeService.registerPayment(financeiro(), entry.id, 'pix'))).toBe('CONFLICT');
    const totalsAfter = selectFinanceTotals(db.getState(), financeiro(), '2026-10');
    expect(totalsAfter.revenue - totalsBefore.revenue).toBeCloseTo(220, 2);

    // Relatórios (08) e Dashboard (01) refletem as mudanças.
    const reportAfter = buildReport(db.getState(), admin(), { range: OCT });
    expect(reportAfter.appointments.total).toBe(reportBefore.appointments.total + 1);
    expect(reportAfter.appointments.done).toBe(reportBefore.appointments.done + 2); // pl-101 + nova
    expect(reportAfter.finance?.revenue).toBeCloseTo((reportBefore.finance?.revenue ?? 0) + 220, 2);
    expect(reportAfter.patients?.total).toBe((reportBefore.patients?.total ?? 0) + 1);
  });
});

describe('regras transversais', () => {
  it('telefone duplicado é recusado no cadastro', () => {
    const existing = db.getState().patients[0];
    expect(codeOf(() => patientService.createPatient(recepcao(), {
      name: 'Outro Nome', birthDate: '1990-01-01', phone: existing.phone, city: 'Ronda Alta',
    }))).toBe('CONFLICT');
  });

  it('transições inválidas de atendimento são bloqueadas no core', () => {
    expect(codeOf(() => attendanceService.startAttendance(lauren(), 'ag-101'))).toBe('CONFLICT'); // concluída
    expect(codeOf(() => attendanceService.checkIn(recepcao(), 'ag-109'))).toBe('CONFLICT'); // cancelada
    expect(codeOf(() => attendanceService.checkIn(recepcao(), 'ag-201'))).toBe('CONFLICT'); // amanhã
    expect(codeOf(() => attendanceService.markNoShow(recepcao(), 'ag-106'))).toBe('CONFLICT'); // ainda não chegou a hora
    attendanceService.checkIn(recepcao(), 'pl-102');
    expect(codeOf(() => attendanceService.checkIn(recepcao(), 'pl-102'))).toBe('CONFLICT'); // segundo check-in
  });

  it('cancelar a consulta cancela o atendimento vinculado', () => {
    attendanceService.checkIn(recepcao(), 'pl-102');
    appointmentService.cancelAppointment(recepcao(), 'pl-102', 'Paciente pediu para remarcar.');
    expect(db.getState().attendances.find((a) => a.appointmentId === 'pl-102')?.status).toBe('cancelado');
  });

  it('só o registro novo de um reagendamento pode ser confirmado', () => {
    expect(codeOf(() => appointmentService.confirmAppointment(recepcao(), 'ag-004'))).toBe('CONFLICT');
    const novo = db.getState().appointments.find((a) => a.id === 'ag-404');
    expect(novo?.rescheduledFrom).toBe('ag-004');
    expect(appointmentService.confirmAppointment(recepcao(), 'ag-404').status).toBe('confirmada');
  });

  it('perfis sem permissão recebem 403', () => {
    const input = { patientId: 'pac-01', professionalId: 'prof-helena', service: 'Terapia fonoaudiológica', start: '2026-10-26T08:00:00', durationMin: 45 };
    expect(codeOf(() => appointmentService.createAppointment(financeiro(), input))).toBe('FORBIDDEN');
    expect(codeOf(() => appointmentService.createAppointment(lauren(), input))).toBe('FORBIDDEN');
    expect(codeOf(() => financeService.registerPayment(recepcao(), 'fe-003', 'pix'))).toBe('FORBIDDEN');
    expect(codeOf(() => messagingService.sendMessage(financeiro(), 'cv-01', 'oi'))).toBe('FORBIDDEN');
    expect(codeOf(() => patientService.createPatient(lauren(), { name: 'X', birthDate: '1990-01-01', phone: '(54) 99999-1111', city: 'Ronda Alta' }))).toBe('FORBIDDEN');
  });
});

describe('WhatsApp e Assistente IA (simulados)', () => {
  it('mensagens novas ficam depois das existentes e sobem a conversa', () => {
    const last = db.getState().messages.filter((m) => m.conversationId === 'cv-02').map((m) => m.at).sort().pop() ?? '';
    const msg = messaging.sendMessage(recepcao(), 'cv-02', 'Olá! Confirmamos segunda à tarde.');
    expect(msg.at > last).toBe(true);
    expect(db.getState().conversations.find((c) => c.id === 'cv-02')?.lastMessage).toContain('Confirmamos');
  });

  it('depois da transferência para humano a IA não responde mais', () => {
    messaging.receiveSimulatedMessage(recepcao(), 'cv-03', 'Qual o endereço da clínica?');
    messaging.transferConversation(recepcao(), 'cv-03', 'Recepção');
    expect(messaging.replyWithSimulatedAi(recepcao(), 'cv-03').status).toBe('bloqueada_humano');
    // Mesmo chamando o core direto, a resposta automática é recusada.
    expect(codeOf(() => messagingService.appendAiMessage('cv-03', 'resposta automática'))).toBe('CONFLICT');
  });

  it('IA simulada responde a pergunta frequente sem envio externo', () => {
    messaging.receiveSimulatedMessage(recepcao(), 'cv-05', 'Qual o endereço da clínica?');
    const out = messaging.replyWithSimulatedAi(recepcao(), 'cv-05');
    expect(out.status).toBe('respondida');
    const reply = db.getState().messages.filter((m) => m.conversationId === 'cv-05' && m.from === 'ia').pop();
    expect(reply?.text.length).toBeGreaterThan(0);
  });
});

describe('dados de demonstração', () => {
  it('semente com histórico é coerente (IDs únicos, relacionamentos e uma receita por atendimento)', () => {
    const s = db.getState();
    const ids = s.appointments.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const apptIds = new Set(ids);
    const perAppt = new Map<string, number>();
    for (const e of s.financialEntries) {
      if (e.appointmentId) {
        expect(apptIds.has(e.appointmentId)).toBe(true);
        if (e.type === 'receita') perAppt.set(e.appointmentId, (perAppt.get(e.appointmentId) ?? 0) + 1);
      }
    }
    expect(Math.max(...perAppt.values())).toBe(1);
    // Sem conflitos de horário por profissional na semente.
    const byProf = new Map<string, [number, number][]>();
    for (const a of s.appointments.filter((x) => !['cancelada', 'reagendada'].includes(x.status))) {
      const k = `${a.professionalId}|${a.start.slice(0, 10)}`;
      const st = new Date(a.start).getTime();
      const list = byProf.get(k) ?? [];
      for (const [bs, be] of list) expect(st < be && st + a.durationMin * 60000 > bs, `${a.id}`).toBe(false);
      list.push([st, st + a.durationMin * 60000]);
      byProf.set(k, list);
    }
  });

  it('relatórios comparam com um período anterior real', () => {
    const r = buildReport(db.getState(), admin(), { range: { from: '2026-09-01', to: '2026-09-30' } });
    expect(r.appointments.total).toBeGreaterThan(100);
    expect(r.finance?.revenue ?? 0).toBeGreaterThan(30000);
  });
});
