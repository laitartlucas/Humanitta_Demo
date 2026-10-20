import type { ActivityEvent } from '../domain';
import type { AccessContext } from '../access/accessContext';
import { newId, repositories as r } from '../repositories';
import { nowIso } from '../clock';

/** Registra um evento no feed "Atividades recentes" do Dashboard (máx. 50). */
export function logActivity(ctx: AccessContext | null, what: string, tone: ActivityEvent['tone'] = 'neutral'): void {
  const who = ctx ? (r.users.getById(ctx.userId)?.name ?? 'Usuário') : 'Sistema';
  const event: ActivityEvent = { id: newId('ev'), who, what, at: nowIso(), tone };
  r.activity.replaceAll([event, ...r.activity.list()].slice(0, 50));
}
