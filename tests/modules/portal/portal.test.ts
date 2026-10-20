/**
 * Agente 04 — Portal do Profissional. Cenários A–E da demonstração sobre a base compartilhada:
 * isolamento por professionalId, pacientes vinculados, atendimentos próprios, bloqueios e perfil.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AppError,
  appointmentService,
  attendanceService,
  blockRequestService,
  db,
  now,
  nowIso,
  resetDemoData,
  selectAppointments,
  selectBlockRequests,
  selectClinicalRecords,
  selectMyPatients,
  selectMyPayouts,
  settingsService,
  toAccessContext,
  toPortalAppointment,
  type AccessContext,
} from '@core';
import {
  attendanceHistory,
  availabilityOf,
  daySlots,
  findConflictsIn,
  nextWaitingAppointment,
  payoutSummary,
  selectRestrictedMarkers,
} from '@ds/screens/professional-portal/shared/portalData';
import { finishAttendanceWithReturn } from '@ds/screens/professional-portal/shared/portalActions';
import { composeClinicalSummary, parseClinicalSummary } from '@ds/screens/professional-portal/attendances/clinicalDraft';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};
const lauren = () => ctxOf('u-prof-lauren');
const helena = () => ctxOf('u-prof-helena');
const admin = () => ctxOf('u-admin');
const recepcao = () => ctxOf('u-recepcao');

const profOf = (id: string) => db.getState().professionals.find((p) => p.id === id);
const mine = (ctx: AccessContext) => selectAppointments(db.getState(), ctx).map(toPortalAppointment);

function errorOf(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    if (e instanceof AppError) return e;
    throw e;
  }
  throw new Error('esperava AppError');
}

beforeEach(() => resetDemoData());

describe('Cenário A — recepção agenda e a consulta aparece na agenda individual', () => {
  it('nova consulta da Dra. Helena aparece só para ela', () => {
    const appt = appointmentService.createAppointment(recepcao(), {
      patientId: 'pac-03',
      professionalId: 'prof-helena',
      service: 'Terapia fonoaudiológica',
      start: '2026-11-04T16:00:00',
      durationMin: 45,
    });
    expect(mine(helena()).some((a) => a.id === appt.id)).toBe(true);
    expect(mine(lauren()).some((a) => a.id === appt.id)).toBe(false);
    // O DTO do portal nunca carrega preço.
    expect(mine(helena()).every((a) => !('price' in a))).toBe(true);
  });
});

describe('Cenários B e C — cada profissional vê apenas os próprios dados', () => {
  it('agendas são disjuntas e sempre do próprio professionalId', () => {
    const l = mine(lauren());
    const h = mine(helena());
    expect(l.length).toBeGreaterThan(0);
    expect(h.length).toBeGreaterThan(0);
    expect(l.every((a) => a.professionalId === 'prof-lauren')).toBe(true);
    expect(h.every((a) => a.professionalId === 'prof-helena')).toBe(true);
    const ids = new Set(l.map((a) => a.id));
    expect(h.some((a) => ids.has(a.id))).toBe(false);
  });

  it('pacientes vinculados derivam das próprias consultas, com dados mínimos', () => {
    const s = db.getState();
    const lp = selectMyPatients(s, lauren());
    const hp = selectMyPatients(s, helena());
    const laurenPatientIds = new Set(s.appointments.filter((a) => a.professionalId === 'prof-lauren').map((a) => a.patientId));
    expect(lp.every((p) => laurenPatientIds.has(p.id))).toBe(true);
    expect(lp.map((p) => p.id).sort()).not.toEqual(hp.map((p) => p.id).sort());
    for (const p of lp) {
      expect(p).not.toHaveProperty('balance');
      expect(p).not.toHaveProperty('email');
      expect(p.phoneMasked).toMatch(/•/);
    }
  });

  it('perfil sem professionalId não recebe dados do portal', () => {
    const s = db.getState();
    expect(selectMyPatients(s, admin())).toEqual([]);
    expect(selectRestrictedMarkers(s, admin(), nowIso())).toEqual([]);
    expect(selectClinicalRecords(s, admin())).toEqual([]);
  });

  it('repasses: cada profissional vê só os próprios (Helena tem, Lauren não)', () => {
    const s = db.getState();
    const lp = payoutSummary(selectMyPayouts(s, lauren()), mine(lauren()), now());
    const hp = payoutSummary(selectMyPayouts(s, helena()), mine(helena()), now());
    expect(lp.expected).toBe(0);
    expect(hp.expected).toBeGreaterThan(0);
    expect(selectMyPayouts(s, helena()).every((e) => e.professionalId === 'prof-helena')).toBe(true);
  });
});

describe('Dashboard e agenda — grade de horários', () => {
  it('grade do dia combina consultas, intervalo e horários livres a partir do cadastro', () => {
    const slots = daySlots(profOf('prof-lauren'), '2026-10-19', mine(lauren()), selectBlockRequests(db.getState(), lauren()));
    const states = new Set(slots.map((s) => s.state));
    expect(slots[0].time).toBe('08:00');
    expect(states.has('ocupado')).toBe(true);
    expect(states.has('intervalo')).toBe(true);
    expect(states.has('livre')).toBe(true);
    expect(daySlots(profOf('prof-lauren'), '2026-10-25', mine(lauren()))).toEqual([]); // domingo
  });

  it('bloqueio aprovado aparece como bloqueado e pendente como pendente', () => {
    const req = selectBlockRequests(db.getState(), lauren());
    const approved = daySlots(profOf('prof-lauren'), '2026-10-21', mine(lauren()), req).filter((s) => s.time === '13:00');
    expect(approved[0]?.state).toBe('bloqueado');
    const pending = daySlots(profOf('prof-lauren'), '2026-10-23', [], req).find((s) => s.time === '17:00');
    expect(pending?.state).toBe('pendente');
  });

  it('próximo atendimento e conflitos usam somente as consultas próprias', () => {
    const next = nextWaitingAppointment(mine(lauren()), now());
    expect(next?.professionalId).toBe('prof-lauren');
    expect(next && next.start >= '2026-10-19T10:24').toBe(true);
    const conflicts = findConflictsIn(mine(lauren()), 'prof-lauren', '2026-10-19', '13:00', '15:00');
    expect(conflicts.map((a) => a.id)).toEqual(expect.arrayContaining(['pl-103', 'pl-104']));
    expect(availabilityOf(profOf('prof-lauren')).find((d) => d.weekday === 6)).toMatchObject({ enabled: true, start: '08:00', end: '12:00' });
  });
});

describe('Cenário D — solicitação de bloqueio', () => {
  it('profissional solicita para si (professionalId da sessão) e pode retirar enquanto pendente', () => {
    const req = blockRequestService.requestBlock(lauren(), { kind: 'bloqueio', date: '2026-10-27', start: '14:00', end: '15:00', reason: 'Consulta médica' });
    expect(req).toMatchObject({ professionalId: 'prof-lauren', status: 'enviada' });
    expect(selectBlockRequests(db.getState(), helena()).some((r) => r.id === req.id)).toBe(false);
    expect(errorOf(() => blockRequestService.withdrawBlockRequest(helena(), req.id)).code).toBe('FORBIDDEN');
    blockRequestService.withdrawBlockRequest(lauren(), req.id);
    expect(db.getState().blockRequests.some((r) => r.id === req.id)).toBe(false);
  });

  it('valida motivo e horário; administração não "solicita" em nome do profissional', () => {
    expect(errorOf(() => blockRequestService.requestBlock(lauren(), { kind: 'bloqueio', date: '2026-10-27', start: '15:00', end: '14:00', reason: '' })).code).toBe('VALIDATION');
    expect(errorOf(() => blockRequestService.requestBlock(admin(), { kind: 'bloqueio', date: '2026-10-27', start: '14:00', end: '15:00', reason: 'x' })).code).toBe('FORBIDDEN');
  });
});

describe('Cenário E — atendimentos próprios', () => {
  it('fluxo iniciar → finalizar com prontuário próprio e aviso de retorno', () => {
    // pl-101 já está em andamento: iniciar outro antes de finalizar é recusado.
    expect(errorOf(() => attendanceService.startAttendance(lauren(), 'pl-102')).code).toBe('CONFLICT');
    const summary = composeClinicalSummary({ queixa: 'Demo', procedimento: 'Profilaxia demonstrativa', evolucao: '', conduta: 'Retorno' });
    finishAttendanceWithReturn(lauren(), 'pl-101', { summary, patientName: 'Paciente', suggestedDate: '2027-04-19', hasNoteToReception: true });
    const s = db.getState();
    expect(s.appointments.find((a) => a.id === 'pl-101')?.status).toBe('concluida');
    expect(s.attendances.find((a) => a.appointmentId === 'pl-101')?.status).toBe('finalizado');
    expect(selectClinicalRecords(s, lauren()).find((r) => r.appointmentId === 'pl-101')?.summary).toBe(summary);
    expect(selectClinicalRecords(s, helena()).some((r) => r.appointmentId === 'pl-101')).toBe(false);
    expect(s.activity[0].what).toMatch(/sugeriu retorno/);
    expect(s.activity[0].what).not.toMatch(/Profilaxia/); // conteúdo clínico não vai para o feed
    expect(attendanceService.startAttendance(lauren(), 'pl-102').status).toBe('em_andamento');
  });

  it('outro profissional e a recepção não conduzem o atendimento', () => {
    expect(errorOf(() => attendanceService.startAttendance(helena(), 'pl-102')).code).toBe('FORBIDDEN');
    expect(errorOf(() => attendanceService.finishAttendance(recepcao(), 'pl-101')).code).toBe('FORBIDDEN');
  });

  it('histórico: próprios com resumo; de outros profissionais só a existência', () => {
    const s = db.getState();
    const restricted = selectRestrictedMarkers(s, lauren(), nowIso());
    const history = attendanceHistory(mine(lauren()), selectClinicalRecords(s, lauren()), now(), { restricted });
    const own = history.filter((r) => !r.restricted);
    const others = history.filter((r) => r.restricted);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => s.appointments.find((a) => a.id === r.appointmentId)?.professionalId === 'prof-lauren')).toBe(true);
    expect(own.some((r) => r.summary)).toBe(true);
    for (const r of others) {
      expect(r.service).toBeUndefined();
      expect(r.summary).toBeUndefined();
      expect(r.professionalName).toBeUndefined();
    }
  });

  it('rascunho do prontuário volta para os mesmos campos', () => {
    const draft = { queixa: 'A', procedimento: 'B', evolucao: 'C\nD', conduta: '' };
    expect(parseClinicalSummary(composeClinicalSummary(draft))).toEqual({ queixa: 'A', procedimento: 'B', evolucao: 'C D', conduta: '' });
    expect(parseClinicalSummary('Texto livre da semente').evolucao).toBe('Texto livre da semente');
  });
});

describe('Meu Perfil — somente campos autorizados', () => {
  it('profissional edita título/foto do PRÓPRIO cadastro; papel e vínculo não mudam', () => {
    settingsService.updateOwnProfile(lauren(), { title: 'Ortodontista (demo)' });
    expect(profOf('prof-lauren')?.title).toBe('Ortodontista (demo)');
    expect(profOf('prof-helena')?.title).not.toBe('Ortodontista (demo)');
    const u = db.getState().users.find((x) => x.id === 'u-prof-lauren');
    expect(u).toMatchObject({ role: 'profissional', professionalId: 'prof-lauren' });
    // Sem professionalId (ex.: recepção) não há "próprio cadastro" de profissional.
    expect(errorOf(() => settingsService.updateOwnProfile(recepcao(), { title: 'x' })).code).toBe('FORBIDDEN');
  });
});
