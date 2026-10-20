/** Agente 06 — Financeiro. Dono: Agente 06. */
import { FinanceScreen } from '@ds/screens/finance';
import type { ModuleDefinition } from '@app/types';
import { useAppNavigate } from '@app/navigation';

function FinancePage() {
  const go = useAppNavigate();
  return <FinanceScreen onOpenPatient={(patientId) => go('pacientes', patientId)} />;
}

export const financeModule: ModuleDefinition = {
  id: 'finance',
  owner: '06',
  routes: [{ routeId: 'financeiro', path: '/financeiro', element: <FinancePage /> }],
};
