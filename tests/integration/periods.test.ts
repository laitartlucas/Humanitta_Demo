/**
 * Agente 09 — comparativo mensal: mês em andamento compara 1–hoje com os mesmos dias do mês anterior.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { comparablePeriods, comparisonCaption, db, resetDemoData, toAccessContext, type AccessContext } from '@core';
import { buildReport } from '@ds/screens/reports/model';
import { selectDashboard } from '@modules/dashboard/dashboardData';

const month = (from: string, to: string) => ({ from, to });

describe('comparablePeriods (regra única)', () => {
  it('mês em andamento: 1–19/10 × 1–19/09', () => {
    const c = comparablePeriods(month('2026-10-01', '2026-10-31'), '2026-10-19');
    expect(c).toEqual({ current: month('2026-10-01', '2026-10-19'), previous: month('2026-09-01', '2026-09-19'), partial: true });
    expect(comparisonCaption(c)).toBe('1–19 out vs. 1–19 set');
  });

  it('respeita o fim do mês anterior (31/03 → até 28/02; ano bissexto até 29/02)', () => {
    expect(comparablePeriods(month('2026-03-01', '2026-03-31'), '2026-03-30').previous).toEqual(month('2026-02-01', '2026-02-28'));
    expect(comparablePeriods(month('2028-03-01', '2028-03-31'), '2028-03-30').previous).toEqual(month('2028-02-01', '2028-02-29'));
  });

  it('virada de ano: janeiro compara com dezembro do ano anterior', () => {
    expect(comparablePeriods(month('2027-01-01', '2027-01-31'), '2027-01-10').previous).toEqual(month('2026-12-01', '2026-12-10'));
  });

  it('primeiro dia do mês compara só o dia 1', () => {
    const c = comparablePeriods(month('2026-10-01', '2026-10-31'), '2026-10-01');
    expect(c.current).toEqual(month('2026-10-01', '2026-10-01'));
    expect(c.previous).toEqual(month('2026-09-01', '2026-09-01'));
  });

  it('não altera o que já estava correto: mês fechado, último dia e intervalo livre', () => {
    // Mês anterior (fechado): compara com o mês inteiro anterior.
    expect(comparablePeriods(month('2026-09-01', '2026-09-30'), '2026-10-19')).toEqual({
      current: month('2026-09-01', '2026-09-30'), previous: month('2026-08-01', '2026-08-31'), partial: false,
    });
    // Último dia do mês: o mês está completo.
    expect(comparablePeriods(month('2026-10-01', '2026-10-31'), '2026-10-31').partial).toBe(false);
    // Intervalo livre (7 dias): mesmo número de dias imediatamente antes.
    expect(comparablePeriods(month('2026-10-13', '2026-10-19'), '2026-10-19')).toEqual({
      current: month('2026-10-13', '2026-10-19'), previous: month('2026-10-06', '2026-10-12'), partial: false,
    });
  });

  it('vários meses em andamento (ago–out até 19/10) × mai–jul até 19/07', () => {
    const c = comparablePeriods(month('2026-08-01', '2026-10-31'), '2026-10-19');
    expect(c.current).toEqual(month('2026-08-01', '2026-10-19'));
    expect(c.previous).toEqual(month('2026-05-01', '2026-07-19'));
  });
});

describe('módulos usam o intervalo comparável', () => {
  const admin = (): AccessContext => toAccessContext(db.getState().users.find((u) => u.id === 'u-admin')!);
  beforeEach(() => resetDemoData());

  it('Relatórios: variações sobre 1–19/10 × 1–19/09; gráfico mantém setembro inteiro', () => {
    const r = buildReport(db.getState(), admin(), { range: month('2026-10-01', '2026-10-31') }, '2026-10-19');
    expect(r.compared).toEqual(month('2026-10-01', '2026-10-19'));
    expect(r.previous).toEqual(month('2026-09-01', '2026-09-19'));
    expect(r.previousChart).toEqual(month('2026-09-01', '2026-09-30'));
    // Exibição continua sobre o mês selecionado inteiro (inclui consultas futuras já agendadas).
    expect(r.appointments.total).toBeGreaterThanOrEqual(r.appointmentsCompared.total);
    // Base comparável: setembro até o dia 19 tem menos registros que setembro inteiro.
    const fullSep = buildReport(db.getState(), admin(), { range: month('2026-09-01', '2026-09-30') }, '2026-10-19');
    expect(r.appointmentsPrevious.total).toBeLessThan(fullSep.appointments.total);
    expect(r.financePrevious!.revenue).toBeLessThan(fullSep.finance!.revenue);
    expect(r.appointmentsEvolution.previous).toHaveLength(r.appointmentsEvolution.current.length);
  });

  it('Dashboard: filtro "Mês" compara 1–hoje; "Dia" e "Semana" inalterados', () => {
    const ref = new Date(2026, 9, 19, 10, 24);
    const mes = selectDashboard(db.getState(), admin(), 'mes', ref)!;
    expect(mes.comparison.partial).toBe(true);
    expect(mes.previousRange).toEqual(month('2026-09-01', '2026-09-19'));
    expect(mes.comparison.current).toEqual(month('2026-10-01', '2026-10-19'));
    const dia = selectDashboard(db.getState(), admin(), 'dia', ref)!;
    expect(dia.comparison.partial).toBe(false);
    expect(dia.previousRange).toEqual(month('2026-10-12', '2026-10-12'));
    expect(dia.comparedTotal).toBe(dia.appointments.total);
  });
});
