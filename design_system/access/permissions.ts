/**
 * Humanittá Gestão — perfis de acesso e matriz de permissões (DESIGN / UI).
 *
 * IMPORTANTE: esta matriz decide apenas O QUE A INTERFACE MOSTRA (menus, botões, telas).
 * Ela NÃO é um mecanismo de segurança. Ocultar um menu não impede o acesso: toda leitura e
 * escrita precisa ser autorizada no servidor (backend/API e políticas do banco, ex. RLS),
 * usando o perfil e o vínculo do usuário autenticado. Ver documentation/PERMISSIONS.md.
 */

export type Role = 'admin' | 'recepcao' | 'profissional' | 'financeiro';

export const ROLES: Role[] = ['admin', 'recepcao', 'profissional', 'financeiro'];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  recepcao: 'Recepcionista',
  profissional: 'Profissional de saúde',
  financeiro: 'Financeiro',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: 'Acesso total à gestão da clínica, usuários e configurações.',
  recepcao: 'Agenda, pacientes, atendimento no balcão e WhatsApp.',
  profissional: 'Portal do Profissional: apenas a própria agenda, pacientes e atendimentos.',
  financeiro: 'Receitas, despesas, repasses e relatórios financeiros.',
};

/**
 * Nível de acesso por recurso.
 * - nenhum: recurso invisível e bloqueado
 * - proprio: somente registros vinculados ao próprio profissional
 * - ver: leitura de toda a clínica
 * - editar: leitura e escrita
 * - solicitar: pode pedir a alteração; outra pessoa aprova
 */
export type AccessLevel = 'nenhum' | 'proprio' | 'ver' | 'editar' | 'solicitar';

export type Feature =
  | 'dashboard_clinica'
  | 'agenda_clinica'
  | 'agenda_propria'
  | 'bloqueio_horario'
  | 'pacientes_cadastro'
  | 'pacientes_financeiro'
  | 'profissionais'
  | 'atendimentos'
  | 'registro_clinico'
  | 'financeiro'
  | 'repasses'
  | 'whatsapp'
  | 'assistente_ia'
  | 'relatorios_operacionais'
  | 'relatorios_financeiros'
  | 'configuracoes'
  | 'usuarios_permissoes'
  | 'perfil_proprio';

export interface FeatureMeta {
  id: Feature;
  label: string;
  group: 'Operação' | 'Clínico' | 'Gestão' | 'Sistema';
}

export const FEATURES: FeatureMeta[] = [
  { id: 'dashboard_clinica', label: 'Dashboard da clínica', group: 'Operação' },
  { id: 'agenda_clinica', label: 'Agenda geral', group: 'Operação' },
  { id: 'agenda_propria', label: 'Minha agenda', group: 'Operação' },
  { id: 'bloqueio_horario', label: 'Bloqueio de horário / disponibilidade', group: 'Operação' },
  { id: 'pacientes_cadastro', label: 'Cadastro de pacientes', group: 'Operação' },
  { id: 'whatsapp', label: 'Central WhatsApp', group: 'Operação' },
  { id: 'atendimentos', label: 'Atendimentos (iniciar/finalizar)', group: 'Clínico' },
  { id: 'registro_clinico', label: 'Registro clínico (prontuário)', group: 'Clínico' },
  { id: 'profissionais', label: 'Cadastro de profissionais', group: 'Gestão' },
  { id: 'pacientes_financeiro', label: 'Financeiro do paciente', group: 'Gestão' },
  { id: 'financeiro', label: 'Financeiro geral', group: 'Gestão' },
  { id: 'repasses', label: 'Repasses', group: 'Gestão' },
  { id: 'relatorios_operacionais', label: 'Relatórios de consultas', group: 'Gestão' },
  { id: 'relatorios_financeiros', label: 'Relatórios financeiros', group: 'Gestão' },
  { id: 'assistente_ia', label: 'Assistente IA', group: 'Sistema' },
  { id: 'configuracoes', label: 'Configurações da clínica', group: 'Sistema' },
  { id: 'usuarios_permissoes', label: 'Usuários e permissões', group: 'Sistema' },
  { id: 'perfil_proprio', label: 'Meu perfil', group: 'Sistema' },
];

