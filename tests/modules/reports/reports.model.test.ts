/** Relatórios (Agente 08): períodos, indicadores derivados do banco, escopo por perfil e CSV. */
import { beforeEach, describe, expect, it } from 'vitest';
import { appointmentService, db, financeService, resetDemoData, selectFinanceTotals, toAccessContext, todayKey, type AccessContext } from '@core';
import {
  availableMinutes,
  availableReports,
  buildReport,
  compare,
  escapeCsvCell,
  previousRange,
  ratio,
  REPORT_LIBRARY,
  resolvePeriod,
  selectReportAccess,
  toCsv,
  type ReportFilters,
} from '@ds/screens/reports/model';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente`);
  return toAccessContext(u);
};

const october: ReportFilters = { range: { from: '2026-10-01', to: '2026-10-31' } };

beforeEach(() => resetDemoData());

describe('períodos', () => {
  it('resolve os presets a partir de hoje (19/10/2026)', () => {
    const today = todayKey();
    expect(resolvePeriod('hoje', today)).toEqual({ from: '2026-10-19', to: '2026-10-19' });
    expect(resolvePeriod('7d', today)).toEqual({ from: '2026-10-13', to: '2026-10-19' });
    expect(resolvePeriod('30d', today)).toEqual({ from: '2026-09-20', to: '2026-10-19' });
    expect(resolvePeriod('mes_atual', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(resolvePeriod('mes_anterior', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('período personalizado invertido ou inválido é corrigido', () => {
    expect(resolvePeriod('personalizado', '2026-10-19', { from: '2026-10-20', to: '2026-10-10' })).toEqual({ from: '2026-10-10', to: '2026-10-20' });
    expect(resolvePeriod('personalizado', '2026-10-19', { from: '2026-02-31' })).toEqual({ from: '2026-10-19', to: '2026-10-19' });
  });

  it('comparação: mês inteiro → mês anterior; demais → mesmo número de dias antes', () => {
    expect(previousRange({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(previousRange({ from: '2026-10-13', to: '2026-10-19' })).toEqual({ from: '2026-10-06', to: '2026-10-12' });
  });

  it('variação e razões tratam divisão por zero', () => {
    expect(compare(5, 0).deltaPct).toBeNull();
    expect(compare(0, 0).deltaPct).toBe(0);
    expect(compare(15, 10).deltaPct).toBeCloseTo(50);
    expect(ratio(3, 0)).toBeNull();
  });
});

describe('indicadores derivados do banco compartilhado', () => {
  it('totais de agendamento batem com a base (sem contar reagendados duas vezes)', () => {
    const s = db.getState();
    const r = buildReport(s, ctxOf('u-admin'), october);
    const oct = s.appointments.filter((a) => a.start.startsWith('2026-10'));
    expect(r.appointments.total).toBe(oct.filter((a) => a.status !== 'reagendada').length);
    expect(r.appointments.done).toBe(oct.filter((a) => a.status === 'concluida').length);
    expect(r.appointments.cancelled).toBe(oct.filter((a) => a.status === 'cancelada').length);
    const byPro = r.appointments.byProfessional.reduce((t, x) => t + x.value, 0);
    expect(byPro).toBe(r.appointments.total);
  });

  it('financeiro usa a mesma regra de selectFinanceTotals (Financeiro e Dashboard)', () => {
    const s = db.getState();
    const ctx = ctxOf('u-financeiro');
    const r = buildReport(s, ctx, october);
    const core = selectFinanceTotals(s, ctx, '2026-10');
    expect(r.finance?.revenue).toBeCloseTo(core.revenue);
    expect(r.finance?.expenses).toBeCloseTo(core.expenses);
    expect(r.finance?.payouts).toBeCloseTo(core.payouts);
    expect(r.finance?.result).toBeCloseTo(core.balance);
    expect(r.finance?.receivable).toBeCloseTo(core.receivable);
    expect(r.finance?.overdue).toBeCloseTo(core.overdue);
  });

  it('reage a escritas de outros módulos (cancelamento na Agenda e pagamento no Financeiro)', () => {
    const admin = ctxOf('u-admin');
    const before = buildReport(db.getState(), admin, october);
    const target = db.getState().appointments.find((a) => a.start.startsWith('2026-10') && a.status === 'agendada');
    expect(target).toBeDefined();
    appointmentService.cancelAppointment(ctxOf('u-recepcao'), target!.id, 'Paciente pediu para cancelar');
    const pending = db.getState().financialEntries.find((e) => e.type === 'receita' && e.status === 'pendente' && e.date.startsWith('2026-10'));
    financeService.registerPayment(ctxOf('u-financeiro'), pending!.id, 'pix', '2026-10-19');
    const after = buildReport(db.getState(), admin, october);
    expect(after.appointments.cancelled).toBe(before.appointments.cancelled + 1);
    expect(after.finance?.revenue).toBeCloseTo((before.finance?.revenue ?? 0) + pending!.amount);
  });

  it('filtros de profissional e serviço restringem todos os blocos', () => {
    const s = db.getState();
    const r = buildReport(s, ctxOf('u-admin'), { ...october, professionalId: 'prof-lauren', service: 'Manutenção ortodôntica' });
    const expected = s.appointments.filter(
      (a) => a.start.startsWith('2026-10') && a.professionalId === 'prof-lauren' && a.service === 'Manutenção ortodôntica' && a.status !== 'reagendada',
    );
    expect(r.appointments.total).toBe(expected.length);
    expect(r.professionals.map((p) => p.id)).toEqual(['prof-lauren']);
    expect(r.finance?.payoutsByProfessional?.every((p) => p.id === 'prof-lauren')).toBe(true);
  });

  it('período sem registros devolve zeros e razões nulas', () => {
    const r = buildReport(db.getState(), ctxOf('u-admin'), { range: { from: '2020-01-01', to: '2020-01-31' } });
    expect(r.appointments.total).toBe(0);
    expect(r.appointments.cancelRate).toBeNull();
    expect(r.attendances.completionRate).toBeNull();
    expect(r.isEmpty).toBe(true);
  });

  it('ocupação usa o expediente cadastrado e não inventa valor sem expediente', () => {
    expect(availableMinutes([{ weekday: 1, start: '08:00', end: '12:00' }], { from: '2026-10-19', to: '2026-10-25' })).toBe(240);
    expect(availableMinutes([], { from: '2026-10-19', to: '2026-10-25' })).toBe(0);
    const r = buildReport(db.getState(), ctxOf('u-admin'), october);
    for (const p of r.professionals) if (p.availableMin === 0) expect(p.occupancy).toBeNull();
  });
});

describe('permissões', () => {
  it('recepção vê relatórios operacionais, mas nenhum número financeiro', () => {
    const r = buildReport(db.getState(), ctxOf('u-recepcao'), october);
    expect(r.access.operational).toBe(true);
    expect(r.finance).toBeNull();
    expect(r.professionals.every((p) => p.revenue === null)).toBe(true);
    expect(availableReports(r.access).some((x) => x.category === 'Financeiro')).toBe(false);
  });

  it('financeiro vê financeiro e repasses; não vê comunicação', () => {
    const access = selectReportAccess(db.getState(), ctxOf('u-financeiro'));
    expect(access.financial).toBe(true);
    expect(access.payouts).toBe(true);
    expect(access.communication).toBe(false);
  });

  it('profissional: somente os próprios agendamentos e nunca financeiro (limite LGPD)', () => {
    const ctx = ctxOf('u-prof-helena');
    const r = buildReport(db.getState(), ctx, october);
    expect(r.access.ownScope).toBe(true);
    expect(r.finance).toBeNull();
    expect(r.patients).toBeNull();
    expect(r.appointments.byProfessional.every((x) => x.id === 'prof-helena')).toBe(true);
    expect(r.professionals.map((p) => p.id)).toEqual(['prof-helena']);
  });

  it('exportar lançamentos sem permissão não devolve linhas', () => {
    const def = REPORT_LIBRARY.find((x) => x.id === 'lancamentos')!;
    expect(def.build(db.getState(), ctxOf('u-recepcao'), october).rows).toHaveLength(0);
    expect(def.build(db.getState(), ctxOf('u-financeiro'), october).rows.length).toBeGreaterThan(0);
  });
});

describe('CSV', () => {
  it('escapa separador, aspas, quebras de linha e fórmulas', () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('-1234,50')).toBe('-1234,50');
    expect(toCsv({ headers: ['A', 'B'], rows: [[1, null]] })).toBe('﻿A;B\r\n1;\r\n');
  });

  it('exportações não trazem telefone, e-mail ou conteúdo clínico', () => {
    const s = db.getState();
    const ctx = ctxOf('u-admin');
    const text = REPORT_LIBRARY.map((d) => toCsv(d.build(s, ctx, october))).join('\n');
    for (const p of s.patients) {
      expect(text).not.toContain(p.phone);
      if (p.email) expect(text).not.toContain(p.email);
    }
    for (const cr of s.clinicalRecords) expect(text).not.toContain(cr.summary);
  });
});
