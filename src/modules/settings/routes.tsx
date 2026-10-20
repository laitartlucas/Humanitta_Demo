/** Agente 08 — Configurações. Dono: Agente 08. */
import { SettingsScreen } from '@ds/screens/settings';
import type { ModuleDefinition } from '@app/types';

function SettingsPage() {
  return <SettingsScreen />;
}

export const settingsModule: ModuleDefinition = {
  id: 'settings',
  owner: '08',
  routes: [{ routeId: 'configuracoes', path: '/configuracoes', element: <SettingsPage /> }],
};
