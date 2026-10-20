/**
 * Agente 06 — Financeiro. Cenários obrigatórios sobre o banco compartilhado (semente da demo,
 * "hoje" = 19/10/2026). Cada teste parte da semente original.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError, db, resetDemoData, selectFinanceTotals, selectMyPayouts, toAccessContext, type AccessContext } from '@core';
import {
  canTransition,
  computeTotals,
  createFinanceEntry,
  csvCell,
  deleteFinanceEntry,
  effectiveStatus,
  entriesToCsv,
  filterRows,
  fortnights,
  generatePayout,
  monthRange,
  monthlySeries,
  parseCurrencyInput,
  paymentHistory,
  percentChange,
  previousRange,
  receivableByStatus,
  registerFinancePayment,
  reverseFinanceEntry,
  selectBillableAppointments,
  selectFinanceRows,
  selectPayoutRows,
  selectPayoutStatement,
  updateFinanceEntry,
  type EntryDraft,
} from '@modules/finance/domain';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};
const fin = () => ctxOf('u-financeiro');
const admin = () => ctxOf('u-admin');
const OCT = monthRange('2026-10');

/** Executa e devolve o código do AppError lançado (ou falha se nada for lançado). */
function errorOf(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    if (e instanceof AppError) return e;
    throw e;
  }
  throw new Error('era esperado um AppError');
}

const receita = (over: Partial<EntryDraft> = {}): EntryDraft => ({
  type: 'receita',
  description: 'Consulta demonstrativa',
  category: 'Consulta',
  amountCents: 25_050,
  date: '2026-10-18',
  dueDate: '2026-10-25',
  method: 'pix',
  status: 'pendente',
  patientId: 'pac-01',
  professionalId: 'prof-lauren',
  ...over,
});

const despesa = (over: Partial<EntryDraft> = {}): EntryDraft => ({
  type: 'despesa',
  description: 'Compra de luvas descartáveis',
  category: 'Materiais clínicos',
  amountCents: 31_990,
  date: '2026-10-17',
  dueDate: '2026-10-27',
  method: 'boleto',
  status: 'pendente',
  ...over,
});

const rows = () => selectFinanceRows(db.getState(), fin());

beforeEach(() => resetDemoData());

describe('receitas', () => {
  it('1. lista as receitas da semente para o financeiro', () => {
    const list = filterRows(rows(), { types: ['receita'] });
    expect(list).toHaveLength(14);
    expect(list.every((e) => e.type === 'receita')).toBe(true);
    // Ordenação padrão: mais recentes primeiro.
    expect(list[0].date >= list[list.length - 1].date).toBe(true);
  });

  it('2. cadastra receita com valor em centavos e vínculos por ID', () => {
    const e = createFinanceEntry(fin(), receita());
    expect(e.id).toMatch(/^fe-/);
    expect(e.amount).toBe(250.5);
    expect(e.patientName).toBe(db.getState().patients.find((p) => p.id === 'pac-01')?.name);
    expect(e.professionalName).toBe('Dra. Lauren Bertocchi');
    expect(db.getState().financialEntries.some((x) => x.id === e.id)).toBe(true);
  });

  it('3. edita receita em aberto e mantém nomes sincronizados', () => {
    const e = createFinanceEntry(fin(), receita());
    const u = updateFinanceEntry(fin(), e.id, { ...receita(), description: 'Consulta de retorno', amountCents: 30_000, patientId: 'pac-03' });
    expect(u.id).toBe(e.id);
    expect(u.amount).toBe(300);
    expect(u.description).toBe('Consulta de retorno');
    expect(u.patientName).toBe(db.getState().patients.find((p) => p.id === 'pac-03')?.name);
  });

  it('4. registra recebimento e abate o saldo do paciente', () => {
    const before = db.getState().patients.find((p) => p.id === 'pac-04')!;
    // fe-003: pacote de fisioterapia de Eduardo Rech, pendente.
    const entry = db.getState().financialEntries.find((e) => e.id === 'fe-003')!;
    const paid = registerFinancePayment(fin(), 'fe-003', { amountCents: 145_000, method: 'cartao_credito', paidAt: '2026-10-19' });
    expect(paid.status).toBe('pago');
    expect(paid.paidAt).toBe('2026-10-19');
    expect(paid.method).toBe('cartao_credito');
    const after = db.getState().patients.find((p) => p.id === entry.patientId)!;
    if (entry.patientId === before.id) expect(after.balance).toBe(Math.max(0, before.balance - 1450));
    expect(paymentHistory(rows())[0].id).toBe('fe-003');
  });

  it('5. impede pagamento duplicado do mesmo lançamento', () => {
    const p = { amountCents: 145_000, method: 'pix' as const, paidAt: '2026-10-19' };
    registerFinancePayment(fin(), 'fe-003', p);
    expect(errorOf(() => registerFinancePayment(fin(), 'fe-003', p)).code).toBe('CONFLICT');
    expect(db.getState().financialEntries.filter((e) => e.id === 'fe-003')).toHaveLength(1);
  });

  it('estorno/cancelamento mantém o registro e bloqueia nova baixa', () => {
    const r = reverseFinanceEntry(fin(), 'fe-001');
    expect(r.status).toBe('estornado');
    expect(errorOf(() => reverseFinanceEntry(fin(), 'fe-001')).code).toBe('CONFLICT');
    expect(errorOf(() => registerFinancePayment(fin(), 'fe-001', { amountCents: 28_000, method: 'pix', paidAt: '2026-10-19' })).code).toBe('CONFLICT');
    expect(errorOf(() => updateFinanceEntry(fin(), 'fe-001', receita())).code).toBe('CONFLICT');
  });

  it('não exclui lançamento pago; exclui lançamento em aberto', () => {
    expect(errorOf(() => deleteFinanceEntry(fin(), 'fe-001')).code).toBe('CONFLICT');
    deleteFinanceEntry(fin(), 'fe-013');
    expect(db.getState().financialEntries.some((e) => e.id === 'fe-013')).toBe(false);
  });
});

