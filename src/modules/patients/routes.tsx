/** Agente 03 — Pacientes. Rotas e containers do módulo (dono: Agente 03). */
import { useParams } from 'react-router-dom';
import { PatientProfileScreen, PatientsScreen } from '@ds/screens/patients';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function PatientsPage() {
  const go = useAppNavigate();
  return <PatientsScreen onOpenPatient={(id) => go('pacientes', id)} />;
}

function PatientProfilePage() {
  const { patientId } = useParams();
  const go = useAppNavigate();
  return (
    <PatientProfileScreen
      key={patientId}
      patientId={patientId}
      onBack={() => go('pacientes')}
      onNewAppointment={() => go('agenda')}
    />
  );
}

export const patientsModule: ModuleDefinition = {
  id: 'patients',
  owner: '03',
  routes: [
    { routeId: 'pacientes', path: '/pacientes', element: <PatientsPage /> },
    { routeId: 'pacientes', path: '/pacientes/:patientId', element: <PatientProfilePage /> },
  ],
};
