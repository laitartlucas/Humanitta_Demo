/**
 * Mapa único rota ↔ caminho. Telas e módulos navegam por `AppRoute`, nunca por string solta.
 * Somente o Integrador altera este arquivo.
 */
import type { AppRoute } from '@ds/layouts';

export const ROUTE_PATHS: Record<AppRoute, string> = {
  dashboard: '/dashboard',
  agenda: '/agenda',
  pacientes: '/pacientes',
  profissionais: '/profissionais',
  atendimentos: '/atendimentos',
  financeiro: '/financeiro',
  whatsapp: '/whatsapp',
  assistente: '/assistente',
  relatorios: '/relatorios',
  configuracoes: '/configuracoes',
  'meu-dashboard': '/portal/dashboard',
  'minha-agenda': '/portal/agenda',
  'meus-pacientes': '/portal/pacientes',
  'meus-atendimentos': '/portal/atendimentos',
  'meu-perfil': '/portal/perfil',
};

export const LOGIN_PATH = '/login';

export const ROUTE_TITLES: Record<AppRoute, { title: string; breadcrumb: string[] }> = {
  dashboard: { title: 'Dashboard', breadcrumb: ['Início'] },
  agenda: { title: 'Agenda', breadcrumb: ['Operação'] },
  pacientes: { title: 'Pacientes', breadcrumb: ['Cadastros'] },
  profissionais: { title: 'Profissionais', breadcrumb: ['Equipe'] },
  atendimentos: { title: 'Atendimentos', breadcrumb: ['Operação'] },
  financeiro: { title: 'Financeiro', breadcrumb: ['Gestão'] },
  whatsapp: { title: 'Central WhatsApp', breadcrumb: ['Atendimento'] },
  assistente: { title: 'Assistente IA', breadcrumb: ['Atendimento'] },
  relatorios: { title: 'Relatórios', breadcrumb: ['Gestão'] },
  configuracoes: { title: 'Configurações', breadcrumb: ['Sistema'] },
  'meu-dashboard': { title: 'Meu Dashboard', breadcrumb: ['Portal do Profissional'] },
  'minha-agenda': { title: 'Minha Agenda', breadcrumb: ['Portal do Profissional'] },
  'meus-pacientes': { title: 'Meus Pacientes', breadcrumb: ['Portal do Profissional'] },
  'meus-atendimentos': { title: 'Meus Atendimentos', breadcrumb: ['Portal do Profissional'] },
  'meu-perfil': { title: 'Meu Perfil', breadcrumb: ['Portal do Profissional'] },
};

/** Caminho com parâmetro opcional: routePath('pacientes', 'pac-01') → '/pacientes/pac-01'. */
export function routePath(route: AppRoute, param?: string): string {
  return param ? `${ROUTE_PATHS[route]}/${encodeURIComponent(param)}` : ROUTE_PATHS[route];
}