describe('despesas', () => {
  it('6. cadastra despesa sem vínculo com paciente', () => {
    const e = createFinanceEntry(fin(), despesa());
    expect(e.type).toBe('despesa');
    expect(e.patientId).toBeUndefined();
    expect(errorOf(() => createFinanceEntry(fin(), despesa({ description: 'Outra', patientId: 'pac-01' }))).code).toBe('VALIDATION');
  });

  it('7. edita despesa (categoria e vencimento)', () => {
    const e = createFinanceEntry(fin(), despesa());
    const u = updateFinanceEntry(fin(), e.id, { ...despesa(), category: 'Limpeza', dueDate: '2026-10-30' });
    expect(u.category).toBe('Limpeza');
    expect(u.dueDate).toBe('2026-10-30');
  });

  it('8. registra pagamento de despesa', () => {
    const p = registerFinancePayment(fin(), 'fe-102', { amountCents: 81_240, method: 'boleto', paidAt: '2026-10-19' });
    expect(p.status).toBe('pago');
    expect(computeTotals(rows(), OCT).expenses).toBeCloseTo(4800 + 1936.9 + 950 + 349 + 600 + 812.4, 2);
  });
});

describe('filtros e indicadores', () => {
  it('9. filtra por período (competência)', () => {
    const list = filterRows(rows(), { range: { from: '2026-10-14', to: '2026-10-16' } });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((e) => e.date >= '2026-10-14' && e.date <= '2026-10-16')).toBe(true);
    expect(filterRows(rows(), { range: monthRange('2026-09') })).toHaveLength(0);
  });

  it('10. filtra por situação efetiva (pendente vencido conta como atrasado)', () => {
    const e = createFinanceEntry(fin(), receita({ description: 'Sessão antiga', date: '2026-10-01', dueDate: '2026-10-05' }));
    expect(effectiveStatus(e, '2026-10-19')).toBe('atrasado');
    const overdue = filterRows(rows(), { status: 'atrasado' });
    expect(overdue.some((x) => x.id === e.id)).toBe(true);
    expect(filterRows(rows(), { status: 'pendente' }).some((x) => x.id === e.id)).toBe(false);
    expect(filterRows(rows(), { status: 'estornado' }).map((x) => x.id)).toEqual(['fe-010']);
  });

  it('filtra por categoria, profissional, forma, busca sem acento e ordena por valor', () => {
    expect(filterRows(rows(), { category: 'Aluguel' }).map((e) => e.id)).toEqual(['fe-101']);
    expect(filterRows(rows(), { professionalId: 'prof-lauren', types: ['receita'] }).every((e) => e.professionalId === 'prof-lauren')).toBe(true);
    expect(filterRows(rows(), { method: 'dinheiro' }).map((e) => e.id)).toEqual(['fe-005']);
    expect(filterRows(rows(), { query: 'fonoterapia' }).map((e) => e.id)).toEqual(['fe-002']);
    expect(filterRows(rows(), { query: 'ESTETICA' }).length).toBeGreaterThan(0);
    const byValue = filterRows(rows(), { sort: 'valor_desc' });
    expect(byValue[0].id).toBe('fe-101');
  });

  it('11. indicadores mudam quando um lançamento é pago', () => {
    const before = computeTotals(rows(), OCT);
    registerFinancePayment(fin(), 'fe-003', { amountCents: 145_000, method: 'pix', paidAt: '2026-10-19' });
    const after = computeTotals(rows(), OCT);
    expect(after.revenue - before.revenue).toBeCloseTo(1450, 2);
    expect(before.receivable - after.receivable).toBeCloseTo(1450, 2);
    expect(after.paymentsCount).toBe(before.paymentsCount + 1);
  });

  it('12. resultado = receitas − despesas − repasses, igual ao core (Dashboard/Relatórios)', () => {
    const t = computeTotals(rows(), OCT);
    const core = selectFinanceTotals(db.getState(), fin(), '2026-10');
    expect(t.revenue).toBeCloseTo(core.revenue, 2);
    expect(t.expenses).toBeCloseTo(core.expenses, 2);
    expect(t.payouts).toBeCloseTo(core.payouts, 2);
    expect(t.balance).toBeCloseTo(core.balance, 2);
    expect(t.receivable).toBeCloseTo(core.receivable, 2);
    expect(t.balance).toBeCloseTo(t.revenue - t.expenses - t.payouts, 2);
    // Receitas pagas da semente (outubro): 280+190+220+180+260+150+820+230.
    expect(t.revenue).toBeCloseTo(2330, 2);
    expect(t.overdueReceivable).toBeCloseTo(690 + 240, 2);
  });

  it('séries, comparativo e situação dos recebimentos vêm dos registros', () => {
    const series = monthlySeries(rows(), '2026-10', 12);
    expect(series).toHaveLength(12);
    expect(series[11].revenue).toBeCloseTo(2330, 2);
    expect(series[10].revenue).toBe(0);
    expect(previousRange(OCT)).toEqual(monthRange('2026-09'));
    expect(previousRange({ from: '2026-10-10', to: '2026-10-19' })).toEqual({ from: '2026-09-30', to: '2026-10-09' });
    expect(percentChange(120, 100)).toBeCloseTo(20, 5);
    expect(percentChange(50, 0)).toBeNull();
    const status = receivableByStatus(rows(), OCT);
    expect(status.find((s) => s.key === 'estornado')?.value).toBe(340);
  });
});

