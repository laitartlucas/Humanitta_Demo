/**
 * Portal do Profissional — leitura dos dados do profissional LOGADO a partir do `@core`.
 *
 * O `professionalId` vem SEMPRE do contexto de acesso da sessão (nunca de props/URL). Os seletores
 * do core já aplicam o escopo `proprio`; o filtro extra por `professionalId` é defesa em
 * profundidade caso a tela seja montada por outro perfil.
 */
import { useCallback, useMemo } from 'react';
import {
  nowIso,
  toPortalAppointment,
  useAccessContext,
  useAppointments,
  useBlockRequests,
  useClinicalRecords,
  useMyPatients,
  useProfessional,
  useQuery,
  useRooms,
  useSession,
} from '@core';
import type { Database, Professional, UserRecord } from '@core';
import type { AccessContext } from '@core';
import type { PortalAppointment, PortalPatient } from '@ds/mocks/portal';
import { selectRestrictedMarkers, type RestrictedMarker } from './portalData';

export interface MyProfessional {
  professionalId: string;
  professional: Professional | undefined;
  user: UserRecord | null;
}

/** Profissional vinculado ao usuário da sessão. */
export function useMyProfessional(): MyProfessional {
  const { professionalId = '' } = useAccessContext();
  const { user } = useSession();
  const professional = useProfessional(professionalId || undefined);
  return { professionalId, professional, user };
}

/** Consultas do profissional logado, sem valores financeiros (DTO do portal). */
export function useMyAppointments(): PortalAppointment[] {
  const { professionalId } = useAccessContext();
  const list = useAppointments();
  return useMemo(
    () => (professionalId ? list.filter((a) => a.professionalId === professionalId).map(toPortalAppointment) : []),
    [list, professionalId],
  );
}

/** Solicitações de bloqueio/disponibilidade do profissional logado (mais recentes primeiro). */
export function useMyBlockRequests() {
  const { professionalId } = useAccessContext();
  const list = useBlockRequests();
  return useMemo(() => list.filter((r) => r.professionalId === professionalId), [list, professionalId]);
}

/** Pacientes vinculados (dados mínimos), indexados por id. */
export function useMyPatientsById(): { patients: PortalPatient[]; byId: Map<string, PortalPatient> } {
  const patients = useMyPatients();
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  return { patients, byId };
}

/** Prontuário próprio (o core devolve vazio para qualquer outro perfil). */
export const useMyClinicalRecords = useClinicalRecords;

/** Marcadores de atendimentos de outros profissionais com os meus pacientes (somente existência). */
export function useRestrictedMarkers(): RestrictedMarker[] {
  return useQuery(useCallback((s: Database, ctx: AccessContext) => selectRestrictedMarkers(s, ctx, nowIso()), []));
}

/** Nome da sala a partir do cadastro compartilhado. */
export function useRoomName(): (roomId: string | undefined) => string {
  const rooms = useRooms();
  return useCallback((roomId) => rooms.find((r) => r.id === roomId)?.name ?? '—', [rooms]);
}
