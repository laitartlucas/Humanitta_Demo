/**
 * Humanittá Gestão — Portal do Profissional: seletores de ESCOPO (dados demonstrativos).
 *
 * Tudo aqui devolve SOMENTE registros vinculados ao profissional informado e apenas os campos
 * necessários ao trabalho autorizado (sem preço, saldo, CPF ou endereço).
 *
 * SEGURANÇA — leia antes de integrar:
 * - No backend, o MESMO filtro precisa ser aplicado NA CONSULTA, nunca depois dela.
 *   Ex.: política RLS `using (professional_id = auth.professional_id())` nas tabelas de
 *   agendamentos/atendimentos/registros clínicos, e uma view `portal_patients` que projete
 *   só as colunas mínimas (nome, idade, telefone mascarado, próxima/última consulta…).
 * - A API deve ignorar qualquer `professionalId` vindo do cliente e usar o do token autenticado.
 * - Estes seletores apenas REFLETEM no front o que o servidor já deveria ter filtrado.
 *
 * Pacientes, horários, alertas e valores são FICTÍCIOS. Apenas a Dra. Lauren Bertocchi é
 * profissional real (informação pública divulgada pela clínica).
 */
import type { Appointment, AppointmentStatus, Specialty } from './types';
import {
  ageFrom,
  appointments as clinicAppointments,
  getPatientById,
  getProfessionalById,
  parseDate,
  toDateKey,
} from './clinical';

/* ------------------------------------------------------------------ */
/* Referências                                                          */
/* ------------------------------------------------------------------ */

/** Profissional logado na demonstração do portal. */
export const PORTAL_PROFESSIONAL_ID = 'prof-lauren';
/** "Hoje" no portal: segunda, 19/10/2026. */
export const PORTAL_TODAY = new Date(2026, 9, 19);
/** "Agora" no portal: 19/10/2026, 10:24. */
export const PORTAL_NOW = new Date(2026, 9, 19, 10, 24);

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/* ------------------------------------------------------------------ */
/* Tipos de escopo                                                       */
/* ------------------------------------------------------------------ */

/** Consulta como o profissional a enxerga: SEM valor financeiro. */
export type PortalAppointment = Omit<Appointment, 'price'>;

export interface PortalAlert {
  id: string;
  label: string;
  tone: 'info' | 'warning' | 'danger';
}

/** Paciente com dados MÍNIMOS (sem saldo, CPF, e-mail ou endereço). */
export interface PortalPatient {
  id: string;
  name: string;
  age: number;
  /** Telefone parcialmente mascarado, ex. (54) 9••••-0101. */
  phoneMasked: string;
  /** Próxima consulta COM ESTE profissional (ISO). */
  nextVisit?: string;
  /** Última consulta concluída COM ESTE profissional (ISO). */
  lastVisit?: string;
  /** Tratamento / serviço em curso com este profissional. */
  treatment: string;
  /** Atendimentos concluídos com este profissional. */
  visitsWithMe: number;
  alerts: PortalAlert[];
  /** Observação administrativa relevante (vinda da recepção). */
  adminNote?: string;
}

export interface PortalAttendanceRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  /** Início (ISO). */
  date: string;
  durationMin: number;
  outcome: 'concluida' | 'faltou';
  /**
   * true = atendimento de OUTRO profissional: o portal só sabe que existe.
   * Serviço, especialidade, profissional e conteúdo não são enviados ao cliente.
   */
  restricted: boolean;
  service?: string;
  specialty?: Specialty;
  professionalName?: string;
  /** Resumo demonstrativo (nunca dados reais). */
  summary?: string;
}

export type BlockRequestKind = 'bloqueio' | 'disponibilidade';
export type BlockRequestStatus = 'enviada' | 'aprovada' | 'recusada';

