/**
 * Solicitações de bloqueio de horário / alteração de disponibilidade.
 * Profissional SOLICITA (status 'enviada'); quem aprova (clinicSettings.blockApproverRole,
 * padrão admin) decide. Só a aprovação afeta a agenda real.
 */
import type { BlockRequestRecord, ID } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { conflict, forbidden, validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';
import { nowIso } from '../clock';
import { logActivity } from './activity';

const ov = () => r.clinicSettings.get().permissionOverrides;

export type BlockRequestInput = Pick<BlockRequestRecord, 'kind' | 'date' | 'start' | 'end' | 'reason'> &
  Partial<Pick<BlockRequestRecord, 'allDay' | 'weekday' | 'note'>>;

export function requestBlock(ctx: AccessContext, input: BlockRequestInput): BlockRequestRecord {
  assertCan(ctx, 'bloqueio_horario', 'solicitar', ov());
  if (ctx.role !== 'profissional' || !ctx.professionalId) throw forbidden('Somente profissionais solicitam bloqueios.');
  const f: Record<string, string> = {};
  if (!input.reason.trim()) f.reason = 'Informe o motivo.';
  if (!input.allDay && input.start >= input.end) f.end = 'O fim deve ser depois do início.';
  if (Object.keys(f).length) throw validation(f);
  const req = r.blockRequests.create({
    ...input,
    id: newId('req'),
    professionalId: ctx.professionalId,
    status: 'enviada',
    createdAt: nowIso(),
  });
  logActivity(ctx, `solicitou ${input.kind === 'bloqueio' ? 'bloqueio de horário' : 'alteração de disponibilidade'} em ${input.date}.`, 'warning');
  return req;
}

export function decideBlockRequest(
  ctx: AccessContext,
  id: ID,
  decision: 'aprovada' | 'recusada',
  refusalReason?: string,
): BlockRequestRecord {
  if (ctx.role !== r.clinicSettings.get().blockApproverRole) throw forbidden('Somente a administração aprova solicitações.');
  assertCan(ctx, 'bloqueio_horario', 'editar', ov());
  const req = r.blockRequests.require(id);
  if (req.status !== 'enviada') throw conflict('Esta solicitação já foi decidida.');
  if (decision === 'recusada' && !refusalReason?.trim()) throw validation({ refusalReason: 'Informe o motivo da recusa.' });
  const user = r.users.getById(ctx.userId);
  return r.blockRequests.update(id, {
    status: decision,
    decidedAt: nowIso(),
    decidedBy: user ? `${user.name} (${user.title})` : undefined,
    refusalReason: decision === 'recusada' ? refusalReason : undefined,
  });
}

/** O profissional pode cancelar a própria solicitação enquanto pendente. */
export function withdrawBlockRequest(ctx: AccessContext, id: ID): void {
  const req = r.blockRequests.require(id);
  if (ctx.role !== 'profissional' || req.professionalId !== ctx.professionalId) throw forbidden();
  if (req.status !== 'enviada') throw conflict('Solicitação já decidida não pode ser retirada.');
  r.blockRequests.remove(id);
}
