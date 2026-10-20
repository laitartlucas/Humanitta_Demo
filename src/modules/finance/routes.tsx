/** Agente 06 — Financeiro. Dono: Agente 06. */
import { FinanceScreen } from '@ds/screens/finance';
import type { ModuleDefinition } from '@app/types';

function FinancePage() {
  return <FinanceScreen />;
}

export const financeModule: ModuleDefinition = {
  id: 'finance',
  owner: '06',
  routes: [{ routeId: 'financeiro', path: '/financeiro', element: <FinancePage /> }],
};
