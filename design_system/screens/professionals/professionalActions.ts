/**
 * Gestão de profissionais — ações compostas a partir dos serviços do core.
 *
 * Nenhuma escrita direta: o cadastro passa por `settingsService.upsertProfessional`, o usuário do
 * Portal por `settingsService.upsertUser` e as solicitações por `blockRequestService`. Os serviços
 * revalidam permissão (403) — as checagens daqui só evitam operações pela metade (ex.: criar o
 * profissional e falhar ao criar o acesso). Assinatura `(ctx, ...args)` para `useAction`.
 */
import {
  blockRequestService,
  can,
  conflict,
  forbidden,
  logActivity,
  repositories,
  settingsService,
  validation,
  type AccessContext,
  type BlockRequestRecord,
  type ID,
  type Professional,
  type Specialty,
  type UserRecord,
} from '@core';
import { initials } from '@ds/mocks/clinical';

type WorkingHour = Professional['workingHours'][number];

export interface ProfessionalInput {
  name: string;
  title: string;
  specialty: Specialty | '';
  registry: string;
  roomId: string;
}

export interface NewProfessionalInput extends ProfessionalInput {
  /** E-mail do usuário individual do Portal (vazio = cadastrar sem acesso por enquanto). */
  accessEmail?: string;
}

/** Expediente padrão de um novo cadastro (ajustável no perfil). */
export const DEFAULT_WORKING_HOURS: WorkingHour[] = ([1, 2, 3, 4, 5] as const).map((weekday) => ({
  weekday,
  start: '08:00',
  end: '17:00',
}));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ov = () => repositories.clinicSettings.get().permissionOverrides;

/** Usuário do Portal vinculado ao profissional (no máximo um por cadastro). */
export function linkedUserOf(users: UserRecord[], professionalId: ID): UserRecord | undefined {
  return users.find((u) => u.role === 'profissional' && u.professionalId === professionalId);
}