/** Matriz proposta (padrão de fábrica; a administração pode ajustar em Configurações › Permissões). */
export const PERMISSIONS: Record<Role, Record<Feature, AccessLevel>> = {
  admin: {
    dashboard_clinica: 'ver', agenda_clinica: 'editar', agenda_propria: 'nenhum', bloqueio_horario: 'editar',
    pacientes_cadastro: 'editar', pacientes_financeiro: 'editar', profissionais: 'editar', atendimentos: 'ver',
    registro_clinico: 'nenhum', financeiro: 'editar', repasses: 'editar', whatsapp: 'editar', assistente_ia: 'editar',
    relatorios_operacionais: 'ver', relatorios_financeiros: 'ver', configuracoes: 'editar', usuarios_permissoes: 'editar',
    perfil_proprio: 'editar',
  },
  recepcao: {
    dashboard_clinica: 'ver', agenda_clinica: 'editar', agenda_propria: 'nenhum', bloqueio_horario: 'ver',
    pacientes_cadastro: 'editar', pacientes_financeiro: 'ver', profissionais: 'ver', atendimentos: 'ver',
    registro_clinico: 'nenhum', financeiro: 'nenhum', repasses: 'nenhum', whatsapp: 'editar', assistente_ia: 'ver',
    relatorios_operacionais: 'ver', relatorios_financeiros: 'nenhum', configuracoes: 'nenhum', usuarios_permissoes: 'nenhum',
    perfil_proprio: 'editar',
  },
  profissional: {
    dashboard_clinica: 'nenhum', agenda_clinica: 'nenhum', agenda_propria: 'proprio', bloqueio_horario: 'solicitar',
    pacientes_cadastro: 'proprio', pacientes_financeiro: 'nenhum', profissionais: 'nenhum', atendimentos: 'proprio',
    registro_clinico: 'proprio', financeiro: 'nenhum', repasses: 'proprio', whatsapp: 'nenhum', assistente_ia: 'nenhum',
    relatorios_operacionais: 'proprio', relatorios_financeiros: 'nenhum', configuracoes: 'nenhum', usuarios_permissoes: 'nenhum',
    perfil_proprio: 'editar',
  },
  financeiro: {
    dashboard_clinica: 'ver', agenda_clinica: 'ver', agenda_propria: 'nenhum', bloqueio_horario: 'nenhum',
    pacientes_cadastro: 'ver', pacientes_financeiro: 'editar', profissionais: 'ver', atendimentos: 'ver',
    registro_clinico: 'nenhum', financeiro: 'editar', repasses: 'editar', whatsapp: 'nenhum', assistente_ia: 'nenhum',
    relatorios_operacionais: 'ver', relatorios_financeiros: 'ver', configuracoes: 'nenhum', usuarios_permissoes: 'nenhum',
    perfil_proprio: 'editar',
  },
};

export const ACCESS_LABEL: Record<AccessLevel, string> = {
  nenhum: 'Sem acesso',
  proprio: 'Somente os próprios',
  ver: 'Visualizar',
  editar: 'Editar',
  solicitar: 'Solicitar (requer aprovação)',
};

const RANK: Record<AccessLevel, number> = { nenhum: 0, solicitar: 1, proprio: 2, ver: 3, editar: 4 };

/**
 * Atalho de INTERFACE: o perfil tem pelo menos este nível no recurso?
 * Use para mostrar/ocultar itens. Nunca use como única barreira de segurança.
 */
export function canAccess(role: Role, feature: Feature, min: AccessLevel = 'proprio'): boolean {
  const level = PERMISSIONS[role][feature];
  if (min === 'solicitar') return level !== 'nenhum';
  return level !== 'nenhum' && RANK[level] >= RANK[min];
}

/** Registro está no escopo do usuário? (UI). No servidor, filtre pela mesma regra na consulta. */
export function inOwnScope(role: Role, recordProfessionalId: string, currentProfessionalId?: string): boolean {
  if (role !== 'profissional') return true;
  return Boolean(currentProfessionalId) && recordProfessionalId === currentProfessionalId;
}
