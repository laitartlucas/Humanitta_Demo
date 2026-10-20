/** Agente 07 — Central WhatsApp (simulada). Dono: Agente 07. */
import { MessagingScreen } from '@ds/screens/messaging';
import type { ModuleDefinition } from '@app/types';

function MessagingPage() {
  return <MessagingScreen />;
}

export const messagingModule: ModuleDefinition = {
  id: 'messaging',
  owner: '07',
  routes: [{ routeId: 'whatsapp', path: '/whatsapp', element: <MessagingPage />, bleed: true }],
};
