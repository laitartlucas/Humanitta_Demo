/**
 * Agente 05 — hooks de leitura e ações do módulo de Atendimentos (sobre `useQuery`/`useAction` do core).
 * Reaproveitáveis pelo Portal do Profissional: `import { useAttendanceViews } from '@modules/attendances'`.
 */
import { useMemo } from 'react';
import { todayKey, useAction, useClinicalRecords, useDb, useQuery, useAccessContext } from '@core';
import type { ID } from '@core';
import * as attendanceFlow from './flow';
import { availableActions, runningByProfessional, selectAttendanceViews, type AttendanceView } from './model';

/** Todas as visões de atendimento no escopo do perfil logado. */
export const useAttendanceViews = () => useQuery(selectAttendanceViews);

/** Ações disponíveis (interface) para cada visão. */
export function useAttendanceAvailability(views: AttendanceView[]) {
  const ctx = useAccessContext();
  const clinicSettings = useDb((s) => s.clinicSettings);
  return useMemo(() => {
    const running = runningByProfessional(views);
    const today = todayKey();
    return (v: AttendanceView) => availableActions(v, ctx, { clinicSettings }, today, running.get(v.professionalId));
  }, [views, ctx, clinicSettings]);
}

/** Registro demonstrativo do atendimento — o core só devolve os do próprio profissional. */
export function useDemoRecord(appointmentId: ID | undefined) {
  const records = useClinicalRecords();
  return useMemo(() => (appointmentId ? records.find((r) => r.appointmentId === appointmentId) : undefined), [records, appointmentId]);
}

/** Ações do fluxo com toast de sucesso/erro padronizado. */
export function useAttendanceFlow() {
  const checkIn = useAction(attendanceFlow.registerArrival, { success: 'Chegada registrada' });
  const start = useAction(attendanceFlow.beginAttendance, { success: 'Atendimento iniciado' });
  const finish = useAction(attendanceFlow.completeAttendance, { success: 'Atendimento concluído' });
  const noShow = useAction(attendanceFlow.registerNoShow, { success: 'Falta registrada' });
  const record = useAction(attendanceFlow.saveDemoRecord, { success: 'Registro demonstrativo salvo' });
  return { checkIn, start, finish, noShow, record };
}
