/**
 * Agente 02 — Regras de agendamento (funções PURAS sobre o `Database` compartilhado).
 *
 * Complementam `appointmentService.findConflicts` (core), que só olha consultas do mesmo
 * profissional e bloqueios aprovados. Aqui entram também: horário de funcionamento da clínica,
 * intervalo de almoço, expediente individual do profissional, sala ativa e sala ocupada.
 * São usadas pelo serviço da Agenda (validação antes de gravar) e pelas telas (grade de horários).
 * O Portal do Profissional (Agente 04) pode reutilizá-las para exibir disponibilidade.
 */
import type { AppointmentRecord, AppointmentStatus, ClinicSettings, Database, ID, RoomRecord } from '@core';

/** Status que NÃO ocupam horário (o original de um reagendamento fica 'reagendada'). */
export const FREEING_STATUSES: AppointmentStatus[] = ['cancelada', 'faltou', 'reagendada'];
/** Status em que a recepção ainda pode editar, reagendar ou cancelar. */
export const OPEN_STATUSES: AppointmentStatus[] = ['agendada', 'confirmada'];
/** Passo da grade de horários livres (minutos). */
export const SLOT_STEP_MIN = 30;

export const occupiesTime = (a: Pick<AppointmentRecord, 'status'>) => !FREEING_STATUSES.includes(a.status);
export const isOpen = (a: Pick<AppointmentRecord, 'status'>) => OPEN_STATUSES.includes(a.status);

/** Já existe o novo horário criado a partir deste agendamento? */
export const hasSuccessor = (s: Pick<Database, 'appointments'>, id: ID) => s.appointments.some((a) => a.rescheduledFrom === id);

/**
 * Pode receber novo horário? Consultas abertas e, por compatibilidade com dados da Etapa 1,
 * consultas 'reagendada' que ainda não ganharam o novo horário (sem sucessor).
 */
export const canReschedule = (s: Pick<Database, 'appointments'>, a: AppointmentRecord) =>
  isOpen(a) || (a.status === 'reagendada' && !hasSuccessor(s, a.id));

/* ------------------------------ Tempo ------------------------------ */

/** "HH:mm" → minutos do dia. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutos do dia a partir do ISO local "AAAA-MM-DDTHH:mm:00" (sem depender de fuso). */
export function minutesOfIso(iso: string): number {
  return toMinutes(iso.slice(11, 16));
}

