/** Configurações da clínica, cadastros auxiliares, usuários e profissionais. */
import type { AccessLevel, Feature, Role } from '@ds/access';
import type { ClinicSettings, ID, Professional, RoomRecord, ServiceRecord, SpecialtyRecord, UserRecord } from '../domain';
import { assertCan, type AccessContext } from '../access/accessContext';
import { forbidden, validation } from '../errors/AppError';
import { newId, repositories as r } from '../repositories';

const ov = () => r.clinicSettings.get().permissionOverrides;

export function updateClinicSettings(ctx: AccessContext, patch: Partial<Omit<ClinicSettings, 'permissionOverrides'>>): ClinicSettings {
  assertCan(ctx, 'configuracoes', 'editar', ov());
  return r.clinicSettings.update(patch);
}

/** Ajuste da matriz (Configurações › Permissões). Limites de LGPD continuam fixos no core/access. */
export function setPermission(ctx: AccessContext, role: Role, feature: Feature, level: AccessLevel): ClinicSettings {
  assertCan(ctx, 'usuarios_permissoes', 'editar', ov());
  const current = r.clinicSettings.get().permissionOverrides;
  return r.clinicSettings.update({ permissionOverrides: { ...current, [role]: { ...current[role], [feature]: level } } });
}

export function upsertService(ctx: AccessContext, service: Omit<ServiceRecord, 'id'> & { id?: ID }): ServiceRecord {
  assertCan(ctx, 'configuracoes', 'editar', ov());
  if (!service.name.trim()) throw validation({ name: 'Informe o nome do serviço.' });
  if (service.id && r.services.getById(service.id)) return r.services.update(service.id, service);
  return r.services.create({ ...service, id: service.id ?? newId('sv') });
}

export function updateRoom(ctx: AccessContext, id: ID, patch: Partial<Omit<RoomRecord, 'id'>>): RoomRecord {
  assertCan(ctx, 'configuracoes', 'editar', ov());
  return r.rooms.update(id, patch);
}

export function updateSpecialty(ctx: AccessContext, id: SpecialtyRecord['id'], patch: Partial<Omit<SpecialtyRecord, 'id'>>): SpecialtyRecord {
  assertCan(ctx, 'configuracoes', 'editar', ov());
  return r.specialties.update(id, patch);
}

export function upsertUser(ctx: AccessContext, user: Omit<UserRecord, 'id'> & { id?: ID }): UserRecord {
  assertCan(ctx, 'usuarios_permissoes', 'editar', ov());
  if (user.role === 'profissional' && !user.professionalId) {
    throw validation({ professionalId: 'Usuário profissional precisa estar vinculado a um cadastro de profissional.' });
  }
  if (user.id && r.users.getById(user.id)) return r.users.update(user.id, user);
  return r.users.create({ ...user, id: user.id ?? newId('u') });
}

/** Cadastro de profissionais (admin edita; o próprio profissional usa updateOwnProfile). */
export function upsertProfessional(ctx: AccessContext, prof: Omit<Professional, 'id'> & { id?: ID }): Professional {
  assertCan(ctx, 'profissionais', 'editar', ov());
  if (!prof.name.trim()) throw validation({ name: 'Informe o nome.' });
  if (prof.id && r.professionals.getById(prof.id)) {
    const updated = r.professionals.update(prof.id, prof);
    r.appointments.list().filter((a) => a.professionalId === updated.id).forEach((a) => r.appointments.update(a.id, { professionalName: updated.name }));
    return updated;
  }
  return r.professionals.create({ ...prof, id: prof.id ?? newId('prof') });
}

/** "Meu Perfil": o profissional altera apenas dados de apresentação do próprio cadastro. */
export function updateOwnProfile(ctx: AccessContext, patch: Partial<Pick<Professional, 'title' | 'avatarUrl'>>): Professional {
  assertCan(ctx, 'perfil_proprio', 'editar', ov());
  if (!ctx.professionalId) throw forbidden();
  return r.professionals.update(ctx.professionalId, patch);
}
