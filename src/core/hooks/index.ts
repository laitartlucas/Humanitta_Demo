/**
 * Hooks compartilhados — a forma padrão de uma tela ler e escrever dados.
 *
 *   const appts = useAppointments({ from: todayKey(), to: todayKey() });
 *   const { run, loading } = useAction(appointmentService.cancelAppointment, { success: 'Consulta cancelada' });
 *   await run(id, motivo);   // ctx é injetado automaticamente; erro vira toast
 */
import { useCallback, useMemo, useState, type DependencyList } from 'react';
import type { AccessLevel, Feature } from '@ds/access';
import { useToast } from '@ds/components';
import type { Database, ID, UserRecord } from '../domain';
import { can, type AccessContext } from '../access/accessContext';
import { db } from '../store/database';
import { useStoreSelector } from '../store/useStoreSelector';
import { selectCurrentUser, session, signInDemo, signOutDemo, toAccessContext } from '../session/session';
import { AppError, toAppError } from '../errors/AppError';
import * as sel from '../selectors';

/* ------------------------------ Base ------------------------------ */

/** Leitura crua do banco (sem escopo). Prefira `useQuery`, que aplica o contexto de acesso. */
export function useDb<T>(selector: (s: Database) => T): T {
  return useStoreSelector(db, selector);
}

export interface SessionValue {
  user: UserRecord | null;
  ctx: AccessContext | null;
  signIn: typeof signInDemo;
  signOut: typeof signOutDemo;
}

/** Sessão demonstrativa (perfil fictício escolhido no login). */
export function useSession(): SessionValue {
  const userId = useStoreSelector(session, (s) => s.userId);
  const user = useDb(useCallback((s: Database) => selectCurrentUser(s, { version: 1, userId }), [userId]));
  const ctx = useMemo(() => (user ? toAccessContext(user) : null), [user]);
  return { user, ctx, signIn: signInDemo, signOut: signOutDemo };
}

/** Contexto de acesso (somente dentro de rotas protegidas). */
export function useAccessContext(): AccessContext {
  const { ctx } = useSession();
  if (!ctx) throw new AppError('UNAUTHENTICATED', 'Sessão encerrada. Entre novamente.');
  return ctx;
}

/**
 * Consulta com escopo: o seletor recebe (estado, ctx). Passe `deps` com os argumentos usados
 * pelo seletor (filtros etc.) para manter a referência do resultado estável entre renders.
 */
export function useQuery<T>(selector: (s: Database, ctx: AccessContext) => T, deps: DependencyList = []): T {
  const ctx = useAccessContext();
  const bound = useCallback((s: Database) => selector(s, ctx), [ctx, ...deps]);
  return useDb(bound);
}

/** Permissão de INTERFACE (mostrar/ocultar). Os serviços revalidam. */
export function useCan(feature: Feature, min: AccessLevel = 'proprio'): boolean {
  const ctx = useAccessContext();
  const overrides = useDb((s) => s.clinicSettings.permissionOverrides);
  return can(ctx, feature, min, overrides);
}

export interface ActionOptions {
  /** Toast de sucesso (título). Omitido = sem toast de sucesso. */
  success?: string;
  /** Mostra toast de erro automaticamente (padrão true). */
  toastOnError?: boolean;
}

/**
 * Executa um serviço injetando o contexto, com loading e tratamento de erro padronizados.
 * `run` devolve o resultado ou `undefined` em caso de erro (que fica em `error`).
 */
export function useAction<A extends unknown[], R>(
  service: (ctx: AccessContext, ...args: A) => R,
  options: ActionOptions = {},
) {
  const ctx = useAccessContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { success, toastOnError = true } = options;

  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = service(ctx, ...args);
        if (success) toast({ tone: 'success', title: success });
        return result;
      } catch (e) {
        const err = toAppError(e);
        setError(err);
        if (toastOnError) toast({ tone: 'danger', title: 'Não foi possível concluir', description: err.message });
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [ctx, service, success, toastOnError, toast],
  );

  return { run, loading, error, clearError: () => setError(null) };
}

/* --------------------------- Por domínio --------------------------- */

export const useAppointments = (f: sel.AppointmentFilters = {}) =>
  useQuery((s, c) => sel.selectAppointments(s, c, f), [JSON.stringify(f)]);

export const useAppointment = (id: ID | undefined) =>
  useQuery((s, c) => (id ? sel.selectAppointments(s, c).find((a) => a.id === id) : undefined), [id]);

export const useDayOverview = (dateKey?: string) => useQuery((s, c) => sel.selectDayOverview(s, c, dateKey), [dateKey]);

export const usePatients = () => useQuery(sel.selectPatients);
export const usePatient = (id: ID | undefined) =>
  useQuery((s, c) => (id ? sel.selectPatients(s, c).find((p) => p.id === id) : undefined), [id]);
/** Portal: pacientes do profissional logado em dados mínimos. */
export const useMyPatients = () => useQuery(sel.selectMyPatients);

export const useProfessionals = () => useDb((s) => s.professionals);
export const useProfessional = (id: ID | undefined) => useDb(useCallback((s: Database) => (id ? sel.selectProfessionalById(s, id) : undefined), [id]));
export const useUsers = () => useDb((s) => s.users);
export const useSpecialties = () => useDb((s) => s.specialties);
export const useServices = () => useDb((s) => s.services);
export const useRooms = () => useDb((s) => s.rooms);

export const useAttendances = () => useQuery(sel.selectAttendances);
export const useClinicalRecords = (patientId?: ID) => useQuery((s, c) => sel.selectClinicalRecords(s, c, patientId), [patientId]);

export const useFinancialEntries = () => useQuery(sel.selectFinancialEntries);
export const useFinanceTotals = (monthKey?: string) => useQuery((s, c) => sel.selectFinanceTotals(s, c, monthKey), [monthKey]);
export const useMyPayouts = () => useQuery(sel.selectMyPayouts);

export const useConversations = () => useQuery(sel.selectConversations);
export const useMessages = (conversationId: ID) => useQuery((s, c) => sel.selectMessages(s, c, conversationId), [conversationId]);
export const useUnreadCount = () => useDb(sel.selectUnreadCount);

export const useBlockRequests = () => useQuery(sel.selectBlockRequests);
export const useActivity = () => useDb((s) => s.activity);
export const useAiConfig = () => useDb((s) => s.aiConfig);
export const useClinicSettings = () => useDb((s) => s.clinicSettings);
