/** Agente 05 — Atendimentos (visão da clínica). Dono: Agente 05. */
import { AttendancesScreen } from '@ds/screens/attendances';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function AttendancesPage() {
  const go = useAppNavigate();
  return <AttendancesScreen onOpenPatient={(id) => go('pacientes', id)} onOpenAgenda={() => go('agenda')} />;
}

export const attendancesModule: ModuleDefinition = {
  id: 'attendances',
  owner: '05',
  routes: [{ routeId: 'atendimentos', path: '/atendimentos', element: <AttendancesPage /> }],
};
