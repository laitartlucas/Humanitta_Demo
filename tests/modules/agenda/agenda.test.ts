/**
 * Agente 02 — Agenda: regras de agendamento, serviço composto e permissões.
 * "Agora" da demo: segunda, 19/10/2026 10:24 (core/clock).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { appointmentService, db, isAppError, resetDemoData, selectAppointments, toAccessContext, type AccessContext, type AppError } from '@core';
import {
  cancelAgendaAppointment,
  checkInAgendaAppointment,
  confirmAgendaAppointment,
  createAgendaAppointment,
  editAgendaAppointment,
  markAgendaNoShow,
  rescheduleAgendaAppointment,
  type AgendaAppointmentInput,
} from '@modules/agenda/agendaService';
import { buildSlots, checkSlot, professionalDay, searchAppointments } from '@modules/agenda/agendaRules';

const ctxOf = (userId: string): AccessContext => {
  const u = db.getState().users.find((x) => x.id === userId);
  if (!u) throw new Error(`usuário ${userId} ausente na semente`);
  return toAccessContext(u);
};
const appt = (id: string) => db.getState().appointments.find((a) => a.id === id);

/** Executa e devolve o AppError lançado (falha o teste se nada for lançado). */
function errorOf(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    if (isAppError(e)) return e;
    throw e;
  }
  throw new Error('esperava um AppError');
}

const helenaInput = (over: Partial<AgendaAppointmentInput> = {}): AgendaAppointmentInput => ({
  patientId: 'pac-03',
  professionalId: 'prof-helena',
  service: 'Sessão de fonoterapia',
  serviceId: 'sv-04',
  start: '2026-10-20T10:30:00',
  durationMin: 45,
  channel: 'telefone',
  ...over,
});

let recepcao: AccessContext;
let admin: AccessContext;
let financeiro: AccessContext;
let lauren: AccessContext;
let helena: AccessContext;

beforeEach(() => {
  resetDemoData();
  recepcao = ctxOf('u-recepcao');
  admin = ctxOf('u-admin');
  financeiro = ctxOf('u-financeiro');
  lauren = ctxOf('u-prof-lauren');
  helena = ctxOf('u-prof-helena');
});

describe('1. criar agendamento', () => {
  it('recepção cria consulta com paciente e profissional da base compartilhada', () => {
    const before = db.getState().appointments.length;
    const a = createAgendaAppointment(recepcao, helenaInput());
    expect(db.getState().appointments).toHaveLength(before + 1);
    expect(a).toMatchObject({ patientId: 'pac-03', professionalId: 'prof-helena', roomId: 'sala-2', status: 'agendada', specialty: 'fonoaudiologia' });
    expect(a.patientName).toBe(db.getState().patients.find((p) => p.id === 'pac-03')?.name);
  });

  it('o novo agendamento aparece no Portal só para o profissional responsável', () => {
    const a = createAgendaAppointment(recepcao, helenaInput());
    expect(selectAppointments(db.getState(), helena).some((x) => x.id === a.id)).toBe(true);
    expect(selectAppointments(db.getState(), lauren).some((x) => x.id === a.id)).toBe(false);
  });

  it('valida campos obrigatórios e paciente inativo', () => {
    const e = errorOf(() => createAgendaAppointment(recepcao, helenaInput({ patientId: '', service: '' })));
    expect(e.code).toBe('VALIDATION');
    expect(e.fields).toMatchObject({ patientId: expect.any(String), service: expect.any(String) });
    expect(errorOf(() => createAgendaAppointment(recepcao, helenaInput({ patientId: 'pac-12' }))).fields?.patientId).toMatch(/inativo/);
  });
});

