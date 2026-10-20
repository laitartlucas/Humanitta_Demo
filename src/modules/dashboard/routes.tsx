/** Agente 01 — Dashboard. Rotas e containers do módulo (dono: Agente 01). */
import { DashboardScreen } from '@ds/screens/dashboard';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function DashboardPage() {
  const go = useAppNavigate();
  return <DashboardScreen onNavigate={(route) => go(route)} onNewAppointment={() => go('agenda')} />;
}

export const dashboardModule: ModuleDefinition = {
  id: 'dashboard',
  owner: '01',
  routes: [{ routeId: 'dashboard', path: '/dashboard', element: <DashboardPage /> }],
};
