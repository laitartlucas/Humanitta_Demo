/**
 * Agente 04 — Profissionais (cadastro administrativo). Dono: Agente 04.
 * Rotas liberadas pelo ProtectedLayout a admin e recepção (NAV_BY_ROLE); a tela decide o que é
 * editável por `useCan` e os serviços do core revalidam (403).
 */
import { useParams } from 'react-router-dom';
import { ProfessionalProfileScreen, ProfessionalsScreen } from '@ds/screens/professionals';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function ProfessionalsPage() {
  const go = useAppNavigate();
  return (
    <ProfessionalsScreen
      onOpenProfessional={(id) => go('profissionais', id)}
      // A agenda individual (semana navegável) fica no perfil do profissional.
      onOpenAgenda={(id) => go('profissionais', id)}
    />
  );
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