describe('2. editar agendamento', () => {
  it('altera serviço, duração e observações', () => {
    const a = editAgendaAppointment(recepcao, 'ag-202', { durationMin: 60, notes: 'Trazer exames', service: 'Avaliação fonoaudiológica' });
    expect(a).toMatchObject({ id: 'ag-202', durationMin: 60, notes: 'Trazer exames', service: 'Avaliação fonoaudiológica' });
  });

  it('trocar o profissional gera novo agendamento ligado ao original', () => {
    // ag-205: Ana (Podologia) 20/10 15:00 → Helena, livre no mesmo horário.
    const a = editAgendaAppointment(recepcao, 'ag-205', { professionalId: 'prof-helena', service: 'Sessão de fonoterapia', durationMin: 45 });
    expect(a).toMatchObject({ professionalId: 'prof-helena', roomId: 'sala-2', start: '2026-10-20T15:00:00', durationMin: 45, rescheduledFrom: 'ag-205' });
    expect(appt('ag-205')?.status).toBe('reagendada');
    // Lauren está ocupada às 08:30 de 20/10: a troca é recusada e nada muda.
    expect(errorOf(() => editAgendaAppointment(recepcao, 'ag-202', { professionalId: 'prof-lauren' })).message).toMatch(/Horário ocupado/);
    expect(appt('ag-202')?.status).toBe('agendada');
  });

  it('não edita consulta concluída e recusa duração que invade outra consulta', () => {
    expect(errorOf(() => editAgendaAppointment(recepcao, 'ag-101', { notes: 'x' })).code).toBe('CONFLICT');
    // ag-301 (Lauren 21/10 08:00–09:00): esticar para 3 h invade o almoço e o bloqueio aprovado.
    expect(errorOf(() => editAgendaAppointment(recepcao, 'ag-301', { durationMin: 180 })).code).toBe('CONFLICT');
  });
});

describe('3. reagendar', () => {
  it('marca o original como reagendada e cria o novo horário', () => {
    const next = rescheduleAgendaAppointment(recepcao, 'ag-202', '2026-10-21T11:00:00');
    expect(appt('ag-202')?.status).toBe('reagendada');
    expect(next).toMatchObject({ start: '2026-10-21T11:00:00', rescheduledFrom: 'ag-202', professionalId: 'prof-helena', roomId: 'sala-2', status: 'agendada' });
  });

  it('recusa horário ocupado, passado ou igual ao atual', () => {
    expect(errorOf(() => rescheduleAgendaAppointment(recepcao, 'ag-202', '2026-10-21T09:30:00')).code).toBe('CONFLICT');
    expect(errorOf(() => rescheduleAgendaAppointment(recepcao, 'ag-202', '2026-10-19T09:00:00')).fields?.start).toMatch(/já passou/);
    expect(errorOf(() => rescheduleAgendaAppointment(recepcao, 'ag-202', '2026-10-20T09:00:00')).code).toBe('VALIDATION');
  });

  it('consulta já reagendada (com novo horário) não é reagendada de novo', () => {
    rescheduleAgendaAppointment(recepcao, 'ag-202', '2026-10-21T11:00:00');
    expect(errorOf(() => rescheduleAgendaAppointment(recepcao, 'ag-202', '2026-10-22T11:00:00')).code).toBe('CONFLICT');
  });
});

describe('4. cancelar', () => {
  it('cancela com motivo e libera o horário', () => {
    const a = cancelAgendaAppointment(recepcao, 'ag-202', 'Solicitação do paciente');
    expect(a).toMatchObject({ status: 'cancelada', cancelReason: 'Solicitação do paciente' });
    expect(checkSlot(db.getState(), { professionalId: 'prof-helena', start: '2026-10-20T09:00:00', durationMin: 50, roomId: 'sala-2' })).toEqual([]);
  });

  it('exige motivo e não cancela duas vezes', () => {
    expect(errorOf(() => cancelAgendaAppointment(recepcao, 'ag-202', '  ')).fields?.reason).toBeDefined();
    cancelAgendaAppointment(recepcao, 'ag-202', 'Outro motivo');
    expect(errorOf(() => cancelAgendaAppointment(recepcao, 'ag-202', 'Outro motivo')).code).toBe('CONFLICT');
  });
});

describe('5. confirmar', () => {
  it('confirma consulta agendada uma única vez', () => {
    expect(confirmAgendaAppointment(recepcao, 'ag-202').status).toBe('confirmada');
    expect(errorOf(() => confirmAgendaAppointment(recepcao, 'ag-202')).message).toMatch(/já está confirmada/);
  });

  it('check-in no dia confirma e registra a chegada; falta só após o horário', () => {
    expect(checkInAgendaAppointment(recepcao, 'ag-106').status).toBe('confirmada');
    expect(db.getState().attendances.find((x) => x.appointmentId === 'ag-106')?.checkInAt).toBeDefined();
    expect(errorOf(() => checkInAgendaAppointment(recepcao, 'ag-202')).code).toBe('CONFLICT');
    expect(markAgendaNoShow(recepcao, 'ag-104').status).toBe('faltou');
    expect(errorOf(() => markAgendaNoShow(recepcao, 'ag-111')).code).toBe('CONFLICT');
  });
});

