/** Agente 04 — Profissionais (cadastro administrativo). Dono: Agente 04. */
import { useParams } from 'react-router-dom';
import { ProfessionalProfileScreen, ProfessionalsScreen } from '@ds/screens/professionals';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function ProfessionalsPage() {
  const go = useAppNavigate();
  return <ProfessionalsScreen onOpenProfessional={(id) => go('profissionais', id)} />;
}

function ProfessionalProfilePage() {
  const { professionalId } = useParams();
  const go = useAppNavigate();
  return (
    <ProfessionalProfileScreen key={professionalId} professionalId={professionalId} onBack={() => go('profissionais')} />
  );
}

export const professionalsModule: ModuleDefinition = {
  id: 'professionals',
  owner: '04',
  routes: [
    { routeId: 'profissionais', path: '/profissionais', element: <ProfessionalsPage /> },
    { routeId: 'profissionais', path: '/profissionais/:professionalId', element: <ProfessionalProfilePage /> },
  ],
};
