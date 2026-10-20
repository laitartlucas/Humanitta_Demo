/**
 * App de pré-visualização do design system (sem backend, sem autenticação real).
 *
 * Um único login → interface conforme o perfil (Administrador, Recepcionista, Profissional, Financeiro).
 * O roteador em memória abaixo só DEMONSTRA o comportamento visual. No produto, o perfil vem da sessão
 * autenticada e cada rota/ação é validada no servidor — ocultar menus não é controle de acesso.
 * Ver design_system/documentation/PERMISSIONS.md.
 */
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@ds/components';
import { AppShell, DEMO_USERS, HOME_BY_ROLE, NAV_BY_ROLE, type AppRoute } from '@ds/layouts';
import type { Role } from '@ds/access';
import { LoginScreen } from '@ds/screens/login';
import { DashboardScreen } from '@ds/screens/dashboard';
import { AgendaScreen } from '@ds/screens/agenda';
import { PatientsScreen, PatientProfileScreen } from '@ds/screens/patients';
import { ProfessionalsScreen, ProfessionalProfileScreen } from '@ds/screens/professionals';
import { AttendancesScreen } from '@ds/screens/attendances';
import { FinanceScreen } from '@ds/screens/finance';
import { MessagingScreen } from '@ds/screens/messaging';
import { AiAssistantScreen } from '@ds/screens/ai-assistant';
import { ReportsScreen } from '@ds/screens/reports';
import { SettingsScreen } from '@ds/screens/settings';
import {
  AccessDenied,
  PortalAttendancesScreen,
  PortalCalendarScreen,
  PortalDashboardScreen,
  PortalPatientsScreen,
  PortalProfileScreen,
} from '@ds/screens/professional-portal';

const TITLES: Record<AppRoute, { title: string; breadcrumb: string[] }> = {
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

export function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | undefined>(undefined);

  const navigate = (id: AppRoute) => {
    setPatientId(null);
    setProfessionalId(null);
    setAttendanceId(undefined);
    setRoute(id);
  };

  if (!role) {
    return (
      <ToastProvider>
        <LoginScreen
          onLogin={(r) => {
            setRole(r);
            setRoute(HOME_BY_ROLE[r]);
          }}
        />
      </ToastProvider>
    );
  }

  const user = DEMO_USERS[role];
  const myId = user.professionalId ?? 'prof-lauren';
  const allowed = NAV_BY_ROLE[role].includes(route);

  const openPatient = (id: string) => {
    setRoute('pacientes');
    setPatientId(id);
  };
  const startAttendance = (appointmentId: string) => {
    setRoute('meus-atendimentos');
    setAttendanceId(appointmentId);
  };

  let content: ReactNode;
  if (!allowed) {
    // Espelho visual da resposta 403 do servidor.
    content = <AccessDenied onBack={() => navigate(HOME_BY_ROLE[role])} />;
  } else {
    switch (route) {
      case 'dashboard':
        content = <DashboardScreen onNavigate={navigate} onNewAppointment={() => navigate('agenda')} />;
        break;
      case 'agenda':
        content = <AgendaScreen />;
        break;
      case 'pacientes':
        content = patientId ? (
          <PatientProfileScreen patientId={patientId} onBack={() => setPatientId(null)} onNewAppointment={() => navigate('agenda')} />
        ) : (
          <PatientsScreen onOpenPatient={openPatient} />
        );
        break;
      case 'profissionais':
        content = professionalId ? (
          <ProfessionalProfileScreen professionalId={professionalId} onBack={() => setProfessionalId(null)} />
        ) : (
          <ProfessionalsScreen onOpenProfessional={setProfessionalId} />
        );
        break;
      case 'atendimentos':
        content = <AttendancesScreen onOpenPatient={openPatient} onOpenAgenda={() => navigate('agenda')} />;
        break;
      case 'financeiro':
        content = <FinanceScreen />;
        break;
      case 'whatsapp':
        content = <MessagingScreen />;
        break;
      case 'assistente':
        content = <AiAssistantScreen />;
        break;
      case 'relatorios':
        content = <ReportsScreen />;
        break;
      case 'configuracoes':
        content = <SettingsScreen />;
        break;
      case 'meu-dashboard':
        content = (
          <PortalDashboardScreen
            professionalId={myId}
            onNavigate={navigate}
            onStartAttendance={startAttendance}
            onOpenPatient={() => navigate('meus-pacientes')}
          />
        );
        break;
      case 'minha-agenda':
        content = (
          <PortalCalendarScreen professionalId={myId} onStartAttendance={startAttendance} onOpenPatient={() => navigate('meus-pacientes')} />
        );
        break;
      case 'meus-pacientes':
        content = <PortalPatientsScreen professionalId={myId} onStartAttendance={startAttendance} />;
        break;
      case 'meus-atendimentos':
        content = (
          <PortalAttendancesScreen
            key={attendanceId ?? 'lista'}
            professionalId={myId}
            initialAppointmentId={attendanceId}
            onOpenPatient={() => navigate('meus-pacientes')}
          />
        );
        break;
      case 'meu-perfil':
        content = <PortalProfileScreen professionalId={myId} />;
        break;
    }
  }

  const meta = TITLES[route];
  return (
    <ToastProvider>
      <AppShell
        role={role}
        user={user}
        active={route}
        title={allowed ? meta.title : 'Acesso não autorizado'}
        breadcrumb={meta.breadcrumb}
        onNavigate={navigate}
        onSignOut={() => setRole(null)}
        bleed={allowed && route === 'whatsapp'}
      >
        {content}
      </AppShell>
    </ToastProvider>
  );
}