describe('6. conflitos e regras de horário', () => {
  const s = () => db.getState();
  const codes = (start: string, professionalId = 'prof-helena', durationMin = 45, roomId?: string) =>
    checkSlot(s(), { professionalId, start, durationMin, roomId }).map((i) => i.code);

  it('mesmo profissional com sobreposição de duração', () => {
    // ag-202: Helena 20/10 09:00–09:50
    expect(codes('2026-10-20T09:30:00')).toContain('CONFLITO_PROFISSIONAL');
    expect(codes('2026-10-20T09:50:00')).toEqual([]);
    const e = errorOf(() => createAgendaAppointment(recepcao, helenaInput({ start: '2026-10-20T09:30:00' })));
    expect(e.code).toBe('CONFLICT');
    expect(e.message).toMatch(/Horário ocupado/);
  });

  it('a mesma sala não é reservada por dois profissionais ao mesmo tempo', () => {
    // Sala 3 é compartilhada por Quiropraxia (Rafael) e Podologia (Ana); ambos atendem às segundas.
    createAgendaAppointment(recepcao, { patientId: 'pac-01', professionalId: 'prof-rafael', service: 'Ajuste quiroprático', start: '2026-10-26T10:00:00', durationMin: 30, roomId: 'sala-3' });
    const e = errorOf(() =>
      createAgendaAppointment(recepcao, { patientId: 'pac-02', professionalId: 'prof-ana', service: 'Atendimento podológico', start: '2026-10-26T10:15:00', durationMin: 40, roomId: 'sala-3' }),
    );
    expect(e.code).toBe('CONFLICT');
    expect(e.fields?.roomId).toMatch(/Sala 3 ocupada/);
    expect(
      createAgendaAppointment(recepcao, { patientId: 'pac-02', professionalId: 'prof-ana', service: 'Atendimento podológico', start: '2026-10-26T10:15:00', durationMin: 40, roomId: 'sala-4' }).roomId,
    ).toBe('sala-4');
  });

  it('funcionamento da clínica, almoço, expediente individual e bloqueio aprovado', () => {
    expect(codes('2026-10-24T09:00:00')).toContain('CLINICA_FECHADA'); // sábado: clínica fechada nas Configurações
    expect(codes('2026-10-20T12:00:00')).toContain('ALMOCO');
    expect(codes('2026-10-20T16:30:00')).toContain('FORA_DO_EXPEDIENTE'); // Helena atende até 17:00
    expect(codes('2026-10-20T10:00:00', 'prof-rafael', 30)).toContain('SEM_EXPEDIENTE'); // Rafael não atende às terças
    expect(codes('2026-10-21T13:30:00', 'prof-lauren', 30)).toContain('BLOQUEIO'); // req-02 aprovado 12:00–14:00
    expect(codes('2026-10-23T16:30:00', 'prof-lauren', 30)).not.toContain('BLOQUEIO'); // req-04 ainda pendente
    expect(professionalDay(s(), 'prof-lauren', '2026-10-23').pending).toHaveLength(1);
  });

  it('bloqueio aprovado também é respeitado pelo serviço do core', () => {
    const e = errorOf(() =>
      createAgendaAppointment(recepcao, { patientId: 'pac-01', professionalId: 'prof-lauren', service: 'Avaliação odontológica', start: '2026-11-02T09:00:00', durationMin: 40 }),
    );
    expect(e.code).toBe('CONFLICT');
  });

  it('sala inativa e horário passado', () => {
    // Gustavo tem como sala padrão a Sala 7, inativa nas Configurações.
    const gus = { patientId: 'pac-10', professionalId: 'prof-gustavo', service: 'Sessão de fisioterapia', start: '2026-10-22T09:00:00', durationMin: 50 };
    expect(errorOf(() => createAgendaAppointment(recepcao, gus)).fields?.roomId).toBeDefined();
    expect(errorOf(() => createAgendaAppointment(recepcao, { ...gus, roomId: 'sala-7' })).fields?.roomId).toMatch(/inativa/);
    expect(createAgendaAppointment(recepcao, { ...gus, roomId: 'sala-4' }).roomId).toBe('sala-4');
    expect(errorOf(() => createAgendaAppointment(recepcao, helenaInput({ start: '2026-10-19T09:00:00' }))).fields?.start).toMatch(/já passou/);
  });

  it('grade de horários mostra livres, ocupados e bloqueados', () => {
    const slots = buildSlots(s(), { professionalId: 'prof-helena', dateKey: '2026-10-20', durationMin: 45, roomId: 'sala-2' });
    const at = (t: string) => slots.find((x) => x.time === t)?.state;
    expect(at('09:00')).toBe('ocupado');
    expect(at('10:30')).toBe('livre');
    expect(at('12:00')).toBe('bloqueado');
    expect(at('17:00')).toBe('bloqueado');
    expect(buildSlots(s(), { professionalId: 'prof-helena', dateKey: '2026-10-25', durationMin: 45 })).toEqual([]); // domingo
  });
});

