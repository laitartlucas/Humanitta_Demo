/**
 * Agente 05 — Atendimentos: fluxo (agendado → na recepção → em andamento → concluído), escopo por
 * profissional, limites de LGPD por perfil e vínculos com agenda/financeiro.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError, db, resetDemoData, selectClinicalRecords, toAccessContext, type AccessContext } from '@core';
import {
  attendanceFlow,
  composeDemoNote,
  computeIndicators,
  emptyDemoNote,
  filterAttendances,
  matchesGroup,
  parseDemoNote,
  selectAttendanceView,
  selectAttendanceViews,
  selectUnbilledFinishedAttendances,
  sortAttendances,
  validateDemoNote,
  type DemoNote,
} from '@modules/attendances';

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

/** Captura o código do AppError lançado. */
function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? e.code : 'NOT_APP_ERROR';
  }
  return undefined;
}

const note = (patch: Partial<DemoNote> = {}): DemoNote => ({ ...emptyDemoNote(), motivo: 'Retorno de acompanhamento (fictício)', ...patch });
const view = (ctx: AccessContext, id: string) => selectAttendanceView(db.getState(), ctx, id);

beforeEach(() => resetDemoData());

describe('listagem e filtros', () => {
  it('1. lista os atendimentos do dia com vínculo ao agendamento original', () => {
    const today = filterAttendances(selectAttendanceViews(db.getState(), recepcao()), { dateKey: '2026-10-19' });
    expect(today.length).toBe(17); // 12 da clínica + 5 extras da Dra. Lauren (pl-*)
    for (const v of today) {
      expect(db.getState().appointments.some((a) => a.id === v.appointment.id)).toBe(true);
      if (v.attendance) expect(v.attendance.appointmentId).toBe(v.id);
    }
    const ind = computeIndicators(today);
    expect(ind).toMatchObject({ done: 3, inProgress: 1, waiting: 0 });
    expect(ind.total).toBe(16); // ag-109 cancelada não conta
    expect(ind.pending).toBe(12);
  });

  it('2. filtra por profissional e ordena', () => {
    const all = selectAttendanceViews(db.getState(), admin());
    const onlyHelena = filterAttendances(all, { professionalId: 'prof-helena', dateKey: '2026-10-19' });
    expect(onlyHelena.map((v) => v.id).sort()).toEqual(['ag-102', 'ag-104']);
    const sorted = sortAttendances(onlyHelena, 'horario_desc');
    expect(sorted[0].id).toBe('ag-104');
    expect(filterAttendances(all, { query: 'carla meneg' }).every((v) => v.patient.id === 'pac-01')).toBe(true);
  });

  it('3. filtra por status (grupos de etapa)', () => {
    const today = filterAttendances(selectAttendanceViews(db.getState(), admin()), { dateKey: '2026-10-19' });
    expect(today.filter((v) => matchesGroup(v, 'em_atendimento')).map((v) => v.id)).toEqual(['pl-101']);
    expect(today.filter((v) => matchesGroup(v, 'cancelados')).map((v) => v.id)).toEqual(['ag-109']);
    expect(today.filter((v) => matchesGroup(v, 'finalizados')).length).toBe(3);
  });

  it('4. detalhes trazem paciente, profissional, sala e duração pelos relacionamentos', () => {
    const v = view(admin(), 'ag-101');
    expect(v).toBeDefined();
    expect(v?.patient.name).toBe(db.getState().patients.find((p) => p.id === 'pac-12')?.name);
    expect(v?.patient.city).toBeTruthy();
    expect(v?.professionalName).toBe(db.getState().professionals.find((p) => p.id === 'prof-lauren')?.name);
    expect(v?.roomName).toMatch(/^Sala/);
    expect(v?.realDurationMin).toBe(40);
  });
});

