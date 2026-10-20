/**
 * Contexto de acesso usado por TODO serviço e seletor com escopo.
 *
 * Na demonstração ele vem do perfil fictício escolhido no login (session store). No produto ele
 * vem do token autenticado, no SERVIDOR — o cliente nunca informa role/professionalId.
 * As checagens abaixo ESPELHAM o que o backend fará (403); não são segurança de produção.
 */
import { PERMISSIONS, type AccessLevel, type Feature, type Role } from '@ds/access';
import type { ClinicSettings, ID } from '../domain';
import { forbidden } from '../errors/AppError';

export interface AccessContext {
  userId: ID;
  role: Role;
  /** Presente se, e somente se, role === 'profissional'. */
  professionalId?: ID;
}

const RANK: Record<AccessLevel, number> = { nenhum: 0, solicitar: 1, proprio: 2, ver: 3, editar: 4 };

/** Limites fixos (LGPD / sigilo profissional) — nenhuma configuração os altera. */
const LOCKED: Partial<Record<Feature, Partial<Record<Role, AccessLevel>>>> = {
  registro_clinico: { admin: 'nenhum', recepcao: 'nenhum', financeiro: 'nenhum', profissional: 'proprio' },
  financeiro: { profissional: 'nenhum' },
  relatorios_financeiros: { profissional: 'nenhum' },
  pacientes_financeiro: { profissional: 'nenhum' },
};

/** Nível efetivo: matriz de fábrica → ajustes de Configurações → limites fixos. */
export function effectiveLevel(
  role: Role,
  feature: Feature,
  overrides: ClinicSettings['permissionOverrides'] = {},
): AccessLevel {
  return LOCKED[feature]?.[role] ?? overrides[role]?.[feature] ?? PERMISSIONS[role][feature];
}

/** O perfil tem pelo menos `min` em `feature`? (mesma semântica de `canAccess` do @ds/access). */
export function can(
  ctx: Pick<AccessContext, 'role'>,
  feature: Feature,
  min: AccessLevel = 'proprio',
  overrides?: ClinicSettings['permissionOverrides'],
): boolean {
  const level = effectiveLevel(ctx.role, feature, overrides);
  if (level === 'nenhum') return false;
  if (min === 'solicitar') return true;
  return RANK[level] >= RANK[min];
}

/** Lança FORBIDDEN (espelho do 403) se o perfil não tiver o nível mínimo. */
export function assertCan(
  ctx: AccessContext,
  feature: Feature,
  min: AccessLevel = 'proprio',
  overrides?: ClinicSettings['permissionOverrides'],
): void {
  if (!can(ctx, feature, min, overrides)) throw forbidden();
}

/** O nível do perfil neste recurso é restrito aos próprios registros? */
export function isOwnScope(ctx: AccessContext, feature: Feature, overrides?: ClinicSettings['permissionOverrides']): boolean {
  return effectiveLevel(ctx.role, feature, overrides) === 'proprio';
}

/**
 * Filtra registros pelo escopo do contexto. Para nível 'proprio', mantém só os do
 * `ctx.professionalId` (sem professionalId → lista vazia, nunca "tudo").
 */
export function scopeByProfessional<T extends { professionalId: ID }>(
  ctx: AccessContext,
  feature: Feature,
  items: T[],
  overrides?: ClinicSettings['permissionOverrides'],
): T[] {
  const level = effectiveLevel(ctx.role, feature, overrides);
  if (level === 'nenhum' || level === 'solicitar') return [];
  if (level === 'proprio') return ctx.professionalId ? items.filter((i) => i.professionalId === ctx.professionalId) : [];
  return items;
}
