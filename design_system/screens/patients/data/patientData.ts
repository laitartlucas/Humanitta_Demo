/**
 * Agente 03 — Pacientes. Leituras e comandos do módulo compostos a partir do core.
 *
 * Nada aqui guarda estado próprio: tudo lê o `Database` compartilhado (seletores puros, usados via
 * `useQuery`) e escreve por `patientService` (comandos com a assinatura `(ctx, ...args)`, usados via
 * `useAction`). As regras de escopo espelham o que o backend fará na consulta — não são segurança.
 */
import {
  AppError,
  DEMO_NOW,
  assertCan,
  can,
  logActivity,
  patientService,
  repositories,
  selectAppointments,
  selectAttendances,
  type AccessContext,
  type ActivityEvent,
  type AppointmentRecord,
  type AppointmentStatus,
  type Attendance,
  type Database,
  type FinancialEntryRecord,
  type ID,
  type PatientRecord,
  type Specialty,
} from '@core';
import { ageFrom, formatDate, formatTime } from '@ds/mocks/clinical';
import { maskPhone } from '@ds/mocks/portal';

const ov = (s: Database) => s.clinicSettings.permissionOverrides;

/** Remove acentos e caixa para comparar textos digitados pela recepção. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const digits = (s: string) => s.replace(/\D/g, '');

/* ------------------------------------------------------------------ */
/* Escopo                                                               */
/* ------------------------------------------------------------------ */

/**
 * - `clinica`: cadastro completo de todos os pacientes (admin, recepção, financeiro).
 * - `proprio`: só pacientes com agendamento do próprio profissional, em dados mínimos.
 * - `nenhum`: sem acesso.
 */
export type PatientScope = 'clinica' | 'proprio' | 'nenhum';

export function selectPatientScope(s: Database, ctx: AccessContext): PatientScope {
  if (can(ctx, 'pacientes_cadastro', 'ver', ov(s))) return 'clinica';
  if (ctx.professionalId && can(ctx, 'pacientes_cadastro', 'proprio', ov(s))) return 'proprio';
  return 'nenhum';
}

/* ------------------------------------------------------------------ */
/* Linhas da listagem                                                   */
/* ------------------------------------------------------------------ */

export interface PatientRow {
  id: ID;
  name: string;
  age: number;
  /** Ausente em dados mínimos. */
  birthDate?: string;
  /** Completo no escopo da clínica; mascarado em dados mínimos. */
  phone: string;
  email?: string;
  city?: string;
  tags: string[];
  createdAt?: string;
  status: PatientRecord['status'];
  /** `undefined` = perfil sem acesso ao financeiro do paciente. */
  balance?: number;
  lastVisit?: string;
  nextVisit?: string;
  specialties: Specialty[];
  professionalIds: ID[];
  professionalNames: string[];
  appointmentCount: number;
  /** true quando a linha está em dados mínimos (escopo `proprio`). */
  minimal: boolean;
}

const UPCOMING: AppointmentStatus[] = ['agendada', 'confirmada', 'em_atendimento'];
const VISITED: AppointmentStatus[] = ['concluida', 'em_atendimento'];

/** Próxima consulta e última visita calculadas pelos agendamentos (fonte única). */
export function visitsOf(appts: AppointmentRecord[], ref: Date = DEMO_NOW): { lastVisit?: string; nextVisit?: string } {
  const nowMs = ref.getTime();
  let lastVisit: string | undefined;
  let nextVisit: string | undefined;
  for (const a of appts) {
    const t = new Date(a.start).getTime();
    if (VISITED.includes(a.status) && t <= nowMs && (!lastVisit || a.start > lastVisit)) lastVisit = a.start;
    if (UPCOMING.includes(a.status) && t >= nowMs - 30 * 60000 && (!nextVisit || a.start < nextVisit)) nextVisit = a.start;
  }
  return { lastVisit, nextVisit };
}

function groupByPatient(appts: AppointmentRecord[]): Map<ID, AppointmentRecord[]> {
  const map = new Map<ID, AppointmentRecord[]>();
  for (const a of appts) {
    const list = map.get(a.patientId);
    if (list) list.push(a);
    else map.set(a.patientId, [a]);
  }
  return map;
}

