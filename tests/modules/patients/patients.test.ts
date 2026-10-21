/**
 * Agente 03 — Pacientes. Fluxos do módulo sobre a base compartilhada (sem store próprio).
 * Cobre listagem, busca, filtros, ordenação, cadastro, validação, edição, perfil, agenda vinculada,
 * persistência, permissões por perfil e desativação.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppError,
  DB_STORAGE_KEY,
  appointmentService,
  db,
  resetDemoData,
  selectAppointments,
  selectMyPatients,
  toAccessContext,
  type AccessContext,
} from '@core';
import {
  buildPatientHistory,
  countQuickFilters,
  deactivatePatient,
  filterPatients,
  findDuplicatePatient,
  patientsToCsv,
  reactivatePatient,
  registerPatient,
  removePatient,
  savePatient,
  selectPatientAttendances,
  selectPatientDetail,
  selectPatientFinance,
  selectPatientRows,
  selectPatientScope,
  type PatientCriteria,
  type PatientFormInput,
} from '@ds/screens/patients/data/patientData';
import { EMPTY_PATIENT_FORM, validatePatientForm } from '@ds/screens/patients/modals/PatientFormFields';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};

const admin = () => ctxOf('u-admin');
const recepcao = () => ctxOf('u-recepcao');
const financeiro = () => ctxOf('u-financeiro');
const lauren = () => ctxOf('u-prof-lauren');
const helena = () => ctxOf('u-prof-helena');

const MONTH_START = '2026-10-01';
const criteria = (c: Partial<PatientCriteria> = {}): PatientCriteria => ({ query: '', quick: 'todos', sort: 'nome-asc', monthStart: MONTH_START, ...c });

const NEW_PATIENT: PatientFormInput = {
  name: 'Helena Demonstração Teste',
  birthDate: '1990-05-12',
  phone: '(54) 99888-7766',
  email: 'helena.teste@exemplo.com',
  city: 'Sarandi',
  tags: ['WhatsApp'],
  adminNote: 'Prefere horários pela manhã.',
  status: 'ativo',
};

const expectAppError = (fn: () => unknown, code: AppError['code']) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe(code);
    return e as AppError;
  }
  throw new Error(`esperava AppError ${code}`);
};

beforeEach(() => resetDemoData());

describe('1 · listagem', () => {
  it('lista todos os pacientes da base compartilhada para a recepção, com dados derivados da agenda', () => {
    const rows = selectPatientRows(db.getState(), recepcao());
    expect(rows).toHaveLength(db.getState().patients.length);
    expect(rows.map((r) => r.name)).toEqual([...rows.map((r) => r.name)].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    const carla = rows.find((r) => r.id === 'pac-01');
    expect(carla?.appointmentCount).toBe(db.getState().appointments.filter((a) => a.patientId === 'pac-01').length);
  });

  it('indicadores de ativos e inativos batem com o cadastro', () => {
    const rows = selectPatientRows(db.getState(), admin());
    const counts = countQuickFilters(rows, MONTH_START);
    const s = db.getState();
    expect(counts.todos).toBe(s.patients.length);
    expect(counts.ativos).toBe(s.patients.filter((p) => p.status === 'ativo').length);
    expect(counts.inativos).toBe(s.patients.filter((p) => p.status === 'inativo').length);
  });
});

describe('2 · pesquisa', () => {
  it('encontra por nome sem acento e sem diferenciar maiúsculas', () => {
    const rows = selectPatientRows(db.getState(), recepcao());
    expect(filterPatients(rows, criteria({ query: 'luiza bort' })).map((r) => r.id)).toEqual(['pac-03']);
  });

  it('encontra por telefone (dígitos) e por código do paciente', () => {
    const rows = selectPatientRows(db.getState(), recepcao());
    expect(filterPatients(rows, criteria({ query: '99100-0107' })).map((r) => r.id)).toEqual(['pac-07']);
    expect(filterPatients(rows, criteria({ query: 'pac-12' })).map((r) => r.id)).toEqual(['pac-12']);
  });

  it('busca sem resultado devolve lista vazia', () => {
    const rows = selectPatientRows(db.getState(), recepcao());
    expect(filterPatients(rows, criteria({ query: 'zzz-inexistente' }))).toHaveLength(0);
  });
});

describe('3 · filtros e ordenação', () => {
  it('filtra por situação, saldo, especialidade, profissional e etiqueta', () => {
    const rows = selectPatientRows(db.getState(), admin());
    expect(filterPatients(rows, criteria({ quick: 'inativos' })).every((r) => r.status === 'inativo')).toBe(true);
    expect(filterPatients(rows, criteria({ quick: 'saldo' })).every((r) => (r.balance ?? 0) > 0)).toBe(true);
    expect(filterPatients(rows, criteria({ specialty: 'odontologia' })).every((r) => r.specialties.includes('odontologia'))).toBe(true);
    const byLauren = filterPatients(rows, criteria({ professionalId: 'prof-lauren' }));
    expect(byLauren.length).toBeGreaterThan(0);
    expect(byLauren.every((r) => r.professionalIds.includes('prof-lauren'))).toBe(true);
    expect(filterPatients(rows, criteria({ tag: '60+' })).map((r) => r.id).sort()).toEqual(['pac-06', 'pac-12']);
  });

  it('"Novos" considera o cadastro no mês corrente', () => {
    const rows = selectPatientRows(db.getState(), admin());
    expect(filterPatients(rows, criteria({ quick: 'novos' })).every((r) => (r.createdAt ?? '') >= MONTH_START)).toBe(true);
  });

  it('ordena por nome (A–Z / Z–A) e por data de cadastro', () => {
    const rows = selectPatientRows(db.getState(), admin());
    const az = filterPatients(rows, criteria({ sort: 'nome-asc' })).map((r) => r.name);
    expect(filterPatients(rows, criteria({ sort: 'nome-desc' })).map((r) => r.name)).toEqual([...az].reverse());
    const recent = filterPatients(rows, criteria({ sort: 'cadastro-desc' })).map((r) => r.createdAt ?? '');
    expect(recent).toEqual([...recent].sort().reverse());
    const oldest = filterPatients(rows, criteria({ sort: 'cadastro-asc' })).map((r) => r.createdAt ?? '');
    expect(oldest).toEqual([...oldest].sort());
  });
});

describe('4 · cadastro', () => {
  it('cadastra pelo serviço compartilhado, com ID gerado e disponível para a Agenda', () => {
    const created = registerPatient(recepcao(), NEW_PATIENT);
    expect(created.id).toMatch(/^pac-/);
    expect(created.status).toBe('ativo');
    expect(db.getState().patients.filter((p) => p.id === created.id)).toHaveLength(1);
    expect(selectPatientRows(db.getState(), recepcao()).some((r) => r.id === created.id)).toBe(true);

    // A Agenda (Agente 02) agenda pelo mesmo ID.
    const appt = appointmentService.createAppointment(recepcao(), {
      patientId: created.id,
      professionalId: 'prof-helena',
      start: '2026-10-28T07:00:00',
      durationMin: 30,
      service: 'Avaliação',
    });
    expect(appt.patientName).toBe(created.name);
    expect(selectPatientDetail(db.getState(), recepcao(), created.id)).toMatchObject({ status: 'ok' });
  });

  it('cadastro inativo já nasce inativo', () => {
    const created = registerPatient(admin(), { ...NEW_PATIENT, status: 'inativo' });
    expect(db.getState().patients.find((p) => p.id === created.id)?.status).toBe('inativo');
  });

  it('impede duplicidade por telefone e por nome + data de nascimento', () => {
    const dupPhone = expectAppError(() => registerPatient(recepcao(), { ...NEW_PATIENT, phone: '(54) 99100-0101' }), 'CONFLICT');
    expect(dupPhone.fields?.phone).toBeDefined();
    const dupName = expectAppError(
      () => registerPatient(recepcao(), { ...NEW_PATIENT, name: 'carla  menegatti', birthDate: '1988-03-14', phone: '(54) 99000-1111' }),
      'CONFLICT',
    );
    expect(dupName.fields?.name).toBeDefined();
    expect(findDuplicatePatient(db.getState().patients, NEW_PATIENT)).toBeNull();
  });
});

describe('5 · validação de campos', () => {
  it('formulário vazio aponta os obrigatórios', () => {
    const e = validatePatientForm({ ...EMPTY_PATIENT_FORM, city: '' }, '2026-10-19');
    expect(Object.keys(e).sort()).toEqual(['birthDate', 'city', 'name', 'phone']);
  });

  it('valida formatos: e-mail, telefone e nascimento no futuro', () => {
    const e = validatePatientForm(
      { ...EMPTY_PATIENT_FORM, name: 'Ana Teste', birthDate: '2030-01-01', phone: '(54) 9999', email: 'sem-arroba' },
      '2026-10-19',
    );
    expect(e.birthDate).toMatch(/futuro/);
    expect(e.phone).toBeDefined();
    expect(e.email).toBeDefined();
  });

  it('o serviço revalida e devolve erros por campo', () => {
    const err = expectAppError(() => registerPatient(recepcao(), { ...NEW_PATIENT, name: ' ', phone: '123' }), 'VALIDATION');
    expect(err.fields?.name).toBeDefined();
    expect(err.fields?.phone).toBeDefined();
  });
});

describe('6 · edição', () => {
  it('atualiza o mesmo registro, preserva ID e vínculos e reflete o nome na agenda', () => {
    const before = db.getState().appointments.filter((a) => a.patientId === 'pac-02').map((a) => a.id);
    const updated = savePatient(recepcao(), 'pac-02', {
      ...NEW_PATIENT,
      name: 'João Pedro Basso Silva',
      birthDate: '2016-07-02',
      phone: '(54) 99100-0199',
    });
    expect(updated.id).toBe('pac-02');
    const s = db.getState();
    expect(s.patients.filter((p) => p.name.startsWith('João Pedro'))).toHaveLength(1);
    const after = s.appointments.filter((a) => a.patientId === 'pac-02');
    expect(after.map((a) => a.id)).toEqual(before);
    expect(after.every((a) => a.patientName === 'João Pedro Basso Silva')).toBe(true);
    // Portal do profissional lê o mesmo cadastro.
    const profUser = s.users.find((u) => u.professionalId === after[0].professionalId)!;
    const portal = selectMyPatients(s, ctxOf(profUser.id));
    expect(portal.find((p) => p.id === 'pac-02')?.name).toBe('João Pedro Basso Silva');
  });

  it('não permite assumir o telefone de outro paciente ao editar', () => {
    expectAppError(() => savePatient(recepcao(), 'pac-02', { ...NEW_PATIENT, phone: '(54) 99100-0101' }), 'CONFLICT');
  });
});

describe('7 · perfil e 8 · agendamentos vinculados', () => {
  it('perfil traz cadastro completo e agendamentos consultados pelo ID', () => {
    const r = selectPatientDetail(db.getState(), recepcao(), 'pac-01');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.detail.record?.id).toBe('pac-01');
    expect(r.detail.appointments.length).toBeGreaterThan(0);
    expect(r.detail.appointments.every((a) => a.patientId === 'pac-01')).toBe(true);
    expect(r.detail.appointments).toEqual(selectAppointments(db.getState(), recepcao(), { patientId: 'pac-01' }));
  });

  it('paciente inexistente → not_found', () => {
    expect(selectPatientDetail(db.getState(), admin(), 'pac-999').status).toBe('not_found');
  });

  it('histórico administrativo não contém conteúdo clínico', () => {
    const s = db.getState();
    const r = selectPatientDetail(s, admin(), 'pac-01');
    if (r.status !== 'ok') throw new Error('perfil indisponível');
    const history = buildPatientHistory(r.detail.row, r.detail.appointments, selectPatientAttendances(s, admin(), 'pac-01'), s.activity);
    expect(history.length).toBeGreaterThan(0);
    const clinical = s.clinicalRecords.filter((c) => c.patientId === 'pac-01').map((c) => c.summary);
    for (const text of clinical) expect(history.some((h) => h.what.includes(text))).toBe(false);
  });

  it('cancelamento feito na Agenda aparece no histórico do paciente', () => {
    const appt = db.getState().appointments.find((a) => a.patientId === 'pac-08' && ['agendada', 'confirmada'].includes(a.status));
    if (!appt) throw new Error('semente sem consulta futura para pac-08');
    appointmentService.cancelAppointment(recepcao(), appt.id, 'Paciente viajando');
    const s = db.getState();
    const r = selectPatientDetail(s, recepcao(), 'pac-08');
    if (r.status !== 'ok') throw new Error('perfil indisponível');
    const history = buildPatientHistory(r.detail.row, r.detail.appointments, []);
    expect(history.some((h) => h.what.includes('Paciente viajando'))).toBe(true);
  });
});

describe('9 · persistência', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('cadastro e edição são gravados no armazenamento compartilhado (sobrevivem ao recarregar)', () => {
    const mem = new Map<string, string>();
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
    });
    const created = registerPatient(recepcao(), NEW_PATIENT);
    savePatient(recepcao(), created.id, { ...NEW_PATIENT, city: 'Pontão' });
    vi.advanceTimersByTime(500);
    const saved = JSON.parse(mem.get(DB_STORAGE_KEY) ?? '{}') as { patients?: { id: string; city: string }[] };
    expect(saved.patients?.find((p) => p.id === created.id)?.city).toBe('Pontão');
    expect(mem.size).toBe(1); // nenhum armazenamento paralelo do módulo
  });
});

describe('10 · permissões por perfil', () => {
  it('financeiro vê o cadastro (somente leitura) e o saldo; não edita', () => {
    const s = db.getState();
    expect(selectPatientScope(s, financeiro())).toBe('clinica');
    expect(selectPatientRows(s, financeiro()).every((r) => r.balance !== undefined)).toBe(true);
    expectAppError(() => registerPatient(financeiro(), NEW_PATIENT), 'FORBIDDEN');
    expectAppError(() => savePatient(financeiro(), 'pac-01', { ...NEW_PATIENT, phone: '(54) 99100-0101', name: 'Carla Menegatti' }), 'FORBIDDEN');
    expectAppError(() => deactivatePatient(financeiro(), 'pac-01'), 'FORBIDDEN');
  });

  it('recepção vê financeiro do paciente; admin também', () => {
    const s = db.getState();
    expect(selectPatientFinance(s, recepcao(), 'pac-05')).not.toBeNull();
    expect(selectPatientFinance(s, admin(), 'pac-05')).not.toBeNull();
  });

  it('profissional vê só pacientes vinculados, em dados mínimos e sem financeiro', () => {
    const s = db.getState();
    for (const ctx of [lauren(), helena()]) {
      expect(selectPatientScope(s, ctx)).toBe('proprio');
      const rows = selectPatientRows(s, ctx);
      const linked = new Set(s.appointments.filter((a) => a.professionalId === ctx.professionalId).map((a) => a.patientId));
      expect(new Set(rows.map((r) => r.id))).toEqual(linked);
      for (const r of rows) {
        expect(r.minimal).toBe(true);
        expect(r.balance).toBeUndefined();
        expect(r.email).toBeUndefined();
        expect(r.city).toBeUndefined();
        expect(r.phone).toContain('••••');
        expect(r.professionalIds).toEqual([ctx.professionalId]);
      }
      expect(selectPatientFinance(s, ctx, rows[0].id)).toBeNull();
    }
  });

  it('exportação não inclui saldo para quem não vê o financeiro', () => {
    const s = db.getState();
    expect(patientsToCsv(selectPatientRows(s, recepcao()))).toContain('Saldo');
    expect(patientsToCsv(selectPatientRows(s, lauren()))).not.toContain('Saldo');
  });
});

describe('11 · acesso não autorizado', () => {
  it('profissional não abre perfil de paciente sem vínculo e não recebe o cadastro completo', () => {
    const s = db.getState();
    const helenaPatients = new Set(s.appointments.filter((a) => a.professionalId === 'prof-helena').map((a) => a.patientId));
    const outsider = s.patients.find((p) => !helenaPatients.has(p.id));
    if (!outsider) throw new Error('semente sem paciente fora do escopo da Dra. Helena');
    expect(selectPatientDetail(s, helena(), outsider.id).status).toBe('forbidden');

    const own = s.patients.find((p) => helenaPatients.has(p.id))!;
    const r = selectPatientDetail(s, helena(), own.id);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.detail.record).toBeUndefined();
      expect(r.detail.appointments.every((a) => a.professionalId === 'prof-helena')).toBe(true);
    }
  });

  it('profissional não cadastra, edita, desativa nem exclui', () => {
    expectAppError(() => registerPatient(lauren(), NEW_PATIENT), 'FORBIDDEN');
    expectAppError(() => savePatient(lauren(), 'pac-01', NEW_PATIENT), 'FORBIDDEN');
    expectAppError(() => deactivatePatient(lauren(), 'pac-01'), 'FORBIDDEN');
    expectAppError(() => removePatient(lauren(), 'pac-01'), 'FORBIDDEN');
  });

  it('matriz ajustada em Configurações vale também para o módulo', () => {
    db.setState((s) => ({
      ...s,
      clinicSettings: { ...s.clinicSettings, permissionOverrides: { recepcao: { pacientes_cadastro: 'nenhum' } } },
    }));
    const s = db.getState();
    expect(selectPatientScope(s, recepcao())).toBe('nenhum');
    expect(selectPatientRows(s, recepcao())).toHaveLength(0);
    expect(selectPatientDetail(s, recepcao(), 'pac-01').status).toBe('forbidden');
    expectAppError(() => registerPatient(recepcao(), NEW_PATIENT), 'FORBIDDEN');
  });
});

describe('12 · desativação', () => {
  it('desativa (exclusão lógica) preservando agendamentos, e reativa', () => {
    const before = db.getState().appointments.filter((a) => a.patientId === 'pac-03').length;
    deactivatePatient(recepcao(), 'pac-03');
    let s = db.getState();
    expect(s.patients.find((p) => p.id === 'pac-03')?.status).toBe('inativo');
    expect(s.appointments.filter((a) => a.patientId === 'pac-03')).toHaveLength(before);
    expect(s.activity[0].what).toContain('desativou');
    reactivatePatient(recepcao(), 'pac-03');
    s = db.getState();
    expect(s.patients.find((p) => p.id === 'pac-03')?.status).toBe('ativo');
  });

  it('exclusão definitiva só para cadastro sem histórico', () => {
    expectAppError(() => removePatient(admin(), 'pac-01'), 'CONFLICT');
    const created = registerPatient(admin(), NEW_PATIENT);
    removePatient(admin(), created.id);
    expect(db.getState().patients.some((p) => p.id === created.id)).toBe(false);
  });
});
