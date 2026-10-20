/** Agente 05 — Atendimentos (visão da clínica). Dono: Agente 05. */
import { useNavigate, useParams } from 'react-router-dom';
import { AttendancesScreen } from '@ds/screens/attendances';
import { useAppNavigate } from '@app/navigation';
import type { ModuleDefinition } from '@app/types';

const BASE = '/atendimentos';

/** Lista + detalhes: `/atendimentos/:appointmentId` abre o painel do atendimento (id não é dado pessoal). */
function AttendancesPage() {
  const go = useAppNavigate();
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  return (
    <AttendancesScreen
      onOpenPatient={(id) => go('pacientes', id)}
      onOpenAgenda={() => go('agenda')}
      selectedId={appointmentId ?? null}
      onSelect={(id) => navigate(id ? `${BASE}/${encodeURIComponent(id)}` : BASE)}
    />
  );
}

export const attendancesModule: ModuleDefinition = {
  id: 'attendances',
  owner: '05',
  // Segmento opcional: uma única rota, para a lista não remontar (e perder filtros) ao abrir detalhes.
  routes: [{ routeId: 'atendimentos', path: `${BASE}/:appointmentId?`, element: <AttendancesPage /> }],
};
