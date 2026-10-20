/**
 * Agente 04 — Gestão de profissionais (ambiente administrativo).
 * Composição sobre settingsService/blockRequestService: cadastro, vínculo usuário ↔ profissional,
 * ativação, horários, solicitações e restrições por perfil.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AppError,
  appointmentService,
  blockRequestService,
  db,
  resetDemoData,
  selectAppointments,
  signInDemo,
  signOutDemo,
  toAccessContext,
  type AccessContext,
} from '@core';
import {
  createProfessional,
  decideRequest,
  grantPortalAccess,
  linkedUserOf,
  saveWorkingHours,
  setProfessionalActive,
  updateProfessional,
  type NewProfessionalInput,
} from '@ds/screens/professionals/professionalActions';
import { hoursOn, situationOf, weekKeysOf } from '@ds/screens/professionals/professionalsData';
import { occupancyOf } from '@ds/screens/professional-portal/shared/portalData';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};

const admin = () => ctxOf('u-admin');
const recepcao = () => ctxOf('u-recepcao');
const financeiro = () => ctxOf('u-financeiro');
const lauren = () => ctxOf('u-prof-lauren');

/** Captura o AppError lançado (ou falha o teste). */
function errorOf(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    if (e instanceof AppError) return e;
    throw e;
  }
  throw new Error('esperava AppError');
}

const NEW_PROF: NewProfessionalInput = {
  name: 'Dra. Teste Demonstração',
  title: 'Fisioterapeuta',
  specialty: 'fisioterapia',
  registry: 'CREFITO (demo)',
  roomId: 'sala-6',
  accessEmail: 'teste.demo@humanitta.demo',
};

beforeEach(() => {
  resetDemoData();
  signOutDemo();
});

describe('listagem e situação', () => {
  it('todos os profissionais da semente têm usuário individual ativo vinculado', () => {
    const { professionals, users } = db.getState();
    expect(professionals.length).toBeGreaterThanOrEqual(8);
    for (const p of professionals) {
      const u = linkedUserOf(users, p.id);
      expect(u?.professionalId, p.id).toBe(p.id);
      expect(situationOf(u)).toBe('ativo');
    }
  });

  it('ocupação e expediente vêm da agenda compartilhada (não de número fixo)', () => {
    const s = db.getState();
    const keys = weekKeysOf(new Date(2026, 9, 19));
    expect(keys[0]).toBe('2026-10-19');
    const laurenProf = s.professionals.find((p) => p.id === 'prof-lauren');
    expect(hoursOn(laurenProf!, new Date(2026, 9, 19))).toEqual({ weekday: 1, start: '08:00', end: '18:00' });
    const occ = occupancyOf(laurenProf, keys, selectAppointments(s, admin()), s.blockRequests);
    expect(occ).toBeGreaterThan(0);
    expect(occ).toBeLessThanOrEqual(1);
  });
});

describe('cadastro e edição', () => {
  it('admin cadastra profissional com usuário do Portal vinculado e o login demo reconhece o professionalId', () => {
    const prof = createProfessional(admin(), NEW_PROF);
    const s = db.getState();
    expect(s.professionals.some((p) => p.id === prof.id)).toBe(true);
    const user = linkedUserOf(s.users, prof.id);
    expect(user).toMatchObject({ role: 'profissional', professionalId: prof.id, status: 'ativo', email: 'teste.demo@humanitta.demo' });
    const signed = signInDemo('profissional', user!.id);
    const ctx = toAccessContext(signed);
    expect(ctx.professionalId).toBe(prof.id);
    expect(selectAppointments(db.getState(), ctx)).toEqual([]);
  });

  it('valida os campos do modelo e não grava nada pela metade', () => {
    const before = db.getState().professionals.length;
    const err = errorOf(() => createProfessional(admin(), { ...NEW_PROF, name: 'Teste', roomId: '', specialty: '' }));
    expect(err.code).toBe('VALIDATION');
    expect(Object.keys(err.fields ?? {})).toEqual(expect.arrayContaining(['name', 'roomId', 'specialty']));
    const dup = errorOf(() => createProfessional(admin(), { ...NEW_PROF, accessEmail: 'administracao@humanitta.demo' }));
    expect(dup.fields?.accessEmail).toMatch(/em uso/);
    expect(db.getState().professionals.length).toBe(before);
  });

  it('edição preserva id e relacionamentos e sincroniza nome no agendamento e no usuário', () => {
    const helena = db.getState().professionals.find((p) => p.id === 'prof-helena')!;
    updateProfessional(admin(), helena.id, {
      name: 'Dra. Helena M. Demo',
      title: helena.title,
      specialty: helena.specialty,
      registry: helena.registry ?? '',
      roomId: helena.roomId ?? 'sala-2',
    });
    const s = db.getState();
    expect(s.professionals.find((p) => p.id === 'prof-helena')?.name).toBe('Dra. Helena M. Demo');
    const appts = s.appointments.filter((a) => a.professionalId === 'prof-helena');
    expect(appts.length).toBeGreaterThan(0);
    expect(appts.every((a) => a.professionalName === 'Dra. Helena M. Demo')).toBe(true);
    expect(linkedUserOf(s.users, 'prof-helena')?.name).toBe('Dra. Helena M. Demo');
  });

  it('cadastro sem acesso pode receber o acesso depois (uma única vez)', () => {
    const prof = createProfessional(admin(), { ...NEW_PROF, accessEmail: undefined });
    expect(situationOf(linkedUserOf(db.getState().users, prof.id))).toBe('sem_acesso');
    grantPortalAccess(admin(), prof.id, 'depois@humanitta.demo');
    expect(situationOf(linkedUserOf(db.getState().users, prof.id))).toBe('ativo');
    expect(errorOf(() => grantPortalAccess(admin(), prof.id, 'outro@humanitta.demo')).code).toBe('CONFLICT');
  });
});

