/**
 * Registro dos módulos. Cada agente declara as rotas em `src/modules/<módulo>/routes.tsx`;
 * este arquivo (Integrador) só lista os módulos — agentes NÃO o editam.
 */
import { dashboardModule } from '@modules/dashboard/routes';
import { agendaModule } from '@modules/agenda/routes';
import { patientsModule } from '@modules/patients/routes';
import { professionalsModule } from '@modules/professionals/routes';
import { portalModule } from '@modules/portal/routes';
import { attendancesModule } from '@modules/attendances/routes';
import { financeModule } from '@modules/finance/routes';
import { messagingModule } from '@modules/messaging/routes';
import { aiAssistantModule } from '@modules/ai-assistant/routes';
import { reportsModule } from '@modules/reports/routes';
import { settingsModule } from '@modules/settings/routes';
import type { ModuleDefinition } from './types';

export const MODULES: ModuleDefinition[] = [
  dashboardModule,
  agendaModule,
  patientsModule,
  professionalsModule,
  portalModule,
  attendancesModule,
  financeModule,
  messagingModule,
  aiAssistantModule,
  reportsModule,
  settingsModule,
];