describe('fluxo de atendimento', () => {
  it('5–8. profissional responsável inicia e conclui uma única vez, com marcos e status coerentes', () => {
    const ctx = helena();
    const started = attendanceFlow.beginAttendance(ctx, 'ag-104');
    expect(started).toMatchObject({ id: 'at-ag-104', appointmentId: 'ag-104', status: 'em_andamento' });
    expect(started.startedAt).toBe('2026-10-19T10:24:00');
    expect(db.getState().appointments.find((a) => a.id === 'ag-104')?.status).toBe('em_atendimento');

    // 6. início duplicado
    expect(codeOf(() => attendanceFlow.beginAttendance(ctx, 'ag-104'))).toBe('CONFLICT');

    // 7. conclusão com registro demonstrativo
    const done = attendanceFlow.completeAttendance(ctx, 'ag-104', { note: note(), fictitiousConfirmed: true });
    expect(done).toMatchObject({ status: 'finalizado', finishedAt: '2026-10-19T10:24:00' });
    expect(db.getState().appointments.find((a) => a.id === 'ag-104')?.status).toBe('concluida');
    expect(view(ctx, 'ag-104')?.stage).toBe('concluido');

    // 8. conclusão duplicada
    expect(codeOf(() => attendanceFlow.completeAttendance(ctx, 'ag-104'))).toBe('CONFLICT');
    expect(db.getState().attendances.filter((a) => a.appointmentId === 'ag-104').length).toBe(1);
  });

  it('não conclui sem iniciar e não inicia com outro atendimento em andamento', () => {
    expect(codeOf(() => attendanceFlow.completeAttendance(helena(), 'ag-104'))).toBe('CONFLICT');
    // Dra. Lauren já está atendendo pl-101.
    expect(codeOf(() => attendanceFlow.beginAttendance(lauren(), 'ag-111'))).toBe('CONFLICT');
  });

  it('recepção registra chegada (uma vez) mas não inicia nem conclui', () => {
    const at = attendanceFlow.registerArrival(recepcao(), 'ag-105');
    expect(at.checkInAt).toBe('2026-10-19T10:24:00');
    expect(view(recepcao(), 'ag-105')?.stage).toBe('na_recepcao');
    expect(codeOf(() => attendanceFlow.registerArrival(recepcao(), 'ag-105'))).toBe('CONFLICT');
    expect(codeOf(() => attendanceFlow.beginAttendance(recepcao(), 'ag-105'))).toBe('FORBIDDEN');
    expect(codeOf(() => attendanceFlow.beginAttendance(admin(), 'ag-105'))).toBe('FORBIDDEN');
    expect(codeOf(() => attendanceFlow.completeAttendance(admin(), 'pl-101'))).toBe('FORBIDDEN');
    expect(db.getState().appointments.find((a) => a.id === 'ag-105')?.status).toBe('confirmada');
  });

  it('bloqueia transições inválidas de falta, check-in e datas', () => {
    expect(codeOf(() => attendanceFlow.registerNoShow(recepcao(), 'ag-101'))).toBe('CONFLICT'); // concluída
    expect(codeOf(() => attendanceFlow.registerNoShow(recepcao(), 'ag-109'))).toBe('CONFLICT'); // cancelada
    expect(codeOf(() => attendanceFlow.registerArrival(recepcao(), 'pl-101'))).toBe('CONFLICT'); // em andamento
    const future = db.getState().appointments.find((a) => a.start.startsWith('2026-10-22') && a.status !== 'cancelada' && a.professionalId === 'prof-helena');
    if (future) {
      expect(codeOf(() => attendanceFlow.registerArrival(recepcao(), future.id))).toBe('CONFLICT');
      expect(codeOf(() => attendanceFlow.beginAttendance(helena(), future.id))).toBe('CONFLICT');
      expect(codeOf(() => attendanceFlow.registerNoShow(recepcao(), future.id))).toBe('CONFLICT');
    }
    const at = attendanceFlow.registerNoShow(recepcao(), 'ag-106');
    expect(at.status).toBe('faltou');
    expect(db.getState().appointments.find((a) => a.id === 'ag-106')?.status).toBe('faltou');
    expect(codeOf(() => attendanceFlow.beginAttendance(ctxOf('u-prof-marina'), 'ag-106'))).toBe('CONFLICT');
  });

  it('financeiro não altera o fluxo', () => {
    expect(codeOf(() => attendanceFlow.registerArrival(financeiro(), 'ag-105'))).toBe('FORBIDDEN');
    expect(codeOf(() => attendanceFlow.registerNoShow(financeiro(), 'ag-105'))).toBe('FORBIDDEN');
  });
});

