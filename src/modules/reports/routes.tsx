/** Agente 08 — Relatórios. Dono: Agente 08. */
import { ReportsScreen } from '@ds/screens/reports';
import type { ModuleDefinition } from '@app/types';

function ReportsPage() {
  return <ReportsScreen />;
}

export const reportsModule: ModuleDefinition = {
  id: 'reports',
  owner: '08',
  routes: [{ routeId: 'relatorios', path: '/relatorios', element: <ReportsPage /> }],
};
