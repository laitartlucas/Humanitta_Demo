/** Agente 01 — Dashboard. Rotas e containers do módulo (dono: Agente 01). */
import { useMemo, useState } from 'react';
import { NAV_BY_ROLE } from '@ds/layouts';
import { DashboardScreen, type DashboardRoute } from '@ds/screens/dashboard';
import { now, useCan, useQuery, useSession } from '@core';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';
import { selectDashboard, type DashboardPeriod } from './dashboardData';

const SHORTCUTS: DashboardRoute[] = ['agenda', 'pacientes', 'atendimentos', 'whatsapp', 'financeiro'];

function DashboardPage() {
  const go = useAppNavigate();
  const { user } = useSession();
  // Filtro de período é estado de INTERFACE (local); os dados vêm do banco compartilhado.
  const [period, setPeriod] = useState<DashboardPeriod>('dia');
  const ref = useMemo(() => now(), []);
  const data = useQuery((s, ctx) => selectDashboard(s, ctx, period, ref), [period, ref]);
  const canCreateAppointment = useCan('agenda_clinica', 'editar');

  const role = user?.role;
  const allowedRoutes = useMemo(
    () => (role ? SHORTCUTS.filter((r) => NAV_BY_ROLE[role].includes(r)) : []),
    [role],
  );

  return (
    <DashboardScreen
      data={data}
      period={period}
      onPeriodChange={setPeriod}
      userName={user?.name.split(' ')[0] ?? ''}
      now={ref}
      allowedRoutes={allowedRoutes}
      canCreateAppointment={canCreateAppointment}
      onNavigate={(route) => go(route)}
      onNewAppointment={() => go('agenda')}
    />
  );
}

export const dashboardModule: ModuleDefinition = {
  id: 'dashboard',
  owner: '01',
  routes: [{ routeId: 'dashboard', path: '/dashboard', element: <DashboardPage /> }],
};
