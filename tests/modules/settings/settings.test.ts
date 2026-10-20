/** Configurações (Agente 08): validações das seções e fluxos pelos serviços do core, com 403. */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AppError,
  blockRequestService,
  can,
  db,
  resetDemoData,
  selectAppointments,
  settingsService,
  toAccessContext,
  type AccessContext,
} from '@core';
import { validateClinicInfo } from '@ds/screens/settings/sections/ClinicDataSection';
import { validateHours } from '@ds/screens/settings/sections/HoursSection';
import { validateUserForm } from '@ds/screens/settings/sections/UsersSection';
import { validateServiceForm } from '@ds/screens/settings/sections/ServicesSection';
import { isLockedPermission, levelOptions } from '@ds/screens/settings/sections/PermissionsSection';
import { buildReport } from '@ds/screens/reports/model';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente`);
  return toAccessContext(u);
};

const expectForbidden = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe('FORBIDDEN');
    return;
  }
  throw new Error('esperava FORBIDDEN');
};

beforeEach(() => resetDemoData());

describe('validações das seções', () => {
  it('dados da clínica: nome obrigatório, e-mail, UF e CEP; placeholders "[a confirmar]" são aceitos', () => {
    const info = db.getState().clinicSettings.info;
    expect(validateClinicInfo(info)).toEqual({});
    const bad = validateClinicInfo({ ...info, name: ' ', email: 'x@', address: { ...info.address, state: 'R', zip: '123' } });
    expect(Object.keys(bad).sort()).toEqual(['email', 'name', 'state', 'zip']);
  });

  it('horários: fechamento depois da abertura e intervalo dentro do expediente', () => {
    const hours = db.getState().clinicSettings.hours;
    expect(validateHours(hours)).toEqual({});
    const mon = hours.find((h) => h.weekday === 1)!;
    expect(Object.keys(validateHours([{ ...mon, start: '18:00', end: '08:00' }]))).toContain('end-1');
    expect(Object.keys(validateHours([{ ...mon, lunchStart: '07:00', lunchEnd: '07:30' }]))).toContain('lunchStart-1');
  });

  it('usuário profissional exige vínculo único e e-mail não pode repetir', () => {
    const users = db.getState().users;
    const base = { name: 'Nova Pessoa', email: 'nova@humanitta.demo', role: 'profissional' as const, title: '', professionalId: '', status: 'convidado' as const };
    expect(validateUserForm(base, users).professionalId).toBeDefined();
    expect(validateUserForm({ ...base, professionalId: 'prof-lauren' }, users).professionalId).toMatch(/já tem um usuário/);
    expect(validateUserForm({ ...base, role: 'recepcao', email: 'recepcao@humanitta.demo' }, users).email).toMatch(/Já existe/);
  });

  it('serviço: nome único por especialidade e duração válida', () => {
    const services = db.getState().services;
    const s = services[0];
    expect(validateServiceForm({ name: s.name, specialty: s.specialty, duration: '40', price: null, active: true }, services).name).toBeDefined();
    expect(validateServiceForm({ name: 'Novo', specialty: s.specialty, duration: '5', price: null, active: true }, services).duration).toBeDefined();
  });

  it('matriz: limites de LGPD são fixos e o profissional só recebe níveis de escopo próprio', () => {
    expect(isLockedPermission('admin', 'registro_clinico')).toBe(true);
    expect(isLockedPermission('profissional', 'financeiro')).toBe(true);
    expect(isLockedPermission('recepcao', 'financeiro')).toBe(false);
    expect(levelOptions('profissional', 'agenda_propria')).toEqual(['nenhum', 'proprio']);
    expect(levelOptions('recepcao', 'relatorios_financeiros')).toEqual(['nenhum', 'ver', 'editar']);
  });
});

describe('fluxos via serviços compartilhados', () => {
  it('administrador salva dados da clínica; recepção recebe 403', () => {
    const admin = ctxOf('u-admin');
    const info = db.getState().clinicSettings.info;
    settingsService.updateClinicSettings(admin, { info: { ...info, tradeName: 'Humanittá — Demo' } });
    expect(db.getState().clinicSettings.info.tradeName).toBe('Humanittá — Demo');
    expectForbidden(() => settingsService.updateClinicSettings(ctxOf('u-recepcao'), { info }));
  });

  it('serviço novo entra na base única; financeiro não pode cadastrar', () => {
    const before = db.getState().services.length;
    const sv = settingsService.upsertService(ctxOf('u-admin'), { name: 'Avaliação postural', specialty: 'fisioterapia', durationMin: 50, price: null, active: true });
    expect(sv.id).toMatch(/^sv-/);
    expect(db.getState().services).toHaveLength(before + 1);
    expectForbidden(() => settingsService.upsertService(ctxOf('u-financeiro'), { ...sv, active: false }));
  });

  it('desativar usuário reflete em "profissionais ativos" dos Relatórios', () => {
    const admin = ctxOf('u-admin');
    const range = { from: '2026-10-01', to: '2026-10-31' };
    const before = buildReport(db.getState(), admin, { range }).professionals.find((p) => p.id === 'prof-ana');
    expect(before?.active).toBe(true);
    const u = db.getState().users.find((x) => x.id === 'u-prof-ana')!;
    settingsService.upsertUser(admin, { ...u, status: 'inativo' });
    const after = buildReport(db.getState(), admin, { range }).professionals.find((p) => p.id === 'prof-ana');
    expect(after?.active).toBe(false);
  });

  it('ajuste da matriz vale para todos os módulos; LGPD continua fixo', () => {
    const admin = ctxOf('u-admin');
    const recepcao = ctxOf('u-recepcao');
    settingsService.setPermission(admin, 'recepcao', 'relatorios_operacionais', 'nenhum');
    expect(buildReport(db.getState(), recepcao, { range: { from: '2026-10-01', to: '2026-10-31' } }).access.operational).toBe(false);
    settingsService.setPermission(admin, 'admin', 'registro_clinico', 'editar');
    expect(can(admin, 'registro_clinico', 'ver', db.getState().clinicSettings.permissionOverrides)).toBe(false);
    expectForbidden(() => settingsService.setPermission(recepcao, 'recepcao', 'financeiro', 'editar'));
  });

  it('aprovação de bloqueio: admin decide, recepção não; recusa exige motivo', () => {
    const pending = db.getState().blockRequests.filter((r) => r.status === 'enviada');
    expect(pending.length).toBeGreaterThan(0);
    expectForbidden(() => blockRequestService.decideBlockRequest(ctxOf('u-recepcao'), pending[0].id, 'aprovada'));
    const approved = blockRequestService.decideBlockRequest(ctxOf('u-admin'), pending[0].id, 'aprovada');
    expect(approved.status).toBe('aprovada');
    if (pending[1]) {
      expect(() => blockRequestService.decideBlockRequest(ctxOf('u-admin'), pending[1].id, 'recusada', ' ')).toThrow(AppError);
    }
  });

  it('usuário profissional sem vínculo é recusado pelo serviço (sem segundo mecanismo de autenticação)', () => {
    expect(() =>
      settingsService.upsertUser(ctxOf('u-admin'), { name: 'Sem vínculo', email: 'sv@humanitta.demo', role: 'profissional', title: 'X', initials: 'SV', status: 'convidado', isDemo: true }),
    ).toThrow(AppError);
    // nenhum agendamento muda por conta de configurações de usuário
    expect(selectAppointments(db.getState(), ctxOf('u-admin')).length).toBe(db.getState().appointments.length);
  });
});