describe('privacidade e LGPD', () => {
  it('9. profissional consulta o próprio histórico e registros', () => {
    const mine = selectAttendanceViews(db.getState(), lauren());
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((v) => v.professionalId === 'prof-lauren')).toBe(true);
    expect(mine.every((v) => v.price === null)).toBe(true); // portal nunca vê preço
    const records = selectClinicalRecords(db.getState(), lauren());
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((r) => r.professionalId === 'prof-lauren')).toBe(true);
  });

  it('10. impede acesso a atendimentos e registros de outro profissional', () => {
    expect(view(helena(), 'pl-101')).toBeUndefined();
    expect(selectClinicalRecords(db.getState(), helena()).some((r) => r.professionalId === 'prof-lauren')).toBe(false);
    expect(codeOf(() => attendanceFlow.saveDemoRecord(helena(), 'pl-101', note(), true))).toBe('NOT_FOUND');
    expect(codeOf(() => attendanceFlow.completeAttendance(helena(), 'pl-101'))).toBe('NOT_FOUND');
    expect(codeOf(() => attendanceFlow.saveDemoRecord(lauren(), 'pl-101', note(), true))).toBeUndefined();
  });

  it('11–12. recepção, financeiro e administração não recebem registros clínicos', () => {
    attendanceFlow.saveDemoRecord(lauren(), 'pl-101', note(), true);
    for (const ctx of [recepcao(), financeiro(), admin()]) {
      expect(selectClinicalRecords(db.getState(), ctx)).toEqual([]);
      expect(codeOf(() => attendanceFlow.saveDemoRecord(ctx, 'pl-101', note(), true))).toBe('FORBIDDEN');
      const v = view(ctx, 'pl-101');
      expect(JSON.stringify(v)).not.toContain('Retorno de acompanhamento');
    }
  });

  it('dados administrativos do paciente respeitam o perfil', () => {
    expect(view(recepcao(), 'pl-101')?.patient.city).toBeTruthy();
    const own = view(lauren(), 'pl-101');
    expect(own?.patient.city).toBeUndefined();
    expect(JSON.stringify(own)).not.toMatch(/@|\(54\)/); // sem e-mail/telefone no DTO do portal
  });
});

describe('integrações', () => {
  it('13. mantém o vínculo com o agendamento e respeita o reagendamento', () => {
    const s = db.getState();
    const v = view(admin(), 'ag-004');
    if (s.appointments.some((a) => a.id === 'ag-004')) expect(v?.stage).toBe('reagendado');
    const successor = view(admin(), 'ag-404');
    if (successor) expect(successor.stage === 'agendado' || successor.stage === 'concluido' || successor.stage === 'faltou').toBe(true);
  });

  it('financeiro: só admin/financeiro veem cobrança; concluídos sem receita ficam disponíveis uma única vez', () => {
    attendanceFlow.beginAttendance(helena(), 'ag-104');
    attendanceFlow.completeAttendance(helena(), 'ag-104');
    const unbilled = selectUnbilledFinishedAttendances(db.getState(), financeiro());
    expect(unbilled.some((v) => v.id === 'ag-104')).toBe(true);
    expect(unbilled.every((v) => v.billing === null)).toBe(true);
    expect(selectUnbilledFinishedAttendances(db.getState(), recepcao())).toEqual([]);
    expect(view(recepcao(), 'ag-104')?.billing).toBeUndefined();
    expect(view(admin(), 'ag-104')?.billing).toBeNull();
    expect(db.getState().financialEntries.some((e) => e.appointmentId === 'ag-104')).toBe(false); // nada é lançado aqui
  });

  it('14. alterações ficam no banco compartilhado (persistido pelo core)', () => {
    attendanceFlow.registerArrival(recepcao(), 'ag-108');
    const snapshot = JSON.parse(JSON.stringify(db.getState()));
    db.setState(() => snapshot);
    expect(view(admin(), 'ag-108')?.stage).toBe('na_recepcao');
    expect(view(ctxOf('u-prof-ana'), 'ag-108')?.checkInAt).toBe('2026-10-19T10:24:00');
  });
});

describe('15. registro demonstrativo: validação e mensagens', () => {
  it('ida e volta do texto composto', () => {
    const n = note({ evolucao: 'Evolução fictícia', recomendacoes: 'Orientação geral fictícia' });
    expect(parseDemoNote(composeDemoNote(n))).toEqual(n);
    expect(parseDemoNote('Resumo antigo sem rótulos').observacoes).toBe('Resumo antigo sem rótulos');
  });

  it('exige conteúdo, confirmação de fictício e bloqueia identificadores', () => {
    const fieldsOf = (fn: () => void) => {
      try {
        fn();
      } catch (e) {
        return e instanceof AppError ? e.fields : undefined;
      }
      return undefined;
    };
    expect(fieldsOf(() => validateDemoNote(emptyDemoNote(), true))?.motivo).toBeTruthy();
    expect(fieldsOf(() => validateDemoNote(note(), false))?.ficticio).toBeTruthy();
    expect(fieldsOf(() => validateDemoNote(note({ observacoes: 'CPF 123.456.789-09' }), true))?.observacoes).toBeTruthy();
    expect(fieldsOf(() => validateDemoNote(note({ observacoes: 'contato fulano@exemplo.com' }), true))?.observacoes).toBeTruthy();
    expect(fieldsOf(() => validateDemoNote(note(), true))).toBeUndefined();
    attendanceFlow.beginAttendance(helena(), 'ag-104');
    expect(codeOf(() => attendanceFlow.completeAttendance(helena(), 'ag-104', { note: note(), fictitiousConfirmed: false }))).toBe('VALIDATION');
    expect(view(helena(), 'ag-104')?.stage).toBe('em_andamento'); // nada foi concluído
  });
});