function toRow(p: PatientRecord, appts: AppointmentRecord[], minimal: boolean, showBalance: boolean): PatientRow {
  const visits = visitsOf(appts);
  const lastVisit = minimal ? visits.lastVisit : [visits.lastVisit, p.lastVisit].filter(Boolean).sort().pop();
  const profs = new Map<ID, string>();
  appts.forEach((a) => profs.set(a.professionalId, a.professionalName));
  const base = {
    id: p.id,
    name: p.name,
    age: ageFrom(p.birthDate, DEMO_NOW),
    status: p.status,
    lastVisit,
    nextVisit: visits.nextVisit,
    specialties: Array.from(new Set(appts.map((a) => a.specialty))),
    professionalIds: Array.from(profs.keys()),
    professionalNames: Array.from(profs.values()),
    appointmentCount: appts.length,
  };
  if (minimal) return { ...base, phone: maskPhone(p.phone), tags: [], minimal: true };
  return {
    ...base,
    birthDate: p.birthDate,
    phone: p.phone,
    email: p.email,
    city: p.city,
    tags: p.tags,
    createdAt: p.createdAt,
    balance: showBalance ? p.balance : undefined,
    minimal: false,
  };
}

/**
 * Pacientes visíveis ao contexto, já com os dados derivados da agenda.
 * Profissional recebe só os vinculados aos próprios agendamentos, sem saldo, e-mail, cidade ou telefone completo.
 */