describe('repasses e permissões', () => {
  it('13. apura repasses do período pela regra demonstrativa', () => {
    const q1 = fortnights('2026-10-19', 2)[1];
    expect(q1.range).toEqual({ from: '2026-10-01', to: '2026-10-15' });
    const lines = selectPayoutStatement(db.getState(), fin(), q1.range);
    expect(lines).toHaveLength(8);
    const marina = lines.find((l) => l.professionalId === 'prof-marina')!;
    expect(marina.base).toBe(820);
    expect(marina.calculated).toBe(328);
    expect(marina.existing?.id).toBe('fe-204');
  });

  it('gera repasse só para período fechado e nunca em duplicidade', () => {
    const [current, q1] = fortnights('2026-10-19', 2);
    // Cobra um atendimento da Dra. Lauren na 1ª quinzena para formar a base.
    createFinanceEntry(fin(), receita({ appointmentId: 'pl-h07', description: 'Manutenção ortodôntica', amountCents: 38_000, date: '2026-10-14', dueDate: '2026-10-14', status: 'pago' }));
    const req = { professionalId: 'prof-lauren', period: q1.range, periodLabel: q1.label };
    const payout = generatePayout(fin(), req);
    expect(payout.type).toBe('repasse');
    expect(payout.amount).toBe(152);
    expect(payout.date).toBe('2026-10-15');
    expect(errorOf(() => generatePayout(fin(), req)).code).toBe('CONFLICT');
    expect(errorOf(() => generatePayout(fin(), { ...req, period: current.range, periodLabel: current.label })).code).toBe('CONFLICT');
    expect(errorOf(() => generatePayout(ctxOf('u-recepcao'), req)).code).toBe('FORBIDDEN');
  });

  it('14. profissional vê somente os próprios repasses e nunca a base da clínica', () => {
    const helena = ctxOf('u-prof-helena');
    const own = selectPayoutRows(db.getState(), helena);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((e) => e.professionalId === 'prof-helena')).toBe(true);
    expect(own.map((e) => e.id).sort()).toEqual(selectMyPayouts(db.getState(), helena).map((e) => e.id).sort());
    const lines = selectPayoutStatement(db.getState(), helena, fortnights('2026-10-19', 2)[1].range);
    expect(lines.map((l) => l.professionalId)).toEqual(['prof-helena']);
    expect(lines[0].base).toBeNull();
    expect(selectPayoutRows(db.getState(), ctxOf('u-prof-lauren')).some((e) => e.professionalId === 'prof-helena')).toBe(false);
  });

  it('15. recepção e profissional não acessam nem alteram o financeiro geral', () => {
    for (const id of ['u-recepcao', 'u-prof-lauren']) {
      const ctx = ctxOf(id);
      expect(selectFinanceRows(db.getState(), ctx)).toEqual([]);
      expect(selectBillableAppointments(db.getState(), ctx)).toEqual([]);
      expect(errorOf(() => createFinanceEntry(ctx, receita())).code).toBe('FORBIDDEN');
      expect(errorOf(() => registerFinancePayment(ctx, 'fe-003', { amountCents: 145_000, method: 'pix', paidAt: '2026-10-19' })).code).toBe('FORBIDDEN');
      expect(errorOf(() => reverseFinanceEntry(ctx, 'fe-001')).code).toBe('FORBIDDEN');
      expect(errorOf(() => updateFinanceEntry(ctx, 'fe-003', receita())).code).toBe('FORBIDDEN');
      // Lançamento inexistente também responde 403 (não revela existência).
      expect(errorOf(() => updateFinanceEntry(ctx, 'fe-nao-existe', receita())).code).toBe('FORBIDDEN');
    }
    expect(selectFinanceRows(db.getState(), admin()).length).toBe(db.getState().financialEntries.length);
  });

  it('respeita ajuste da matriz: financeiro rebaixado para "ver" não escreve', () => {
    db.setState((s) => ({ ...s, clinicSettings: { ...s.clinicSettings, permissionOverrides: { financeiro: { financeiro: 'ver', repasses: 'ver' } } } }));
    expect(rows().length).toBeGreaterThan(0);
    expect(errorOf(() => createFinanceEntry(fin(), receita())).code).toBe('FORBIDDEN');
  });
});