export interface BlockRequest {
  id: string;
  professionalId: string;
  kind: BlockRequestKind;
  /** Data (AAAA-MM-DD). Na alteração de disponibilidade: a partir de quando vale. */
  date: string;
  start: string;
  end: string;
  allDay?: boolean;
  /** Dia da semana afetado (somente alteração de disponibilidade). */
  weekday?: Weekday;
  reason: string;
  note?: string;
  status: BlockRequestStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  /** Motivo da recusa (status 'recusada'). */
  refusalReason?: string;
}

export interface AvailabilityDay {
  weekday: Weekday;
  enabled: boolean;
  start?: string;
  end?: string;
  breakStart?: string;
  breakEnd?: string;
}

export type PortalSlotState = 'livre' | 'ocupado' | 'bloqueado' | 'pendente' | 'intervalo';

export interface PortalSlot {
  time: string;
  state: PortalSlotState;
  appointmentId?: string;
  requestId?: string;
}

/* ------------------------------------------------------------------ */
/* Base de consultas (clínica + complementos da Dra. Lauren)            */
/* ------------------------------------------------------------------ */

function stripPrice(a: Appointment): PortalAppointment {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    professionalId: a.professionalId,
    professionalName: a.professionalName,
    specialty: a.specialty,
    service: a.service,
    roomId: a.roomId,
    start: a.start,
    durationMin: a.durationMin,
    status: a.status,
    notes: a.notes,
    channel: a.channel,
  };
}

/** No portal, "agora" é 10:24: a manutenção das 09:00 já foi finalizada. */
const STATUS_AT_PORTAL_NOW: Record<string, AppointmentStatus> = { 'ag-103': 'concluida' };

function mk(
  id: string,
  date: string,
  time: string,
  patientId: string,
  service: string,
  durationMin: number,
  status: AppointmentStatus,
  channel: NonNullable<Appointment['channel']> = 'whatsapp',
  notes?: string,
): PortalAppointment[] {
  const pat = getPatientById(patientId);
  const prof = getProfessionalById(PORTAL_PROFESSIONAL_ID);
  if (!pat || !prof) return [];
  return [
    {
      id,
      patientId,
      patientName: pat.name,
      professionalId: prof.id,
      professionalName: prof.name,
      specialty: prof.specialty,
      service,
      roomId: prof.roomId ?? 'sala-1',
      start: `${date}T${time}:00`,
      durationMin,
      status,
      channel,
      notes,
    },
  ];
}