/** Minutos do dia → "HH:mm". */
export function fromMinutes(min: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(min / 60))}:${p(min % 60)}`;
}

/** Dia da semana (0 = domingo) de uma data "AAAA-MM-DD". */
export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export const isoOf = (dateKey: string, time: string) => `${dateKey}T${time}:00`;

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

/* -------------------------- Disponibilidade -------------------------- */

export interface TimeRange {
  start: number;
  end: number;
}

export interface UnavailableRange extends TimeRange {
  kind: 'almoco' | 'bloqueio';
  label: string;
}

export interface DayAvailability {
  /** Janela em que o profissional atende neste dia (clínica ∩ expediente), ou null. */
  window: TimeRange | null;
  /** Motivo de não haver janela. */
  closedReason?: 'clinica_fechada' | 'sem_expediente';
  /** Intervalos indisponíveis dentro do dia: almoço da clínica e bloqueios aprovados. */
  unavailable: UnavailableRange[];
  /** Bloqueios ainda pendentes de aprovação (informativos; não impedem agendar). */
  pending: UnavailableRange[];
}

/** Fatia do banco necessária para calcular disponibilidade. */
export interface AvailabilitySource {
  clinicSettings: Pick<ClinicSettings, 'hours'>;
  professionals: Database['professionals'];
  blockRequests: Database['blockRequests'];
}

/** Horário de funcionamento da clínica num dia (Configurações › Horários). */
export function clinicDay(s: Pick<AvailabilitySource, 'clinicSettings'>, dateKey: string) {
  const h = s.clinicSettings.hours.find((x) => x.weekday === weekdayOf(dateKey));
  if (!h || !h.open) return null;
  return {
    start: toMinutes(h.start),
    end: toMinutes(h.end),
    lunch: h.lunchStart && h.lunchEnd ? { start: toMinutes(h.lunchStart), end: toMinutes(h.lunchEnd) } : undefined,
  };
}

/** Disponibilidade de um profissional numa data, já com as regras da clínica aplicadas. */
export function professionalDay(s: AvailabilitySource, professionalId: ID, dateKey: string): DayAvailability {
  const clinic = clinicDay(s, dateKey);
  const prof = s.professionals.find((p) => p.id === professionalId);
  const requests = s.blockRequests.filter((b) => b.professionalId === professionalId && b.date === dateKey);
  // Almoço primeiro: na grade, um bloqueio que se sobrepõe a ele fica por cima (com o próprio rótulo).
  const unavailable: UnavailableRange[] = clinic?.lunch ? [{ ...clinic.lunch, kind: 'almoco', label: 'Almoço' }] : [];
  const pending: UnavailableRange[] = [];

  for (const b of requests) {
    if (b.kind !== 'bloqueio') continue;
    const range = { start: b.allDay ? 0 : toMinutes(b.start), end: b.allDay ? 24 * 60 : toMinutes(b.end), kind: 'bloqueio' as const, label: `Bloqueado · ${b.reason}` };
    if (b.status === 'aprovada') unavailable.push(range);
    else if (b.status === 'enviada') pending.push({ ...range, label: `Bloqueio pendente · ${b.reason}` });
  }

  if (!clinic) return { window: null, closedReason: 'clinica_fechada', unavailable, pending };

  // Alteração de disponibilidade APROVADA para a data substitui o expediente padrão.
  const override = requests.find((b) => b.kind === 'disponibilidade' && b.status === 'aprovada');
  const wd = weekdayOf(dateKey);
  const shift = override ?? prof?.workingHours.find((w) => w.weekday === wd);
  if (!shift) return { window: null, closedReason: 'sem_expediente', unavailable, pending };

  const start = Math.max(clinic.start, toMinutes(shift.start));
  const end = Math.min(clinic.end, toMinutes(shift.end));
  if (end <= start) return { window: null, closedReason: 'sem_expediente', unavailable, pending };
  return { window: { start, end }, unavailable, pending };
}

/** O minuto `min` do dia está dentro do expediente e fora de almoço/bloqueio? (grade dia/semana) */
export function isBookableMinute(day: DayAvailability, min: number): boolean {
  if (!day.window || min < day.window.start || min >= day.window.end) return false;
  return !day.unavailable.some((u) => min >= u.start && min < u.end);
}

/* ------------------------------ Validação ------------------------------ */

export type SlotIssueCode =
  | 'CLINICA_FECHADA'
  | 'SEM_EXPEDIENTE'
  | 'FORA_DO_EXPEDIENTE'
  | 'ALMOCO'
  | 'BLOQUEIO'
  | 'HORARIO_PASSADO'
  | 'CONFLITO_PROFISSIONAL'
  | 'CONFLITO_SALA'
  | 'SALA_INATIVA'
  | 'SALA_INEXISTENTE';

export interface SlotIssue {
  code: SlotIssueCode;
  /** Campo do formulário onde a mensagem deve aparecer. */
  field: 'start' | 'roomId';
  message: string;
}

export interface SlotCheck {
  professionalId: ID;
  /** ISO local "AAAA-MM-DDTHH:mm:00". */
  start: string;
  durationMin: number;
  roomId?: ID;
  /** Agendamentos a ignorar (o próprio, ao editar/reagendar). */
  ignoreIds?: ID[];
  /** ISO do "agora" da demo; quando informado, horários passados são recusados. */
  notBefore?: string;
}

const describe = (a: AppointmentRecord) =>
  `${a.patientName} (${a.professionalName}) das ${fromMinutes(minutesOfIso(a.start))} às ${fromMinutes(minutesOfIso(a.start) + a.durationMin)}`;

export function roomName(rooms: RoomRecord[], roomId: ID | undefined): string {
  const r = rooms.find((x) => x.id === roomId);
  return r ? r.name : 'Sala não definida';
}

/** Todas as regras que impedem reservar o horário. Lista vazia = pode agendar. */
export function checkSlot(s: Database, c: SlotCheck): SlotIssue[] {
  const issues: SlotIssue[] = [];
  const dateKey = c.start.slice(0, 10);
  const start = minutesOfIso(c.start);
  const end = start + c.durationMin;
  const ignore = new Set(c.ignoreIds ?? []);
  const day = professionalDay(s, c.professionalId, dateKey);
  const prof = s.professionals.find((p) => p.id === c.professionalId);
  const profName = prof?.name ?? 'O profissional';

  if (c.notBefore && c.start < c.notBefore) {
    issues.push({ code: 'HORARIO_PASSADO', field: 'start', message: 'Este horário já passou. Escolha um horário futuro.' });
  }

  if (!day.window) {
    issues.push(
      day.closedReason === 'clinica_fechada'
        ? { code: 'CLINICA_FECHADA', field: 'start', message: 'A clínica não funciona neste dia.' }
        : { code: 'SEM_EXPEDIENTE', field: 'start', message: `${profName} não atende neste dia.` },
    );
  } else if (start < day.window.start || end > day.window.end) {
    issues.push({
      code: 'FORA_DO_EXPEDIENTE',
      field: 'start',
      message: `Fora do expediente: ${profName} atende das ${fromMinutes(day.window.start)} às ${fromMinutes(day.window.end)} nesta data.`,
    });
  }

  for (const u of day.unavailable) {
    if (!overlaps(start, end, u.start, u.end)) continue;
    issues.push(
      u.kind === 'almoco'
        ? { code: 'ALMOCO', field: 'start', message: `O horário invade o intervalo de almoço da clínica (${fromMinutes(u.start)}–${fromMinutes(u.end)}).` }
        : { code: 'BLOQUEIO', field: 'start', message: `Horário bloqueado na agenda de ${profName} (${u.label.replace('Bloqueado · ', '')}).` },
    );
  }

  const sameDay = s.appointments.filter((a) => !ignore.has(a.id) && occupiesTime(a) && a.start.startsWith(dateKey));
  const clashes = (a: AppointmentRecord) => overlaps(start, end, minutesOfIso(a.start), minutesOfIso(a.start) + a.durationMin);

  const profClash = sameDay.find((a) => a.professionalId === c.professionalId && clashes(a));
  if (profClash) {
    issues.push({ code: 'CONFLITO_PROFISSIONAL', field: 'start', message: `Horário ocupado: ${describe(profClash)}.` });
  }

  if (c.roomId) {
    const room = s.rooms.find((r) => r.id === c.roomId);
    if (!room) issues.push({ code: 'SALA_INEXISTENTE', field: 'roomId', message: 'Sala não encontrada.' });
    else if (!room.active) issues.push({ code: 'SALA_INATIVA', field: 'roomId', message: `${room.name} está inativa nas Configurações. Escolha outra sala.` });
    const roomClash = sameDay.find((a) => a.roomId === c.roomId && a.professionalId !== c.professionalId && clashes(a));
    if (room && roomClash) {
      issues.push({ code: 'CONFLITO_SALA', field: 'roomId', message: `Conflito: ${room.name} ocupada — ${describe(roomClash)}.` });
    }
  }
  return issues;
}

/* --------------------------- Grade de horários --------------------------- */

export type SlotState = 'livre' | 'ocupado' | 'bloqueado';

export interface AgendaSlot {
  time: string;
  state: SlotState;
  /** Motivo (primeira regra violada), para tooltip/aria. */
  reason?: string;
}

const OCCUPIED: SlotIssueCode[] = ['CONFLITO_PROFISSIONAL', 'CONFLITO_SALA'];

/**
 * Horários do dia (a cada 30 min) dentro do funcionamento da clínica, com o estado de cada um
 * para a duração pedida: livre, ocupado (consulta/sala) ou bloqueado (fora do expediente, almoço,
 * bloqueio aprovado ou horário passado).
 */
export function buildSlots(s: Database, c: Omit<SlotCheck, 'start'> & { dateKey: string }): AgendaSlot[] {
  const clinic = clinicDay(s, c.dateKey);
  if (!clinic) return [];
  const out: AgendaSlot[] = [];
  for (let m = clinic.start; m + SLOT_STEP_MIN <= clinic.end; m += SLOT_STEP_MIN) {
    const time = fromMinutes(m);
    const issues = checkSlot(s, { ...c, start: isoOf(c.dateKey, time) }).filter((i) => i.code !== 'SALA_INATIVA' && i.code !== 'SALA_INEXISTENTE');
    const busy = issues.find((i) => OCCUPIED.includes(i.code));
    out.push({
      time,
      state: issues.length === 0 ? 'livre' : busy ? 'ocupado' : 'bloqueado',
      reason: (busy ?? issues[0])?.message,
    });
  }
  return out;
}

/** Sala padrão do profissional, se estiver ativa. */
export function defaultRoomFor(s: Database, professionalId: ID): ID | undefined {
  const prof = s.professionals.find((p) => p.id === professionalId);
  const room = s.rooms.find((r) => r.id === prof?.roomId);
  return room?.active ? room.id : undefined;
}

/* -------------------------------- Busca -------------------------------- */

const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Pesquisa de consultas por paciente, profissional, serviço, sala ou data ("21/10").
 * Todas as palavras precisam aparecer (E lógico).
 */
export function searchAppointments<T extends AppointmentRecord>(list: T[], query: string, rooms: RoomRecord[] = []): T[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((a) => {
    const [y, m, d] = a.start.slice(0, 10).split('-');
    const hay = normalize(
      [a.patientName, a.professionalName, a.service, roomName(rooms, a.roomId), `${d}/${m}/${y}`, a.start.slice(11, 16), a.notes ?? ''].join(' '),
    );
    return terms.every((t) => hay.includes(t));
  });
}
