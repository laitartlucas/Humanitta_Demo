import type { ReactNode } from 'react';
import type { AppRoute } from '@ds/layouts';

/**
 * Contrato de rota de módulo. Cada agente declara as próprias rotas em
 * `src/modules/<módulo>/routes.tsx` — o roteador (Integrador) só as registra.
 */
export interface ModuleRoute {
  /** Item de menu ao qual a rota pertence (define permissão, título e item ativo). */
  routeId: AppRoute;
  /** Caminho absoluto, ex.: '/pacientes/:patientId'. */
  path: string;
  element: ReactNode;
  /** Remove padding/max-width do <main> (ex.: WhatsApp). */
  bleed?: boolean;
}

export interface ModuleDefinition {
  /** Identificador do módulo = nome da pasta em src/modules. */
  id: string;
  /** Agente responsável (01–08). */
  owner: string;
  routes: ModuleRoute[];
}
