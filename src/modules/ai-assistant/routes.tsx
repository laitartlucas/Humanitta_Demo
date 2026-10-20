/** Agente 07 — Assistente IA (simulado). Dono: Agente 07. */
import { AiAssistantScreen } from '@ds/screens/ai-assistant';
import type { ModuleDefinition } from '@app/types';

function AiAssistantPage() {
  return <AiAssistantScreen />;
}

export const aiAssistantModule: ModuleDefinition = {
  id: 'ai-assistant',
  owner: '07',
  routes: [{ routeId: 'assistente', path: '/assistente', element: <AiAssistantPage /> }],
};
