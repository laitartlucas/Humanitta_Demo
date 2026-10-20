/**
 * Agente 01 — Dashboard. Garante que os indicadores saem do banco compartilhado,
 * respeitam o perfil e reagem às escritas de Agenda, Pacientes e Financeiro.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appointmentService,
  db,
  financeService,
  now,
  patientService,
  resetDemoData,
  selectDayOverview,
  selectFinanceTotals,
  toAccessContext,
  type AccessContext,
} from '@core';
import {
  computeOccupancy,
  periodRange,
  previousPeriodRange,
  selectDashboard,
  type DashboardData,
  type DashboardPeriod,
} from '@modules/dashboard/dashboardData';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};

const dash = (userId: string, period: DashboardPeriod = 'dia'): DashboardData => {
  const data = selectDashboard(db.getState(), ctxOf(userId), period, now());
  if (!data) throw new Error(`dashboard indisponível para ${userId}`);
  return data;
};

beforeEach(() => resetDemoData());

describe('períodos', () => {
  const ref = new Date(2026, 9, 19, 10, 24); // segunda-feira

  it('dia, semana (seg–dom) e mês', () => {
    expect(periodRange('dia', ref)).toEqual({ from: '2026-10-19', to: '2026-10-19' });
    expect(periodRange('semana', ref)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(periodRange('mes', ref)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('período anterior equivalente', () => {
    expect(previousPeriodRange('dia', ref)).toEqual({ from: '2026-10-12', to: '2026-10-12' });
    expect(previousPeriodRange('semana', ref)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(previousPeriodRange('mes', ref)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });
});

describe('indicadores a partir do core', () => {
  it('consultas do dia seguem a mesma regra do selectDayOverview', () => {
    const ctx = ctxOf('u-admin');
    const overview = selectDayOverview(db.getState(), ctx);
    const { appointments } = dash('u-admin');
    expect(appointments.total).toBe(overview.total);
    expect(appointments.confirmed).toBe(overview.confirmed);
    expect(appointments.cancelled).toBe(overview.cancelled);
    expect(appointments.total).toBeGreaterThan(0);
    expect(appointments.pending).toBeGreaterThan(0);
  });

  it('faturamento mensal bate com selectFinanceTotals (fonte única)', () => {
    const ctx = ctxOf('u-admin');
    const data = dash('u-admin', 'mes');
    const totals = selectFinanceTotals(db.getState(), ctx, '2026-10');
    expect(data.revenue?.value).toBe(totals.revenue);
    expect(data.revenueSeries).toHaveLength(12);
    expect(data.revenueSeries?.[11]).toMatchObject({ monthKey: '2026-10', value: totals.revenue });
  });

  it('ocupação usa salas ativas e horário de funcionamento da clínica', () => {
    const s = db.getState();
    const occ = computeOccupancy(s, [], { from: '2026-10-19', to: '2026-10-19' });
    const rooms = s.rooms.filter((r) => r.active).length;
    expect(occ.rooms).toBe(rooms);
    expect(occ.capacityMin).toBe(rooms * (10 * 60 - 90)); // 08–18h menos 1h30 de almoço
    const data = dash('u-admin');
    expect(data.occupancy.rate).toBeGreaterThan(0);
    expect(data.occupancy.rate).toBeLessThanOrEqual(100);
    // Domingo fechado: sem capacidade.
    expect(computeOccupancy(s, [], { from: '2026-10-25', to: '2026-10-25' }).capacityMin).toBe(0);
  });

  it('especialidades e próximos atendimentos vêm da agenda do período', () => {
    const data = dash('u-admin', 'semana');
    const total = data.bySpecialty.reduce((t, s) => t + s.value, 0);
    expect(total).toBe(data.appointments.total);
    expect(data.upcoming.length).toBeGreaterThan(0);
    expect(data.upcoming.length).toBeLessThanOrEqual(6);
    const nowMs = now().getTime();
    for (const a of data.upcoming) {
      expect(['agendada', 'confirmada', 'em_atendimento']).toContain(a.status);
      expect(new Date(a.start).getTime() + a.durationMin * 60000).toBeGreaterThanOrEqual(nowMs);
      expect(a.roomName).toMatch(/^Sala/);
    }
  });
});

describe('perfis de acesso', () => {
  it('administrador e financeiro veem o faturamento', () => {
    expect(dash('u-admin').revenue).not.toBeNull();
    expect(dash('u-financeiro').revenue).not.toBeNull();
  });

  it('recepção NÃO vê faturamento nem gráfico financeiro', () => {
    const data = dash('u-recepcao');
    expect(data.revenue).toBeNull();
    expect(data.revenueSeries).toBeNull();
    expect(data.appointments.total).toBeGreaterThan(0);
  });

  it('profissional não acessa o Dashboard administrativo', () => {
    expect(selectDashboard(db.getState(), ctxOf('u-prof-lauren'), 'dia', now())).toBeNull();
    expect(selectDashboard(db.getState(), ctxOf('u-prof-helena'), 'mes', now())).toBeNull();
  });

  it('nenhum dado clínico sensível chega ao Dashboard', () => {
    const summaries = db.getState().clinicalRecords.map((r) => r.summary);
    expect(summaries.length).toBeGreaterThan(0);
    for (const user of ['u-admin', 'u-recepcao', 'u-financeiro']) {
      const json = JSON.stringify(dash(user, 'mes'));
      for (const s of summaries) expect(json).not.toContain(s);
    }
  });
});

describe('reage às escritas dos outros módulos', () => {
  it('novo agendamento (Agenda) entra nos indicadores e no feed', () => {
    const before = dash('u-admin');
    const created = appointmentService.createAppointment(ctxOf('u-recepcao'), {
      patientId: 'pac-01',
      professionalId: 'prof-lauren',
      service: 'Avaliação ortodôntica',
      start: '2026-10-19T17:20:00',
      durationMin: 30,
      roomId: 'sala-1',
    });
    const after = dash('u-admin');
    expect(after.appointments.total).toBe(before.appointments.total + 1);
    expect(after.appointments.pending).toBe(before.appointments.pending + 1);
    expect(after.activity[0].what).toContain('agendou');

    appointmentService.cancelAppointment(ctxOf('u-recepcao'), created.id, 'Paciente pediu');
    const cancelled = dash('u-admin');
    expect(cancelled.appointments.cancelled).toBe(before.appointments.cancelled + 1);
    expect(cancelled.appointments.total).toBe(before.appointments.total);
  });

  it('novo paciente (Pacientes) atualiza o total de cadastrados', () => {
    const before = dash('u-admin', 'mes');
    patientService.createPatient(ctxOf('u-recepcao'), {
      name: 'Paciente Demonstração',
      birthDate: '1990-01-01',
      phone: '(54) 99999-0000',
      city: 'Ronda Alta',
    });
    const after = dash('u-admin', 'mes');
    expect(after.patients?.total).toBe((before.patients?.total ?? 0) + 1);
    expect(after.patients?.newInPeriod).toBe((before.patients?.newInPeriod ?? 0) + 1);
  });

  it('pagamento registrado (Financeiro) aumenta o faturamento do mês', () => {
    const pending = db.getState().financialEntries.find((e) => e.type === 'receita' && e.status === 'pendente');
    if (!pending) throw new Error('semente sem receita pendente');
    const before = dash('u-financeiro', 'mes');
    financeService.registerPayment(ctxOf('u-financeiro'), pending.id, 'pix', '2026-10-19');
    const after = dash('u-financeiro', 'mes');
    expect(after.revenue?.value).toBe((before.revenue?.value ?? 0) + pending.amount);
    expect(after.revenueSeries?.[11]?.value).toBe(after.revenue?.value);
  });

  it('recepção não registra pagamento (403) e o faturamento não muda', () => {
    const pending = db.getState().financialEntries.find((e) => e.type === 'receita' && e.status === 'pendente');
    if (!pending) throw new Error('semente sem receita pendente');
    const before = dash('u-admin', 'mes');
    expect(() => financeService.registerPayment(ctxOf('u-recepcao'), pending.id, 'pix')).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    expect(dash('u-admin', 'mes').revenue?.value).toBe(before.revenue?.value);
  });
});