/** Consultas fictícias adicionais da Dra. Lauren (semana demo + histórico). */
const LAUREN_EXTRA: PortalAppointment[] = [
  // Histórico
  ...mk('pl-h01', '2026-08-25', '09:00', 'pac-01', 'Manutenção ortodôntica', 50, 'concluida'),
  ...mk('pl-h02', '2026-09-15', '11:00', 'pac-03', 'Avaliação ortodôntica', 40, 'concluida', 'telefone'),
  ...mk('pl-h03', '2026-09-22', '09:30', 'pac-01', 'Manutenção ortodôntica', 50, 'concluida'),
  ...mk('pl-h04', '2026-09-29', '14:00', 'pac-05', 'Avaliação ortodôntica', 40, 'concluida', 'assistente_ia'),
  ...mk('pl-h05', '2026-10-08', '10:00', 'pac-11', 'Consulta de retorno', 30, 'concluida'),
  ...mk('pl-h06', '2026-10-13', '16:00', 'pac-06', 'Avaliação ortodôntica', 40, 'faltou', 'telefone', 'Não compareceu; recepção tentou contato.'),
  ...mk('pl-h07', '2026-10-14', '09:00', 'pac-01', 'Manutenção ortodôntica', 50, 'concluida'),
  ...mk('pl-h08', '2026-10-14', '14:00', 'pac-07', 'Avaliação ortodôntica', 40, 'concluida'),
  ...mk('pl-h09', '2026-10-15', '10:00', 'pac-02', 'Manutenção ortodôntica', 40, 'concluida', 'assistente_ia'),
  ...mk('pl-h10', '2026-10-16', '15:00', 'pac-12', 'Limpeza/profilaxia', 50, 'concluida', 'presencial'),

  // Hoje, 19/10 (agora 10:24)
  ...mk('pl-101', '2026-10-19', '10:00', 'pac-07', 'Limpeza/profilaxia', 50, 'em_atendimento', 'presencial'),
  ...mk('pl-102', '2026-10-19', '11:00', 'pac-02', 'Manutenção ortodôntica', 40, 'confirmada', 'whatsapp', 'Menor de idade: responsável acompanha.'),
  ...mk('pl-103', '2026-10-19', '13:30', 'pac-03', 'Consulta de retorno', 30, 'confirmada', 'whatsapp'),
  ...mk('pl-104', '2026-10-19', '14:00', 'pac-06', 'Clareamento', 60, 'agendada', 'telefone'),
  ...mk('pl-105', '2026-10-19', '16:30', 'pac-04', 'Avaliação ortodôntica', 40, 'agendada', 'assistente_ia'),

  // Restante da semana
  ...mk('pl-201', '2026-10-20', '14:00', 'pac-05', 'Clareamento', 60, 'confirmada', 'assistente_ia'),
  ...mk('pl-202', '2026-10-20', '16:00', 'pac-11', 'Limpeza/profilaxia', 50, 'agendada'),
  ...mk('pl-301', '2026-10-21', '10:30', 'pac-10', 'Consulta de retorno', 30, 'agendada'),
  ...mk('pl-302', '2026-10-21', '15:00', 'pac-07', 'Manutenção ortodôntica', 40, 'confirmada'),
  ...mk('pl-501', '2026-10-23', '08:30', 'pac-04', 'Limpeza/profilaxia', 50, 'agendada', 'telefone'),
  ...mk('pl-502', '2026-10-23', '16:30', 'pac-02', 'Manutenção ortodôntica', 40, 'agendada', 'assistente_ia'),

  // Próximas semanas
  ...mk('pl-701', '2026-10-27', '09:00', 'pac-05', 'Clareamento', 60, 'agendada', 'assistente_ia'),
  ...mk('pl-702', '2026-10-29', '14:30', 'pac-12', 'Consulta de retorno', 30, 'agendada', 'telefone'),
  ...mk('pl-801', '2026-11-16', '09:00', 'pac-01', 'Manutenção ortodôntica', 50, 'agendada'),
];

/** Base completa (todas as clínicas/profissionais) — NUNCA exposta diretamente ao portal. */
const ALL_APPOINTMENTS: PortalAppointment[] = [
  ...clinicAppointments.map((a) => ({ ...stripPrice(a), status: STATUS_AT_PORTAL_NOW[a.id] ?? a.status })),
  ...LAUREN_EXTRA,
];

/* ------------------------------------------------------------------ */
/* Seletores de agenda                                                   */
/* ------------------------------------------------------------------ */

/**
 * Consultas do profissional (ordem cronológica).
 * Backend: `select … from appointments where professional_id = :auth_professional_id` (RLS).
 */
export function getMyAppointments(professionalId: string): PortalAppointment[] {
  return ALL_APPOINTMENTS.filter((a) => a.professionalId === professionalId).sort((a, b) => a.start.localeCompare(b.start));
}

/** Consultas do profissional numa data (AAAA-MM-DD). */
export function getMyAppointmentsByDate(professionalId: string, dateKey: string): PortalAppointment[] {
  return getMyAppointments(professionalId).filter((a) => a.start.startsWith(dateKey));
}

export function getMyTodayAppointments(professionalId: string): PortalAppointment[] {
  return getMyAppointmentsByDate(professionalId, toDateKey(PORTAL_TODAY));
}

/** Consulta por id SOMENTE se pertencer ao profissional (senão undefined → tela 403/404). */
export function getMyAppointmentById(professionalId: string, appointmentId: string): PortalAppointment | undefined {
  return getMyAppointments(professionalId).find((a) => a.id === appointmentId);
}

