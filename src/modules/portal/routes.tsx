/**
 * Agente 04 — Portal do Profissional. Dono: Agente 04.
 * O `professionalId` vem SEMPRE da sessão: as telas leem o profissional logado pelos hooks do core
 * (useMyProfessional / useAppointments com escopo próprio) e não aceitam id por prop nem pela URL.
 * O `key` por profissional zera o estado de interface ao trocar de perfil no login demonstrativo.
 */
import { useParams } from 'react-router-dom';
import {
  PortalAttendancesScreen,
  PortalCalendarScreen,
  PortalDashboardScreen,
  PortalPatientsScreen,
  PortalProfileScreen,
} from '@ds/screens/professional-portal';
import { useAccessContext, useCan } from '@core';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function useMyProfessionalId(): string {
  // O RouteGuard só libera estas rotas ao perfil profissional, e toAccessContext recusa
  // usuário profissional sem vínculo — então professionalId sempre existe aqui.
  return useAccessContext().professionalId ?? '';
}

function PortalDashboardPage() {
  const professionalId = useMyProfessionalId();
  const go = useAppNavigate();
  return (
    <PortalDashboardScreen
      key={professionalId}
      onNavigate={(route) => go(route)}
      onStartAttendance={(id) => go('meus-atendimentos', id)}
      onOpenPatient={(id) => go('meus-pacientes', id)}
    />
  );
}

function PortalCalendarPage() {
  const professionalId = useMyProfessionalId();
  const canRequest = useCan('bloqueio_horario', 'solicitar');
  const go = useAppNavigate();
  return (
    <PortalCalendarScreen
      key={professionalId}
      canRequestChanges={canRequest}
      onStartAttendance={(id) => go('meus-atendimentos', id)}
      onOpenPatient={(id) => go('meus-pacientes', id)}
    />
  );
}

function PortalPatientsPage() {
  const professionalId = useMyProfessionalId();
  const { patientId } = useParams();
  const go = useAppNavigate();
  return (
    <PortalPatientsScreen
      key={`${professionalId}:${patientId ?? 'lista'}`}
      initialPatientId={patientId}
      onBackToList={() => go('meus-pacientes')}
      onStartAttendance={(id) => go('meus-atendimentos', id)}
    />
  );
}

function PortalAttendancesPage() {
  const professionalId = useMyProfessionalId();
  const { appointmentId } = useParams();
  const go = useAppNavigate();
  return (
    <PortalAttendancesScreen
      key={`${professionalId}:${appointmentId ?? 'lista'}`}
      initialAppointmentId={appointmentId}
      onBackToList={() => go('meus-atendimentos')}
      onOpenPatient={(id) => go('meus-pacientes', id)}
    />
  );
}

function PortalProfilePage() {
  const professionalId = useMyProfessionalId();
  const canRequest = useCan('bloqueio_horario', 'solicitar');
  return <PortalProfileScreen key={professionalId} canRequestChanges={canRequest} />;
}

export const portalModule: ModuleDefinition = {
  id: 'portal',
  owner: '04',
  routes: [
    { routeId: 'meu-dashboard', path: '/portal/dashboard', element: <PortalDashboardPage /> },
    { routeId: 'minha-agenda', path: '/portal/agenda', element: <PortalCalendarPage /> },
    { routeId: 'meus-pacientes', path: '/portal/pacientes', element: <PortalPatientsPage /> },
    { routeId: 'meus-pacientes', path: '/portal/pacientes/:patientId', element: <PortalPatientsPage /> },
    { routeId: 'meus-atendimentos', path: '/portal/atendimentos', element: <PortalAttendancesPage /> },
    { routeId: 'meus-atendimentos', path: '/portal/atendimentos/:appointmentId', element: <PortalAttendancesPage /> },
    { routeId: 'meu-perfil', path: '/portal/perfil', element: <PortalProfilePage /> },
  ],
};
