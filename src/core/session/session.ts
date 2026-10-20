/**
 * Sessão DEMONSTRATIVA: guarda apenas qual perfil fictício está "logado".
 *
 * ⚠️ Isto NÃO é autenticação. Não há senha verificada, token nem expiração. Serve para a
 * apresentação comercial alternar entre perfis (inclusive entre profissionais diferentes) e
 * testar o filtro por professionalId. No produto, a sessão vem do servidor (cookie httpOnly /
 * token) e o perfil nunca é escolhido no formulário.
 */
import type { Role } from '@ds/access';
import { DEFAULT_DEMO_USER_BY_ROLE } from '../data/seed';
import type { Database, ID, UserRecord } from '../domain';
import type { AccessContext } from '../access/accessContext';
import { createStore } from '../store/createStore';
import { clearPersisted, loadPersisted, persistStore, type PersistOptions } from '../store/persistence';
import { db } from '../store/database';
import { AppError } from '../errors/AppError';

export interface SessionState {
  version: 1;
  userId: ID | null;
}

export const SESSION_STORAGE_KEY = 'humanitta:demo:session';

const opts: PersistOptions<SessionState> = { key: SESSION_STORAGE_KEY, version: 1, getVersion: (s) => s.version };

export const session = createStore<SessionState>(loadPersisted(opts) ?? { version: 1, userId: null });
persistStore(session, { ...opts, debounceMs: 0 });

/** Entra como um usuário fictício. Sem `userId`, usa o usuário padrão do perfil. */
export function signInDemo(role: Role, userId?: ID): UserRecord {
  const id = userId ?? DEFAULT_DEMO_USER_BY_ROLE[role];
  const user = db.getState().users.find((u) => u.id === id);
  if (!user || user.role !== role) throw new AppError('UNAUTHENTICATED', 'Perfil de demonstração inválido.');
  if (user.status !== 'ativo') throw new AppError('UNAUTHENTICATED', 'Este usuário está inativo.');
  session.setState((s) => ({ ...s, userId: user.id }));
  return user;
}

export function signOutDemo(): void {
  session.setState((s) => ({ ...s, userId: null }));
  clearPersisted(SESSION_STORAGE_KEY);
}

/** Usuário logado (ou null). */
export function selectCurrentUser(state: Database, s: SessionState): UserRecord | null {
  if (!s.userId) return null;
  return state.users.find((u) => u.id === s.userId && u.status === 'ativo') ?? null;
}

/** Contexto de acesso do usuário logado. Perfil profissional sem vínculo é rejeitado. */
export function toAccessContext(user: UserRecord): AccessContext {
  if (user.role === 'profissional' && !user.professionalId) {
    throw new AppError('FORBIDDEN', 'Usuário profissional sem vínculo com um cadastro de profissional.');
  }
  return {
    userId: user.id,
    role: user.role,
    professionalId: user.role === 'profissional' ? user.professionalId : undefined,
  };
}

/** Contexto atual fora do React (serviços chamados por eventos). Lança 401 sem sessão. */
export function requireAccessContext(): AccessContext {
  const user = selectCurrentUser(db.getState(), session.getState());
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sessão encerrada. Entre novamente.');
  return toAccessContext(user);
}
