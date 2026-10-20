/**
 * Testes de CONTRATO da base compartilhada. Rodam em todo PR (npm test).
 * Garantem: semente coerente, escopo por profissional, limites de LGPD e 403 nos serviços.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appointmentService,
  attendanceService,
  blockRequestService,
  db,
  financeService,
  resetDemoData,
  selectAppointments,
  selectClinicalRecords,
  selectFinancialEntries,
  selectMyPatients,
  selectMyPayouts,
  selectPatients,
  toAccessContext,
  type AccessContext,
} from '@core';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};

beforeEach(() => resetDemoData());

describe('semente', () => {
  it('relacionamentos por ID são todos válidos', () => {
    const s = db.getState();
    const patients = new Set(s.patients.map((p) => p.id));
    const pros = new Set(s.professionals.map((p) => p.id));
    const rooms = new Set(s.rooms.map((r) => r.id));
    for (const a of s.appointments) {
      expect(patients.has(a.patientId), a.id).toBe(true);
      expect(pros.has(a.professionalId), a.id).toBe(true);
      expect(rooms.has(a.roomId), a.id).toBe(true);
    }
    for (const at of s.attendances) expect(s.appointments.some((a) => a.id === at.appointmentId)).toBe(true);
    for (const c of s.conversations) if (c.patientId) expect(patients.has(c.patientId), c.id).toBe(true);
    for (const e of s.financialEntries) {
      if (e.patientName) expect(e.patientId, e.id).toBeDefined();
      if (e.professionalName) expect(e.professionalId, e.id).toBeDefined();
    }
    for (const u of s.users) if (u.role === 'profissional') expect(pros.has(u.professionalId ?? '')).toBe(true);
  });

  it('IDs são únicos por coleção', () => {
    const s = db.getState();
    for (const key of ['patients', 'professionals', 'users', 'appointments', 'attendances', 'financialEntries', 'conversations', 'messages'] as const) {
      const ids = (s[key] as { id: string }[]).map((x) => x.id);
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });

  it('todo profissional tem um usuário individual', () => {
    const s = db.getState();
    for (const p of s.professionals) expect(s.users.some((u) => u.professionalId === p.id)).toBe(true);
  });
});

describe('escopo do Portal do Profissional', () => {
  it('profissional vê somente os próprios agendamentos', () => {
    const lauren = ctxOf('u-prof-lauren');
    const helena = ctxOf('u-prof-helena');
    const s = db.getState();
    expect(selectAppointments(s, lauren).every((a) => a.professionalId === 'prof-lauren')).toBe(true);
    expect(selectAppointments(s, helena).every((a) => a.professionalId === 'prof-helena')).toBe(true);
    expect(selectAppointments(s, lauren).length).toBeGreaterThan(0);
  });

  it('pacientes do portal são só os vinculados e sem dados sensíveis', () => {
    const helena = ctxOf('u-prof-helena');
    const s = db.getState();
    const linked = new Set(s.appointments.filter((a) => a.professionalId === 'prof-helena').map((a) => a.patientId));
    const mine = selectMyPatients(s, helena);
    expect(mine.length).toBe(linked.size);
    for (const p of mine) {
      expect(linked.has(p.id)).toBe(true);
      expect(p).not.toHaveProperty('balance');
      expect(p).not.toHaveProperty('email');
      expect(p.phoneMasked).toContain('••••');
    }
    expect(selectPatients(s, helena)).toEqual([]);
  });

  it('profissional não vê financeiro geral, só os próprios repasses', () => {
    const helena = ctxOf('u-prof-helena');
    const s = db.getState();
    expect(selectFinancialEntries(s, helena)).toEqual([]);
    expect(selectMyPayouts(s, helena).every((e) => e.professionalId === 'prof-helena' && e.type === 'repasse')).toBe(true);
  });
});

describe('prontuário (LGPD)', () => {
  it('admin, recepção e financeiro nunca leem prontuário', () => {
    const s = db.getState();
    for (const id of ['u-admin', 'u-recepcao', 'u-financeiro']) expect(selectClinicalRecords(s, ctxOf(id))).toEqual([]);
  });

  it('profissional lê só os próprios registros', () => {
    const recs = selectClinicalRecords(db.getState(), ctxOf('u-prof-lauren'));
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.professionalId === 'prof-lauren')).toBe(true);
  });
});

describe('serviços espelham o 403 do servidor', () => {
  const input = { patientId: 'pac-01', professionalId: 'prof-helena', service: 'Terapia fonoaudiológica', start: '2026-10-26T08:00:00', durationMin: 45 };

  it('recepção agenda; profissional e financeiro não', () => {
    expect(appointmentService.createAppointment(ctxOf('u-recepcao'), input).id).toMatch(/^ag-/);
    expect(() => appointmentService.createAppointment(ctxOf('u-prof-helena'), input)).toThrowError(/perfil/);
    expect(() => appointmentService.createAppointment(ctxOf('u-financeiro'), input)).toThrow();
  });

  it('agendamento em horário ocupado gera CONFLICT', () => {
    appointmentService.createAppointment(ctxOf('u-recepcao'), input);
    try {
      appointmentService.createAppointment(ctxOf('u-recepcao'), { ...input, patientId: 'pac-02' });
      expect.unreachable();
    } catch (e) {
      expect((e as { code: string }).code).toBe('CONFLICT');
    }
  });

  it('profissional só inicia atendimento próprio', () => {
    expect(() => attendanceService.startAttendance(ctxOf('u-prof-helena'), 'pl-102')).toThrow();
    // pl-101 já está em andamento; finalize antes de iniciar o próximo.
    attendanceService.finishAttendance(ctxOf('u-prof-lauren'), 'pl-101', 'Resumo demonstrativo.');
    const at = attendanceService.startAttendance(ctxOf('u-prof-lauren'), 'pl-102');
    expect(at.status).toBe('em_andamento');
  });

  it('bloqueio: profissional solicita, admin decide, recepção não decide', () => {
    const req = blockRequestService.requestBlock(ctxOf('u-prof-helena'), {
      kind: 'bloqueio', date: '2026-10-27', start: '08:00', end: '10:00', reason: 'Congresso',
    });
    expect(req.professionalId).toBe('prof-helena');
    expect(() => blockRequestService.decideBlockRequest(ctxOf('u-recepcao'), req.id, 'aprovada')).toThrow();
    expect(blockRequestService.decideBlockRequest(ctxOf('u-admin'), req.id, 'aprovada').status).toBe('aprovada');
  });

  it('financeiro registra pagamento; recepção não', () => {
    const pending = db.getState().financialEntries.find((e) => e.status === 'pendente' && e.type === 'receita');
    expect(pending).toBeDefined();
    expect(() => financeService.registerPayment(ctxOf('u-recepcao'), pending!.id, 'pix')).toThrow();
    expect(financeService.registerPayment(ctxOf('u-financeiro'), pending!.id, 'pix').status).toBe('pago');
  });
});