describe('restrições por perfil', () => {
  it('recepção e financeiro consultam, mas não cadastram nem editam', () => {
    expect(errorOf(() => createProfessional(recepcao(), { ...NEW_PROF, accessEmail: undefined })).code).toBe('FORBIDDEN');
    expect(errorOf(() => createProfessional(financeiro(), { ...NEW_PROF, accessEmail: undefined })).code).toBe('FORBIDDEN');
    expect(errorOf(() => saveWorkingHours(recepcao(), 'prof-lauren', [])).code).toBe('FORBIDDEN');
  });

  it('profissional não altera o próprio cadastro administrativo nem a própria situação', () => {
    expect(errorOf(() => saveWorkingHours(lauren(), 'prof-lauren', [])).code).toBe('FORBIDDEN');
    expect(errorOf(() => setProfessionalActive(lauren(), 'prof-lauren', false)).code).toBe('FORBIDDEN');
    expect(errorOf(() => grantPortalAccess(lauren(), 'prof-helena', 'x@humanitta.demo')).code).toBe('FORBIDDEN');
  });
});

describe('ativação e desativação', () => {
  it('desativar bloqueia o Portal sem apagar cadastro nem agenda; reativar devolve o acesso', () => {
    const apptsBefore = db.getState().appointments.filter((a) => a.professionalId === 'prof-helena').length;
    setProfessionalActive(admin(), 'prof-helena', false);
    expect(() => signInDemo('profissional', 'u-prof-helena')).toThrow(/inativo/);
    const s = db.getState();
    expect(s.professionals.some((p) => p.id === 'prof-helena')).toBe(true);
    expect(s.appointments.filter((a) => a.professionalId === 'prof-helena').length).toBe(apptsBefore);
    setProfessionalActive(admin(), 'prof-helena', true);
    expect(signInDemo('profissional', 'u-prof-helena').professionalId).toBe('prof-helena');
  });
});

describe('configuração de horários', () => {
  it('rejeita término antes do início e persiste uma grade válida', () => {
    const bad = errorOf(() => saveWorkingHours(admin(), 'prof-helena', [{ weekday: 1, start: '14:00', end: '09:00' }]));
    expect(bad.code).toBe('VALIDATION');
    expect(bad.fields?.['day-1']).toBeDefined();
    saveWorkingHours(admin(), 'prof-helena', [
      { weekday: 3, start: '09:00', end: '15:00' },
      { weekday: 1, start: '08:00', end: '12:00' },
    ]);
    expect(db.getState().professionals.find((p) => p.id === 'prof-helena')?.workingHours).toEqual([
      { weekday: 1, start: '08:00', end: '12:00' },
      { weekday: 3, start: '09:00', end: '15:00' },
    ]);
  });
});

describe('solicitações de bloqueio e disponibilidade', () => {
  it('pendente não bloqueia a agenda; aprovado bloqueia (Agenda considera via findConflicts)', () => {
    const req = blockRequestService.requestBlock(lauren(), {
      kind: 'bloqueio',
      date: '2026-10-22',
      start: '15:00',
      end: '16:00',
      reason: 'Curso / evento',
    });
    expect(req.status).toBe('enviada');
    expect(appointmentService.findConflicts('prof-lauren', '2026-10-22T15:00:00', 30).blocks).toHaveLength(0);
    const { request } = decideRequest(admin(), req.id, 'aprovada');
    expect(request.status).toBe('aprovada');
    expect(appointmentService.findConflicts('prof-lauren', '2026-10-22T15:00:00', 30).blocks).toHaveLength(1);
    expect(() =>
      appointmentService.createAppointment(recepcao(), {
        patientId: 'pac-01',
        professionalId: 'prof-lauren',
        service: 'Consulta de retorno',
        start: '2026-10-22T15:00:00',
        durationMin: 30,
      }),
    ).toThrow();
  });

  it('alteração de disponibilidade aprovada é aplicada à grade; recusa exige motivo', () => {
    const req = blockRequestService.requestBlock(lauren(), {
      kind: 'disponibilidade',
      date: '2026-10-31',
      weekday: 6,
      start: '08:00',
      end: '13:00',
      reason: 'Ampliar horário',
    });
    const before = db.getState().professionals.find((p) => p.id === 'prof-lauren')!.workingHours.find((w) => w.weekday === 6);
    expect(before?.end).toBe('12:00');
    const { appliedToSchedule } = decideRequest(admin(), req.id, 'aprovada');
    expect(appliedToSchedule).toBe(true);
    expect(db.getState().professionals.find((p) => p.id === 'prof-lauren')!.workingHours.find((w) => w.weekday === 6)?.end).toBe('13:00');

    const other = blockRequestService.requestBlock(lauren(), { kind: 'bloqueio', date: '2026-10-28', start: '09:00', end: '10:00', reason: 'Outro' });
    expect(errorOf(() => decideRequest(admin(), other.id, 'recusada')).fields?.refusalReason).toBeDefined();
    expect(decideRequest(admin(), other.id, 'recusada', 'Agenda cheia nesta data.').request.status).toBe('recusada');
  });

  it('somente a administração decide', () => {
    const req = blockRequestService.requestBlock(lauren(), { kind: 'bloqueio', date: '2026-10-28', start: '09:00', end: '10:00', reason: 'Outro' });
    expect(errorOf(() => decideRequest(recepcao(), req.id, 'aprovada')).code).toBe('FORBIDDEN');
    expect(errorOf(() => decideRequest(lauren(), req.id, 'aprovada')).code).toBe('FORBIDDEN');
    expect(db.getState().blockRequests.find((r) => r.id === req.id)?.status).toBe('enviada');
  });
});
