import type { Role } from '@ds/access';
import {
  BarChart3,
  Bot,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  CalendarClock,
  ClipboardCheck,
  House,
  Settings,
  Stethoscope,
  CircleUserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type RouteId =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'profissionais'
  | 'atendimentos'
  | 'financeiro'
  | 'whatsapp'
  | 'assistente'
  | 'relatorios'
  | 'configuracoes';

export interface NavItem {
  id: RouteId;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'profissionais', label: 'Profissionais', icon: Stethoscope },
  { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, badge: 4 },
  { id: 'assistente', label: 'Assistente IA', icon: Bot },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

/** Itens da bottom-nav (< md). O 5º slot é o botão "Menu". */
export const MOBILE_NAV_IDS: RouteId[] = ['dashboard', 'agenda', 'pacientes', 'whatsapp'];

/** Rotas exclusivas do Portal do Profissional. */
export type PortalRouteId = 'meu-dashboard' | 'minha-agenda' | 'meus-pacientes' | 'meus-atendimentos' | 'meu-perfil';

/** Qualquer rota da aplicação. */
export type AppRoute = RouteId | PortalRouteId;

export interface AppNavItem {
  id: AppRoute;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

/** Sidebar simplificada do Portal do Profissional. */
export const PORTAL_NAV_ITEMS: AppNavItem[] = [
  { id: 'meu-dashboard', label: 'Meu Dashboard', icon: House },
  { id: 'minha-agenda', label: 'Minha Agenda', icon: CalendarClock },
  { id: 'meus-pacientes', label: 'Meus Pacientes', icon: Users },
  { id: 'meus-atendimentos', label: 'Meus Atendimentos', icon: ClipboardCheck },
  { id: 'meu-perfil', label: 'Meu Perfil', icon: CircleUserRound },
];

/**
 * Menu por perfil (somente apresentação — a autorização real acontece no servidor).
 * Matriz completa em '@ds/access' e documentation/PERMISSIONS.md.
 */
export const NAV_BY_ROLE: Record<Role, AppRoute[]> = {
  admin: ['dashboard', 'agenda', 'pacientes', 'profissionais', 'atendimentos', 'financeiro', 'whatsapp', 'assistente', 'relatorios', 'configuracoes'],
  recepcao: ['dashboard', 'agenda', 'pacientes', 'profissionais', 'atendimentos', 'whatsapp', 'relatorios'],
  profissional: ['meu-dashboard', 'minha-agenda', 'meus-pacientes', 'meus-atendimentos', 'meu-perfil'],
  financeiro: ['dashboard', 'financeiro', 'pacientes', 'relatorios'],
};

/** Bottom-nav (< md) por perfil: até 4 atalhos + botão Menu. */
export const MOBILE_NAV_BY_ROLE: Record<Role, AppRoute[]> = {
  admin: ['dashboard', 'agenda', 'pacientes', 'whatsapp'],
  recepcao: ['dashboard', 'agenda', 'pacientes', 'whatsapp'],
  profissional: ['meu-dashboard', 'minha-agenda', 'meus-pacientes', 'meus-atendimentos'],
  financeiro: ['dashboard', 'financeiro', 'pacientes', 'relatorios'],
};

/** Rota inicial após o login, por perfil. */
export const HOME_BY_ROLE: Record<Role, AppRoute> = {
  admin: 'dashboard',
  recepcao: 'agenda',
  profissional: 'meu-dashboard',
  financeiro: 'financeiro',
};

const ALL_NAV: AppNavItem[] = [...NAV_ITEMS, ...PORTAL_NAV_ITEMS];

export function getNavItems(role: Role): AppNavItem[] {
  return NAV_BY_ROLE[role].map((id) => ALL_NAV.find((n) => n.id === id)).filter((n): n is AppNavItem => Boolean(n));
}

export function getMobileNavItems(role: Role): AppNavItem[] {
  return MOBILE_NAV_BY_ROLE[role].map((id) => ALL_NAV.find((n) => n.id === id)).filter((n): n is AppNavItem => Boolean(n));
}

export interface DemoUser {
  name: string;
  role: string;
  initials: string;
  /** Vínculo com o cadastro de profissional (somente perfil profissional). */
  professionalId?: string;
}

/** Usuários fictícios por perfil (demo). A Dra. Lauren é a profissional real divulgada pela clínica. */
export const DEMO_USERS: Record<Role, DemoUser> = {
  admin: { name: 'Camila S.', role: 'Administradora', initials: 'CS' },
  recepcao: { name: 'Juliana P.', role: 'Recepcionista', initials: 'JP' },
  profissional: { name: 'Dra. Lauren Bertocchi', role: 'Ortodontista', initials: 'LB', professionalId: 'prof-lauren' },
  financeiro: { name: 'Marcelo T.', role: 'Financeiro', initials: 'MT' },
};

/** Usuário fictício padrão (administradora). */
export const DEMO_USER = DEMO_USERS.admin;