export function selectPatientRows(s: Database, ctx: AccessContext): PatientRow[] {
  const scope = selectPatientScope(s, ctx);
  if (scope === 'nenhum') return [];
  const byPatient = groupByPatient(selectAppointments(s, ctx));
  const showBalance = scope === 'clinica' && can(ctx, 'pacientes_financeiro', 'ver', ov(s));
  const source = scope === 'clinica' ? s.patients : s.patients.filter((p) => byPatient.has(p.id));
  return source
    .map((p) => toRow(p, byPatient.get(p.id) ?? [], scope === 'proprio', showBalance))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/* ------------------------------------------------------------------ */
/* Busca, filtros e ordenação                                           */
/* ------------------------------------------------------------------ */

export type QuickFilter = 'todos' | 'ativos' | 'inativos' | 'saldo' | 'novos';
export type SortKey = 'nome-asc' | 'nome-desc' | 'cadastro-desc' | 'cadastro-asc' | 'ultima-visita';

export const SORT_LABEL: Record<SortKey, string> = {
  'nome-asc': 'Nome (A–Z)',
  'nome-desc': 'Nome (Z–A)',
  'cadastro-desc': 'Cadastro mais recente',
  'cadastro-asc': 'Cadastro mais antigo',
  'ultima-visita': 'Última visita',
};

export interface PatientCriteria {
  query: string;
  quick: QuickFilter;
  specialty?: Specialty;
  professionalId?: ID;
  tag?: string;
  sort: SortKey;
  /** "AAAA-MM-01" do mês corrente (filtro "Novos"). */
  monthStart: string;
}

/** O texto digitado bate com nome, cidade, telefone ou identificador? */
export function matchesQuery(row: PatientRow, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  if (normalize(row.name).includes(q)) return true;
  if (row.city && normalize(row.city).includes(q)) return true;
  if (normalize(row.id) === q || normalize(row.id).endsWith(q)) return true;
  const qd = digits(q);
  // Telefone só no cadastro completo: em dados mínimos ele está mascarado.
  return !row.minimal && qd.length >= 3 && digits(row.phone).includes(qd);
}

function matchesQuick(row: PatientRow, quick: QuickFilter, monthStart: string): boolean {
  switch (quick) {
    case 'ativos':
      return row.status === 'ativo';
    case 'inativos':
      return row.status === 'inativo';
    case 'saldo':
      return (row.balance ?? 0) > 0;
    case 'novos':
      return Boolean(row.createdAt && row.createdAt >= monthStart);
    default:
      return true;
  }
}

export function countQuickFilters(rows: PatientRow[], monthStart: string): Record<QuickFilter, number> {
  const n = (q: QuickFilter) => rows.filter((r) => matchesQuick(r, q, monthStart)).length;
  return { todos: rows.length, ativos: n('ativos'), inativos: n('inativos'), saldo: n('saldo'), novos: n('novos') };
}

const SORTERS: Record<SortKey, (a: PatientRow, b: PatientRow) => number> = {
  'nome-asc': (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  'nome-desc': (a, b) => b.name.localeCompare(a.name, 'pt-BR'),
  'cadastro-desc': (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.name.localeCompare(b.name, 'pt-BR'),
  'cadastro-asc': (a, b) => (a.createdAt ?? '9999').localeCompare(b.createdAt ?? '9999') || a.name.localeCompare(b.name, 'pt-BR'),
  'ultima-visita': (a, b) => (b.lastVisit ?? '').localeCompare(a.lastVisit ?? '') || a.name.localeCompare(b.name, 'pt-BR'),
};

export function filterPatients(rows: PatientRow[], c: PatientCriteria): PatientRow[] {
  return rows
    .filter(
      (r) =>
        matchesQuery(r, c.query) &&
        matchesQuick(r, c.quick, c.monthStart) &&
        (!c.specialty || r.specialties.includes(c.specialty)) &&
        (!c.professionalId || r.professionalIds.includes(c.professionalId)) &&
        (!c.tag || r.tags.includes(c.tag)),
    )
    .sort(SORTERS[c.sort]);
}

/** Opções dos filtros (só valores presentes nos dados visíveis). */
export function filterOptions(rows: PatientRow[]) {
  const specialties = new Set<Specialty>();
  const professionals = new Map<ID, string>();
  const tags = new Set<string>();
  rows.forEach((r) => {
    r.specialties.forEach((s) => specialties.add(s));
    r.professionalIds.forEach((id, i) => professionals.set(id, r.professionalNames[i]));
    r.tags.forEach((t) => tags.add(t));
  });
  return {
    specialties: Array.from(specialties),
    professionals: Array.from(professionals, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    tags: Array.from(tags).sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

/** Planilha CSV da listagem filtrada (somente campos que o perfil já vê na tela). */
export function patientsToCsv(rows: PatientRow[]): string {
  const withBalance = rows.some((r) => r.balance !== undefined);
  const head = ['Identificador', 'Nome', 'Idade', 'Telefone', 'Cidade', 'Situação', 'Cadastro', 'Última visita', 'Próxima consulta'];
  if (withBalance) head.push('Saldo (R$)');
  const cell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const out: (string | number | undefined)[] = [
      r.id,
      r.name,
      r.age,
      r.phone,
      r.city,
      r.status === 'ativo' ? 'Ativo' : 'Inativo',
      r.createdAt,
      r.lastVisit?.slice(0, 10),
      r.nextVisit?.slice(0, 10),
    ];
    if (withBalance) out.push(r.balance?.toFixed(2).replace('.', ','));
    return out.map(cell).join(';');
  });
  return [head.map(cell).join(';'), ...lines].join('\r\n');
}

/* ------------------------------------------------------------------ */
/* Perfil individual                                                    */
/* ------------------------------------------------------------------ */

export interface PatientDetail {
  row: PatientRow;
  /** Cadastro completo — só no escopo da clínica. */
  record?: PatientRecord;
  appointments: AppointmentRecord[];
}

export type PatientLookup = { status: 'ok'; detail: PatientDetail } | { status: 'not_found' } | { status: 'forbidden' };

/** Ficha do paciente respeitando o escopo: fora dele, `forbidden` (espelho do 403). */
export function selectPatientDetail(s: Database, ctx: AccessContext, id: ID | undefined): PatientLookup {
  const scope = selectPatientScope(s, ctx);
  if (scope === 'nenhum') return { status: 'forbidden' };
  const record = id ? s.patients.find((p) => p.id === id) : undefined;
  if (!record) return { status: 'not_found' };
  const appointments = selectAppointments(s, ctx, { patientId: record.id });
  if (scope === 'proprio' && appointments.length === 0) return { status: 'forbidden' };
  const showBalance = scope === 'clinica' && can(ctx, 'pacientes_financeiro', 'ver', ov(s));
  return {
    status: 'ok',
    detail: {
      row: toRow(record, appointments, scope === 'proprio', showBalance),
      record: scope === 'clinica' ? record : undefined,
      appointments,
    },
  };
}

/** Atendimentos (ciclo operacional, sem conteúdo clínico) do paciente no escopo do perfil. */
export function selectPatientAttendances(s: Database, ctx: AccessContext, patientId: ID): Attendance[] {
  return selectAttendances(s, ctx)
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => (b.checkInAt ?? b.startedAt ?? '').localeCompare(a.checkInAt ?? a.startedAt ?? ''));
}

export interface PatientFinance {
  entries: FinancialEntryRecord[];
  totalPaid: number;
  open: number;
}

/** Financeiro do paciente — `null` para perfis sem `pacientes_financeiro ≥ ver` (profissional nunca vê). */
export function selectPatientFinance(s: Database, ctx: AccessContext, patientId: ID): PatientFinance | null {
  if (!can(ctx, 'pacientes_financeiro', 'ver', ov(s))) return null;
  const entries = s.financialEntries
    .filter((e) => e.patientId === patientId && e.type === 'receita')
    .sort((a, b) => b.date.localeCompare(a.date));
  const sum = (pred: (e: FinancialEntryRecord) => boolean) => entries.filter(pred).reduce((t, e) => t + e.amount, 0);
  return {
    entries,
    totalPaid: sum((e) => e.status === 'pago'),
    open: sum((e) => e.status === 'pendente' || e.status === 'atrasado'),
  };
}

/** Linha do tempo administrativa (cadastro, agenda, presença). Nunca inclui conteúdo clínico. */
export function buildPatientHistory(
  patient: { name: string; createdAt?: string },
  appts: AppointmentRecord[],
  attendances: Attendance[],
  activity: ActivityEvent[] = [],
): ActivityEvent[] {
  const ev: ActivityEvent[] = [];
  if (patient.createdAt)
    ev.push({ id: 'h-cad', who: 'Recepção', what: 'cadastrou o paciente e registrou consentimento LGPD.', at: `${patient.createdAt}T09:00:00`, tone: 'gold' });
  appts.forEach((a) => {
    const when = `${formatDate(a.start)} às ${formatTime(a.start)}`;
    if (a.channel === 'assistente_ia')
      ev.push({ id: `h-ia-${a.id}`, who: 'Assistente IA', what: `agendou ${a.service} para ${when} via WhatsApp.`, at: a.createdAt ?? a.start, tone: 'ai' });
    if (a.rescheduledFrom)
      ev.push({ id: `h-r-${a.id}`, who: 'Recepção', what: `reagendou a consulta para ${when}.`, at: a.createdAt ?? a.start, tone: 'info' });
    if (a.status === 'confirmada') ev.push({ id: `h-c-${a.id}`, who: 'Recepção', what: `confirmou presença em ${when}.`, at: a.updatedAt ?? a.start, tone: 'success' });
    if (a.status === 'cancelada')
      ev.push({
        id: `h-x-${a.id}`,
        who: 'Recepção',
        what: `cancelou a consulta de ${when}${a.cancelReason ? ` — motivo: ${a.cancelReason}` : ''}.`,
        at: a.updatedAt ?? a.start,
        tone: 'danger',
      });
    if (a.status === 'faltou') ev.push({ id: `h-f-${a.id}`, who: 'Sistema', what: `registrou falta em ${when}.`, at: a.start, tone: 'warning' });
    if (a.status === 'concluida') ev.push({ id: `h-ok-${a.id}`, who: a.professionalName, what: `finalizou o atendimento (${a.service}).`, at: a.start, tone: 'neutral' });
  });
  attendances.forEach((at) => {
    if (at.checkInAt) ev.push({ id: `h-ci-${at.id}`, who: 'Recepção', what: `registrou a chegada (check-in) às ${formatTime(at.checkInAt)}.`, at: at.checkInAt, tone: 'info' });
  });
  // Alterações cadastrais registradas no feed compartilhado (o feed não guarda patientId; ver change request 03).
  activity
    .filter((e) => e.what.includes(patient.name) && /cadastro|paciente/i.test(e.what))
    .forEach((e) => ev.push({ ...e, id: `h-act-${e.id}` }));
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}

/* ------------------------------------------------------------------ */
/* Comandos (escrita via patientService)                                */
/* ------------------------------------------------------------------ */

export interface PatientFormInput {
  name: string;
  birthDate: string;
  phone: string;
  email?: string;
  city: string;
  tags: string[];
  adminNote?: string;
  status: PatientRecord['status'];
}

export interface DuplicateMatch {
  field: 'name' | 'phone';
  patient: PatientRecord;
}

/** Mesmo telefone, ou mesmo nome com a mesma data de nascimento, já cadastrados. */
export function findDuplicatePatient(
  patients: PatientRecord[],
  input: Pick<PatientFormInput, 'name' | 'birthDate' | 'phone'>,
  ignoreId?: ID,
): DuplicateMatch | null {
  const name = normalize(input.name).replace(/\s+/g, ' ');
  const phone = digits(input.phone);
  for (const p of patients) {
    if (p.id === ignoreId) continue;
    if (phone.length >= 10 && digits(p.phone) === phone) return { field: 'phone', patient: p };
    if (normalize(p.name).replace(/\s+/g, ' ') === name && p.birthDate === input.birthDate) return { field: 'name', patient: p };
  }
  return null;
}

function assertNoDuplicate(input: PatientFormInput, ignoreId?: ID): void {
  const dup = findDuplicatePatient(repositories.patients.list(), input, ignoreId);
  if (!dup) return;
  throw new AppError(
    'CONFLICT',
    dup.field === 'phone'
      ? `Este telefone já pertence a ${dup.patient.name}. Abra o cadastro existente em vez de criar outro.`
      : `${dup.patient.name}, com a mesma data de nascimento, já está cadastrado(a).`,
    { [dup.field]: dup.field === 'phone' ? 'Telefone já cadastrado.' : 'Paciente já cadastrado.' },
  );
}

const ensureEditor = (ctx: AccessContext) => assertCan(ctx, 'pacientes_cadastro', 'editar', repositories.clinicSettings.get().permissionOverrides);

const clean = (input: PatientFormInput) => ({
  name: input.name.trim().replace(/\s+/g, ' '),
  birthDate: input.birthDate,
  phone: input.phone.trim(),
  email: input.email?.trim() || undefined,
  city: input.city.trim(),
  tags: input.tags,
  adminNote: input.adminNote?.trim() || undefined,
});

/** Cadastra paciente (com prevenção de duplicidade). O ID é gerado pelo serviço. */
export function registerPatient(ctx: AccessContext, input: PatientFormInput): PatientRecord {
  ensureEditor(ctx);
  assertNoDuplicate(input);
  const created = patientService.createPatient(ctx, clean(input));
  return input.status === 'inativo' ? patientService.updatePatient(ctx, created.id, { status: 'inativo' }) : created;
}

/** Atualiza o cadastro existente preservando ID e vínculos (agendamentos são sincronizados pelo serviço). */
export function savePatient(ctx: AccessContext, id: ID, input: PatientFormInput): PatientRecord {
  ensureEditor(ctx);
  repositories.patients.require(id);
  assertNoDuplicate(input, id);
  const updated = patientService.updatePatient(ctx, id, { ...clean(input), status: input.status });
  logActivity(ctx, `atualizou o cadastro do paciente ${updated.name}.`, 'info');
  return updated;
}

/** Exclusão lógica: o cadastro fica inativo e o histórico é preservado. */
export function deactivatePatient(ctx: AccessContext, id: ID): PatientRecord {
  const updated = patientService.updatePatient(ctx, id, { status: 'inativo' });
  logActivity(ctx, `desativou o cadastro do paciente ${updated.name}.`, 'warning');
  return updated;
}

export function reactivatePatient(ctx: AccessContext, id: ID): PatientRecord {
  const updated = patientService.updatePatient(ctx, id, { status: 'ativo' });
  logActivity(ctx, `reativou o cadastro do paciente ${updated.name}.`, 'success');
  return updated;
}

/** Exclusão definitiva — o serviço só permite para cadastro sem nenhum agendamento. */
export function removePatient(ctx: AccessContext, id: ID): ID {
  const name = repositories.patients.getById(id)?.name;
  patientService.deletePatient(ctx, id);
  logActivity(ctx, `excluiu o cadastro do paciente ${name ?? ''} (sem histórico).`, 'danger');
  return id;
}
