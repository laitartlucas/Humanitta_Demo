/** Agente 02 — Agenda da clínica. Rotas e containers do módulo (dono: Agente 02). */
import { AgendaScreen } from '@ds/screens/agenda';
import type { ModuleDefinition } from '@app/types';

function AgendaPage() {
  return <AgendaScreen />;
}

export const agendaModule: ModuleDefinition = {
  id: 'agenda',
  owner: '02',
  routes: [{ routeId: 'agenda', path: '/agenda', element: <AgendaPage /> }],
};
