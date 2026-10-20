/**
 * Agente 04 — Portal do Profissional. Dono: Agente 04.
 * O `professionalId` vem SEMPRE da sessão (useAccessContext), nunca da URL nem de props externas.
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
      professionalId={professionalId}
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
      professionalId={professionalId}
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
      professionalId={professionalId}
      initialPatientId={patientId}
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
      professionalId={professionalId}
      initialAppointmentId={appointmentId}
      onOpenPatient={(id) => go('meus-pacientes', id)}
    />
  );
}

function PortalProfilePage() {
  const professionalId = useMyProfessionalId();
  const canRequest = useCan('bloqueio_horario', 'solicitar');
  return <PortalProfileScreen key={professionalId} professionalId={professionalId} canRequestChanges={canRequest} />;
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