describe('exportação, atendimentos, duplicidade e validação', () => {
  it('17. exporta CSV só com os registros filtrados e campos administrativos', () => {
    const filtered = filterRows(rows(), { types: ['despesa'], range: OCT });
    const csv = entriesToCsv(filtered);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toContain('Descrição');
    expect(lines).toHaveLength(filtered.length + 1);
    expect(csv).not.toMatch(/CPF|e-mail|prontu/i);
    expect(csv).toContain('4800,00');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(entriesToCsv([])).toBe('﻿Data;Tipo;Descrição;Categoria;Paciente;Profissional;Vencimento;Pagamento;Forma;Situação;Valor (R$)\r\n');
  });

  it('18. vincula receita a atendimento concluído e bloqueia segunda cobrança', () => {
    const billable = selectBillableAppointments(db.getState(), fin());
    expect(billable.some((a) => a.id === 'pl-h07')).toBe(true);
    // Paciente/profissional vêm do agendamento, mesmo que o formulário mande outros.
    const e = createFinanceEntry(fin(), receita({ appointmentId: 'pl-h07', patientId: 'pac-09', professionalId: 'prof-helena' }));
    const appt = db.getState().appointments.find((a) => a.id === 'pl-h07')!;
    expect(e.appointmentId).toBe('pl-h07');
    expect(e.patientId).toBe(appt.patientId);
    expect(e.professionalId).toBe(appt.professionalId);
    expect(selectBillableAppointments(db.getState(), fin()).some((a) => a.id === 'pl-h07')).toBe(false);
    const dup = errorOf(() => createFinanceEntry(fin(), receita({ appointmentId: 'pl-h07', description: 'Outra cobrança' })));
    expect(dup.fields?.appointmentId).toBeDefined();
    // Atendimento não concluído não pode ser cobrado.
    const future = db.getState().appointments.find((a) => a.status === 'agendada')!;
    expect(errorOf(() => createFinanceEntry(fin(), receita({ appointmentId: future.id }))).fields?.appointmentId).toBeDefined();
    // Estornada a cobrança, o atendimento volta a ser cobrável.
    reverseFinanceEntry(fin(), e.id);
    expect(selectBillableAppointments(db.getState(), fin()).some((a) => a.id === 'pl-h07')).toBe(true);
  });

  it('19. impede lançamento duplicado idêntico', () => {
    createFinanceEntry(fin(), despesa());
    expect(errorOf(() => createFinanceEntry(fin(), despesa())).code).toBe('CONFLICT');
    expect(createFinanceEntry(fin(), despesa({ amountCents: 32_000 })).amount).toBe(320);
  });

  it('20. valida valores e datas', () => {
    const v = (d: EntryDraft) => errorOf(() => createFinanceEntry(fin(), d)).fields ?? {};
    expect(v(receita({ amountCents: 0 })).amount).toBeDefined();
    expect(v(receita({ amountCents: -100 })).amount).toBeDefined();
    expect(v(receita({ amountCents: 10.5 })).amount).toBeDefined();
    expect(v(receita({ amountCents: 100_000_001 })).amount).toBeDefined();
    expect(v(receita({ date: '2026-02-30' })).date).toBeDefined();
    expect(v(receita({ dueDate: '2026-10-01' })).dueDate).toBeDefined();
    expect(v(receita({ status: 'pago', date: '2026-10-25', dueDate: '2026-10-25' })).date).toBeDefined();
    expect(v(receita({ category: 'Categoria inventada' })).category).toBeDefined();
    expect(v(receita({ description: '  ' })).description).toBeDefined();
    expect(v({ ...despesa(), type: 'repasse', category: 'Repasse profissional' }).professionalId).toBeDefined();

    const pay = (amountCents: number, paidAt = '2026-10-19') =>
      errorOf(() => registerFinancePayment(fin(), 'fe-003', { amountCents, method: 'pix', paidAt })).fields ?? {};
    expect(pay(100_000).amount).toMatch(/igual ao valor em aberto/);
    expect(pay(145_000, '2026-10-20').paidAt).toBeDefined();
    expect(pay(145_000, '19/10/2026').paidAt).toBeDefined();
    expect(errorOf(() => registerFinancePayment(fin(), 'fe-inexistente', { amountCents: 100, method: 'pix', paidAt: '2026-10-19' })).code).toBe('NOT_FOUND');

    expect(parseCurrencyInput('1.234,56')).toBe(123_456);
    expect(parseCurrencyInput('R$ 80')).toBe(8_000);
    expect(parseCurrencyInput('0,1')).toBe(10);
    expect(parseCurrencyInput('1234.5')).toBe(123_450);
    expect(parseCurrencyInput('1.234')).toBe(123_400);
    expect(parseCurrencyInput('12,345')).toBeNull();
    expect(parseCurrencyInput('-5')).toBeNull();
    expect(parseCurrencyInput('abc')).toBeNull();
    // Soma em centavos não acumula erro de ponto flutuante.
    expect(computeTotals([], OCT).balance).toBe(0);
  });

  it('transições de status permitidas', () => {
    expect(canTransition('pendente', 'pagar')).toBe(true);
    expect(canTransition('atrasado', 'pagar')).toBe(true);
    expect(canTransition('pago', 'pagar')).toBe(false);
    expect(canTransition('pago', 'editar')).toBe(false);
    expect(canTransition('pago', 'estornar')).toBe(true);
    expect(canTransition('estornado', 'estornar')).toBe(false);
    expect(canTransition('estornado', 'excluir')).toBe(false);
  });
});