describe('7–8. filtros por profissional, data e pesquisa', () => {
  it('filtra por profissional', () => {
    const list = selectAppointments(db.getState(), recepcao, { professionalIds: ['prof-helena'] });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((a) => a.professionalId === 'prof-helena')).toBe(true);
  });

  it('filtra por data (período inclusivo) e sala/especialidade', () => {
    const day = selectAppointments(db.getState(), recepcao, { from: '2026-10-20', to: '2026-10-20' });
    expect(day.map((a) => a.id)).toContain('ag-202');
    expect(day.every((a) => a.start.startsWith('2026-10-20'))).toBe(true);
    const room = selectAppointments(db.getState(), recepcao, { roomIds: ['sala-3'], specialties: ['podologia'] });
    expect(room.every((a) => a.roomId === 'sala-3' && a.specialty === 'podologia')).toBe(true);
  });

  it('pesquisa por paciente, profissional ou data, sem acento', () => {
    const s = db.getState();
    const name = s.patients.find((p) => p.id === 'pac-07')?.name ?? '';
    const first = name.split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    expect(searchAppointments(s.appointments, first).every((a) => a.patientId === 'pac-07')).toBe(true);
    expect(searchAppointments(s.appointments, 'helena 20/10').map((a) => a.id)).toEqual(['ag-202']);
  });
});

describe('10. permissões aplicadas pelos serviços', () => {
  it('financeiro vê a agenda mas não altera nada (403)', () => {
    expect(selectAppointments(db.getState(), financeiro).length).toBe(db.getState().appointments.length);
    for (const fn of [
      () => createAgendaAppointment(financeiro, helenaInput()),
      () => editAgendaAppointment(financeiro, 'ag-202', { notes: 'x' }),
      () => rescheduleAgendaAppointment(financeiro, 'ag-202', '2026-10-21T11:00:00'),
      () => cancelAgendaAppointment(financeiro, 'ag-202', 'Outro motivo'),
      () => confirmAgendaAppointment(financeiro, 'ag-202'),
      () => checkInAgendaAppointment(financeiro, 'ag-106'),
      () => markAgendaNoShow(financeiro, 'ag-104'),
    ]) {
      expect(errorOf(fn).code).toBe('FORBIDDEN');
    }
    expect(appt('ag-202')?.status).toBe('agendada');
  });

  it('profissional não usa a agenda administrativa e só lê os próprios agendamentos', () => {
    expect(errorOf(() => createAgendaAppointment(lauren, helenaInput())).code).toBe('FORBIDDEN');
    expect(errorOf(() => cancelAgendaAppointment(helena, 'ag-202', 'Outro motivo')).code).toBe('FORBIDDEN');
    expect(selectAppointments(db.getState(), lauren).every((a) => a.professionalId === 'prof-lauren')).toBe(true);
  });

  it('administrador e recepção podem gerenciar; o core recusa escrita direta de quem não pode', () => {
    expect(confirmAgendaAppointment(admin, 'ag-202').status).toBe('confirmada');
    expect(errorOf(() => appointmentService.cancelAppointment(financeiro, 'ag-202', 'x')).code).toBe('FORBIDDEN');
  });
});
