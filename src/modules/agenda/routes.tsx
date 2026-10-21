/** Agente 02 — Agenda da clínica. Rotas e containers do módulo (dono: Agente 02). */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AgendaScreen } from '@ds/screens/agenda';
import type { AgendaNavState } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

function AgendaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Lido uma única vez: "Agendar" a partir da ficha do paciente (Agente 09 — integração 03 → 02).
  const [prefill] = useState(() => (location.state as AgendaNavState | null)?.newAppointment);

  useEffect(() => {
    // Consome o estado para o modal não reabrir ao voltar/recarregar a página.
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  return <AgendaScreen initialNewAppointment={prefill} />;
}

export const agendaModule: ModuleDefinition = {
  id: 'agenda',
  owner: '02',
  routes: [{ routeId: 'agenda', path: '/agenda', element: <AgendaPage /> }],
};
