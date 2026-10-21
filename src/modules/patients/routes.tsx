/** Agente 03 — Pacientes. Rotas e containers do módulo (dono: Agente 03). */
import { useParams } from 'react-router-dom';
import { PatientProfileScreen, PatientsScreen } from '@ds/screens/patients';
import { useAppNavigate, useOpenNewAppointment } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function PatientsPage() {
  const go = useAppNavigate();
  return <PatientsScreen onOpenPatient={(id) => go('pacientes', id)} onOpenWhatsApp={() => go('whatsapp')} />;
}

function PatientProfilePage() {
  const { patientId } = useParams();
  const go = useAppNavigate();
  const openNewAppointment = useOpenNewAppointment();
  return (
    <PatientProfileScreen
      key={patientId}
      patientId={patientId}
      onBack={() => go('pacientes')}
      // Abre "Novo agendamento" na Agenda com este paciente já selecionado (CR 03 §8).
      onNewAppointment={(id) => openNewAppointment(id)}
      onOpenWhatsApp={() => go('whatsapp')}
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