/** Mesmas regras do formulário, reaplicadas no serviço (a tela pode ser contornada). */
export function validateProfessionalInput(input: ProfessionalInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (input.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Informe nome e sobrenome.';
  if (!input.title.trim()) e.title = 'Informe o cargo ou título profissional.';
  if (!input.specialty || !repositories.specialties.getById(input.specialty)) e.specialty = 'Selecione a especialidade.';
  if (!input.roomId || !repositories.rooms.getById(input.roomId)) e.roomId = 'Selecione a sala de atendimento.';
  return e;
}

function validateAccessEmail(email: string, ignoreUserId?: ID): string | undefined {
  const v = email.trim().toLowerCase();
  if (!EMAIL.test(v)) return 'Informe um e-mail válido.';
  if (repositories.users.list().some((u) => u.id !== ignoreUserId && u.email.toLowerCase() === v)) {
    return 'Este e-mail já está em uso por outro usuário.';
  }
  return undefined;
}

function assertCanManageUsers(ctx: AccessContext) {
  if (!can(ctx, 'usuarios_permissoes', 'editar', ov())) {
    throw forbidden('Criar ou alterar o acesso ao Portal exige a permissão "Usuários e permissões".');
  }
}

function userTitle(title: string): string {
  return title.split(' · ')[0].trim();
}

/** Cadastra o profissional e, se informado, o usuário individual do Portal (`professionalId` vinculado). */
export function createProfessional(ctx: AccessContext, input: NewProfessionalInput): Professional {
  const fields = validateProfessionalInput(input);
  const email = input.accessEmail?.trim();
  if (email) {
    assertCanManageUsers(ctx);
    const emailError = validateAccessEmail(email);
    if (emailError) fields.accessEmail = emailError;
  }
  if (Object.keys(fields).length) throw validation(fields);
  const prof = settingsService.upsertProfessional(ctx, {
    name: input.name.trim(),
    title: input.title.trim(),
    specialty: input.specialty as Specialty,
    registry: input.registry.trim() || undefined,
    roomId: input.roomId,
    isDemo: true,
    workingHours: DEFAULT_WORKING_HOURS.map((w) => ({ ...w })),
    occupancy: 0,
  });
  if (email) grantPortalAccess(ctx, prof.id, email);
  logActivity(ctx, `cadastrou ${prof.name} (${prof.title}).`, 'success');
  return prof;
}

/** Edita o cadastro (nome, título, especialidade, registro, sala). Mantém id e relacionamentos. */
export function updateProfessional(ctx: AccessContext, id: ID, input: ProfessionalInput): Professional {
  const existing = repositories.professionals.require(id);
  const fields = validateProfessionalInput(input);
  if (Object.keys(fields).length) throw validation(fields);
  const updated = settingsService.upsertProfessional(ctx, {
    ...existing,
    name: input.name.trim(),
    title: input.title.trim(),
    specialty: input.specialty as Specialty,
    registry: input.registry.trim() || undefined,
    roomId: input.roomId,
  });
  // Mantém o usuário do Portal coerente com o cadastro (nome exibido no shell e no login demo).
  const user = linkedUserOf(repositories.users.list(), id);
  if (user && can(ctx, 'usuarios_permissoes', 'editar', ov()) && (user.name !== updated.name || user.title !== userTitle(updated.title))) {
    settingsService.upsertUser(ctx, { ...user, name: updated.name, title: userTitle(updated.title), initials: initials(updated.name) });
  }
  return updated;
}

/** Cria o usuário individual do Portal vinculado ao profissional. */
export function grantPortalAccess(ctx: AccessContext, professionalId: ID, email: string): UserRecord {
  assertCanManageUsers(ctx);
  const prof = repositories.professionals.require(professionalId);
  if (linkedUserOf(repositories.users.list(), professionalId)) throw conflict('Este profissional já possui acesso ao Portal.');
  const emailError = validateAccessEmail(email);
  if (emailError) throw validation({ accessEmail: emailError });
  const user = settingsService.upsertUser(ctx, {
    name: prof.name,
    email: email.trim().toLowerCase(),
    role: 'profissional',
    title: userTitle(prof.title),
    initials: initials(prof.name),
    status: 'ativo',
    professionalId,
    isDemo: true,
  });
  logActivity(ctx, `liberou o acesso ao Portal para ${prof.name}.`, 'info');
  return user;
}

/**
 * Ativa/desativa o profissional pelo status do usuário vinculado: inativo não entra no Portal
 * (login demo e `selectCurrentUser` recusam). O cadastro, a agenda e o histórico são preservados.
 */
export function setProfessionalActive(ctx: AccessContext, professionalId: ID, active: boolean): UserRecord {
  assertCanManageUsers(ctx);
  const prof = repositories.professionals.require(professionalId);
  const user = linkedUserOf(repositories.users.list(), professionalId);
  if (!user) throw conflict('Este profissional ainda não tem acesso ao Portal. Crie o acesso primeiro.');
  if (ctx.userId === user.id) throw forbidden('Você não pode alterar a situação do seu próprio acesso.');
  const updated = settingsService.upsertUser(ctx, { ...user, status: active ? 'ativo' : 'inativo' });
  logActivity(ctx, `${active ? 'reativou' : 'desativou'} o acesso de ${prof.name}.`, active ? 'success' : 'warning');
  return updated;
}

/** Valida e grava a grade semanal (um intervalo por dia). */
export function saveWorkingHours(ctx: AccessContext, professionalId: ID, hours: WorkingHour[]): Professional {
  const existing = repositories.professionals.require(professionalId);
  const fields: Record<string, string> = {};
  const seen = new Set<number>();
  hours.forEach((h) => {
    if (seen.has(h.weekday)) fields[`day-${h.weekday}`] = 'Dia repetido.';
    seen.add(h.weekday);
    if (!TIME.test(h.start) || !TIME.test(h.end)) fields[`day-${h.weekday}`] = 'Horário inválido.';
    else if (h.end <= h.start) fields[`day-${h.weekday}`] = 'O término deve ser após o início.';
  });
  if (Object.keys(fields).length) throw validation(fields);
  const order = (d: number) => (d === 0 ? 7 : d);
  return settingsService.upsertProfessional(ctx, {
    ...existing,
    workingHours: [...hours].sort((a, b) => order(a.weekday) - order(b.weekday)).map((h) => ({ ...h })),
  });
}

/** Motivo da solicitação que significa "deixar de atender" (RequestBlockModal). */
export const STOP_WEEKDAY_REASON = 'Deixar de atender neste dia';

export interface DecisionResult {
  request: BlockRequestRecord;
  /** A alteração de disponibilidade aprovada já foi aplicada à grade? */
  appliedToSchedule: boolean;
}

/**
 * Aprova/recusa uma solicitação (`decideBlockRequest` valida o aprovador). Alteração de
 * disponibilidade APROVADA é aplicada à grade do profissional; bloqueio aprovado passa a valer
 * na Agenda pelo `findConflicts` do core. Pendente nunca altera a agenda.
 */
export function decideRequest(
  ctx: AccessContext,
  id: ID,
  decision: 'aprovada' | 'recusada',
  refusalReason?: string,
): DecisionResult {
  const request = blockRequestService.decideBlockRequest(ctx, id, decision, refusalReason);
  const prof = repositories.professionals.getById(request.professionalId);
  if (prof) {
    logActivity(ctx, `${decision === 'aprovada' ? 'aprovou' : 'recusou'} a solicitação de ${prof.name} (${request.date}).`, decision === 'aprovada' ? 'success' : 'warning');
  }
  if (decision !== 'aprovada' || request.kind !== 'disponibilidade' || request.weekday === undefined || !prof) {
    return { request, appliedToSchedule: false };
  }
  if (!can(ctx, 'profissionais', 'editar', ov())) return { request, appliedToSchedule: false };
  const others = prof.workingHours.filter((w) => w.weekday !== request.weekday);
  const next = request.reason === STOP_WEEKDAY_REASON ? others : [...others, { weekday: request.weekday, start: request.start, end: request.end }];
  saveWorkingHours(ctx, prof.id, next);
  return { request, appliedToSchedule: true };
}