const WAITING: AppointmentStatus[] = ['agendada', 'confirmada', 'reagendada'];

/** Próxima consulta aguardando atendimento a partir de `now`. */
export function getMyNextAppointment(professionalId: string, now: Date = PORTAL_NOW, list?: PortalAppointment[]): PortalAppointment | undefined {
  const source = list ?? getMyAppointments(professionalId);
  return source
    .filter((a) => WAITING.includes(a.status) && new Date(a.start).getTime() + a.durationMin * 60000 > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

/* ------------------------------------------------------------------ */
/* Pacientes (dados mínimos)                                             */
/* ------------------------------------------------------------------ */

/** "(54) 99100-0101" → "(54) 9••••-0101". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '••••';
  const ddd = digits.slice(0, 2);
  const last = digits.slice(-4);
  const first = digits.length === 11 ? digits[2] : '';
  return `(${ddd}) ${first}••••-${last}`;
}

const TREATMENT: Record<string, string> = {
  'pac-01': 'Ortodontia — aparelho fixo (manutenção mensal)',
  'pac-02': 'Ortodontia interceptativa',
  'pac-03': 'Avaliação ortodôntica e retorno',
  'pac-04': 'Avaliação ortodôntica',
  'pac-05': 'Clareamento dental',
  'pac-06': 'Clareamento dental',
  'pac-07': 'Prevenção — profilaxia e ortodontia',
  'pac-08': 'Avaliação clínica geral',
  'pac-09': 'Avaliação clínica geral (primeira consulta)',
  'pac-10': 'Acompanhamento — consulta de retorno',
  'pac-11': 'Prevenção — profilaxia',
  'pac-12': 'Avaliação ortodôntica e limpeza',
};

/** Alertas de ATENDIMENTO (demonstrativos — não são dados clínicos reais). */
const ALERTS: Record<string, PortalAlert[]> = {
  'pac-02': [{ id: 'al-1', label: 'Menor de idade — vem com responsável', tone: 'info' }],
  'pac-03': [{ id: 'al-2', label: 'Relata sensibilidade dentária (demo)', tone: 'warning' }],
  'pac-06': [
    { id: 'al-3', label: 'Faltou em 13/10', tone: 'warning' },
    { id: 'al-4', label: 'Prefere horários pela manhã', tone: 'info' },
  ],
  'pac-07': [{ id: 'al-5', label: 'Alergia a látex (demonstrativo)', tone: 'danger' }],
  'pac-08': [{ id: 'al-6', label: 'Reagendou 1 vez', tone: 'warning' }],
  'pac-09': [
    { id: 'al-7', label: 'Primeira consulta', tone: 'info' },
    { id: 'al-8', label: 'Termo LGPD pendente na recepção', tone: 'warning' },
  ],
};

const ADMIN_NOTES: Record<string, string> = {
  'pac-01': 'Prefere lembretes pelo WhatsApp.',
  'pac-02': 'Responsável legal acompanha todas as consultas.',
  'pac-04': 'Prefere horários no fim da tarde.',
  'pac-09': 'Cadastro novo — recepção conferindo documentos.',
  'pac-12': 'Cadastro inativo na clínica; mantém retorno com você.',
};

function buildPortalPatient(patientId: string, mine: PortalAppointment[]): PortalPatient | undefined {
  const p = getPatientById(patientId);
  if (!p) return undefined;
  const withPatient = mine.filter((a) => a.patientId === patientId);
  const done = withPatient.filter((a) => a.status === 'concluida').sort((a, b) => b.start.localeCompare(a.start));
  const upcoming = withPatient
    .filter((a) => WAITING.includes(a.status) && new Date(a.start).getTime() >= PORTAL_NOW.getTime() - 30 * 60000)
    .sort((a, b) => a.start.localeCompare(b.start));
  const inProgress = withPatient.find((a) => a.status === 'em_atendimento');
  return {
    id: p.id,
    name: p.name,
    age: ageFrom(p.birthDate, PORTAL_TODAY),
    phoneMasked: maskPhone(p.phone),
    nextVisit: (inProgress ?? upcoming[0])?.start,
    lastVisit: done[0]?.start,
    treatment: TREATMENT[p.id] ?? withPatient[withPatient.length - 1]?.service ?? 'Acompanhamento',
    visitsWithMe: done.length,
    alerts: ALERTS[p.id] ?? [],
    adminNote: ADMIN_NOTES[p.id],
  };
}

/**
 * Pacientes com pelo menos uma consulta com o profissional.
 * Backend: view `portal_patients` com colunas mínimas + RLS por vínculo (exists appointment com professional_id).
 */
export function getMyPatients(professionalId: string): PortalPatient[] {
  const mine = getMyAppointments(professionalId);
  const ids = Array.from(new Set(mine.map((a) => a.patientId)));
  return ids
    .map((id) => buildPortalPatient(id, mine))
    .filter((p): p is PortalPatient => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Paciente SOMENTE se vinculado ao profissional (senão undefined → "Acesso não autorizado"). */
export function getMyPatientById(professionalId: string, patientId: string): PortalPatient | undefined {
  const mine = getMyAppointments(professionalId);
  if (!mine.some((a) => a.patientId === patientId)) return undefined;
  return buildPortalPatient(patientId, mine);
}

/** Consultas de um paciente COM este profissional (mais recentes primeiro). */
export function getMyAppointmentsWithPatient(professionalId: string, patientId: string): PortalAppointment[] {
  return getMyAppointments(professionalId)
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => b.start.localeCompare(a.start));
}

/* ------------------------------------------------------------------ */
/* Histórico de atendimentos                                             */
/* ------------------------------------------------------------------ */

const SUMMARY_BY_SERVICE: Record<string, string> = {
  'Manutenção ortodôntica': 'Resumo demonstrativo: ajuste de arco e troca de elásticos, sem intercorrências.',
  'Avaliação ortodôntica': 'Resumo demonstrativo: avaliação inicial e orientação sobre plano de tratamento.',
  'Limpeza/profilaxia': 'Resumo demonstrativo: profilaxia completa e orientação de higiene.',
  'Consulta de retorno': 'Resumo demonstrativo: retorno de acompanhamento, evolução satisfatória.',
  Clareamento: 'Resumo demonstrativo: sessão de clareamento realizada conforme protocolo.',
};

function ownRecord(a: PortalAppointment): PortalAttendanceRecord {
  return {
    id: `rec-${a.id}`,
    appointmentId: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    date: a.start,
    durationMin: a.durationMin,
    outcome: a.status === 'faltou' ? 'faltou' : 'concluida',
    restricted: false,
    service: a.service,
    specialty: a.specialty,
    professionalName: a.professionalName,
    summary: a.status === 'faltou' ? 'Paciente não compareceu.' : SUMMARY_BY_SERVICE[a.service] ?? 'Resumo demonstrativo — conteúdo fictício.',
  };
}

/** Marcador de atendimento de OUTRO profissional: sem serviço, especialidade ou conteúdo. */
function restrictedRecord(a: PortalAppointment): PortalAttendanceRecord {
  return {
    id: `rec-${a.id}`,
    appointmentId: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    date: a.start,
    durationMin: a.durationMin,
    outcome: 'concluida',
    restricted: true,
  };
}

/**
 * Atendimentos já realizados pelo profissional (mais recentes primeiro).
 * Com `includeRestricted`, acrescenta marcadores bloqueados de atendimentos de outros
 * profissionais com os MESMOS pacientes — o servidor só informa que existem.
 */
export function getMyAttendanceHistory(
  professionalId: string,
  options: { includeRestricted?: boolean; patientId?: string } = {},
): PortalAttendanceRecord[] {
  const mine = getMyAppointments(professionalId);
  const myPatientIds = new Set(mine.map((a) => a.patientId));
  const now = PORTAL_NOW.getTime();
  const own = mine
    .filter((a) => (a.status === 'concluida' || a.status === 'faltou') && new Date(a.start).getTime() < now)
    .map(ownRecord);
  const restricted = options.includeRestricted
    ? ALL_APPOINTMENTS.filter(
        (a) =>
          a.professionalId !== professionalId &&
          myPatientIds.has(a.patientId) &&
          a.status === 'concluida' &&
          new Date(a.start).getTime() < now,
      ).map(restrictedRecord)
    : [];
  return [...own, ...restricted]
    .filter((r) => !options.patientId || r.patientId === options.patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ */
/* Disponibilidade e solicitações                                        */
/* ------------------------------------------------------------------ */

const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Grade semanal de atendimento (somente leitura no portal; alteração via solicitação). */
export function getMyAvailability(professionalId: string): AvailabilityDay[] {
  const prof = getProfessionalById(professionalId);
  return WEEK_ORDER.map((weekday) => {
    const w = prof?.workingHours.find((x) => x.weekday === weekday);
    if (!w) return { weekday, enabled: false };
    const hasBreak = w.start < '12:00' && w.end > '13:00';
    return {
      weekday,
      enabled: true,
      start: w.start,
      end: w.end,
      breakStart: hasBreak ? '12:00' : undefined,
      breakEnd: hasBreak ? '13:00' : undefined,
    };
  });
}

/** Solicitações de bloqueio / alteração de disponibilidade da Dra. Lauren (demo). */
export const MY_BLOCK_REQUESTS: BlockRequest[] = [
  {
    id: 'req-04',
    professionalId: 'prof-lauren',
    kind: 'bloqueio',
    date: '2026-10-23',
    start: '16:00',
    end: '18:00',
    reason: 'Compromisso pessoal',
    note: 'Se possível, encaixar o paciente das 16:30 na próxima semana.',
    status: 'enviada',
    createdAt: '2026-10-18T19:05:00',
  },
  {
    id: 'req-03',
    professionalId: 'prof-lauren',
    kind: 'disponibilidade',
    date: '2026-10-31',
    weekday: 6,
    start: '08:00',
    end: '13:00',
    reason: 'Estender atendimento de sábado até 13:00',
    status: 'recusada',
    createdAt: '2026-10-10T11:40:00',
    decidedAt: '2026-10-11T09:15:00',
    decidedBy: 'Camila S. (Administradora)',
    refusalReason: 'A recepção não cobre sábados após as 12:00. Podemos reavaliar em novembro.',
  },
  {
    id: 'req-02',
    professionalId: 'prof-lauren',
    kind: 'bloqueio',
    date: '2026-10-21',
    start: '12:00',
    end: '14:00',
    reason: 'Curso de atualização',
    note: 'Curso on-line de atualização em ortodontia.',
    status: 'aprovada',
    createdAt: '2026-10-12T14:20:00',
    decidedAt: '2026-10-12T16:02:00',
    decidedBy: 'Camila S. (Administradora)',
  },
  {
    id: 'req-01',
    professionalId: 'prof-lauren',
    kind: 'bloqueio',
    date: '2026-11-02',
    start: '08:00',
    end: '18:00',
    allDay: true,
    reason: 'Feriado — Finados',
    status: 'aprovada',
    createdAt: '2026-10-05T10:00:00',
    decidedAt: '2026-10-05T10:30:00',
    decidedBy: 'Camila S. (Administradora)',
  },
];

export function getMyBlockRequests(professionalId: string, list: BlockRequest[] = MY_BLOCK_REQUESTS): BlockRequest[] {
  return list.filter((r) => r.professionalId === professionalId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Bloqueios que afetam a agenda: aprovados (bloqueado) e enviados (pendentes). */
export function getMyBlocks(professionalId: string, list: BlockRequest[] = MY_BLOCK_REQUESTS): BlockRequest[] {
  return getMyBlockRequests(professionalId, list).filter((r) => r.kind === 'bloqueio' && r.status !== 'recusada');
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function apptRange(a: PortalAppointment): [number, number] {
  const d = new Date(a.start);
  const s = d.getHours() * 60 + d.getMinutes();
  return [s, s + a.durationMin];
}

/**
 * Horários de 30 min do expediente numa data, com estado.
 * Considera consultas (exceto canceladas), intervalo de almoço, bloqueios aprovados e pendentes.
 */
export function getMyDaySlots(
  professionalId: string,
  dateKey: string,
  options: { appointments?: PortalAppointment[]; requests?: BlockRequest[] } = {},
): PortalSlot[] {
  const day = getMyAvailability(professionalId).find((d) => d.weekday === parseDate(dateKey).getDay());
  if (!day?.enabled || !day.start || !day.end) return [];
  const appts = (options.appointments ?? getMyAppointments(professionalId)).filter(
    (a) => a.professionalId === professionalId && a.start.startsWith(dateKey) && a.status !== 'cancelada' && a.status !== 'faltou',
  );
  const blocks = getMyBlocks(professionalId, options.requests).filter((b) => b.date === dateKey);
  const slots: PortalSlot[] = [];
  for (let t = timeToMinutes(day.start); t < timeToMinutes(day.end); t += 30) {
    const end = t + 30;
    const time = minutesToTime(t);
    const appt = appts.find((a) => {
      const [s, e] = apptRange(a);
      return s < end && e > t;
    });
    const block = blocks.find((b) => timeToMinutes(b.start) < end && timeToMinutes(b.end) > t);
    const inBreak = day.breakStart && day.breakEnd && t >= timeToMinutes(day.breakStart) && t < timeToMinutes(day.breakEnd);
    if (appt) slots.push({ time, state: 'ocupado', appointmentId: appt.id });
    else if (block) slots.push({ time, state: block.status === 'aprovada' ? 'bloqueado' : 'pendente', requestId: block.id });
    else if (inBreak) slots.push({ time, state: 'intervalo' });
    else slots.push({ time, state: 'livre' });
  }
  return slots;
}

/** Consultas do profissional que colidem com um período (detecção de conflito do bloqueio). */
export function findMyConflicts(
  professionalId: string,
  dateKey: string,
  start: string,
  end: string,
  list?: PortalAppointment[],
): PortalAppointment[] {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return (list ?? getMyAppointments(professionalId)).filter((a) => {
    if (a.professionalId !== professionalId || !a.start.startsWith(dateKey)) return false;
    if (a.status === 'cancelada' || a.status === 'faltou' || a.status === 'concluida') return false;
    const [as, ae] = apptRange(a);
    return as < e && ae > s;
  });
}

/* ------------------------------------------------------------------ */
/* Perfil: repasses e sessões (fictícios)                               */
/* ------------------------------------------------------------------ */

export interface PayoutSummary {
  monthLabel: string;
  /** Valor previsto do mês (fictício). */
  expected: number;
  attendances: number;
  lastMonthPaid: number;
  nextPaymentDate: string;
}

/** "Meus repasses" resumido — único dado financeiro visível ao profissional. */
export const MY_PAYOUT_SUMMARY: PayoutSummary = {
  monthLabel: 'outubro de 2026',
  expected: 6840,
  attendances: 38,
  lastMonthPaid: 7120,
  nextPaymentDate: '2026-11-05',
};

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export const MY_SESSIONS: ActiveSession[] = [
  { id: 'ses-1', device: 'Chrome · Windows', location: 'Ronda Alta/RS (aprox.)', lastActive: 'Agora', current: true },
  { id: 'ses-2', device: 'Safari · iPhone', location: 'Ronda Alta/RS (aprox.)', lastActive: 'Hoje, 07:48', current: false },
  { id: 'ses-3', device: 'Safari · iPad', location: 'Sarandi/RS (aprox.)', lastActive: 'Ontem, 19:12', current: false },
];
