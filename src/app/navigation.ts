import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppRoute } from '@ds/layouts';
import { routePath } from './routes';

/** Navegação tipada entre módulos: `go('pacientes', 'pac-01')`. */
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback((route: AppRoute, param?: string) => navigate(routePath(route, param)), [navigate]);
}

/**
 * Estado de navegação aceito pela Agenda (`location.state`). Leva só IDs — nunca dado pessoal na URL.
 * `newAppointment.patientId`: abre "Novo agendamento" com o paciente já selecionado.
 */
export interface AgendaNavState {
  newAppointment?: { patientId: string };
}

/** Abre a Agenda com "Novo agendamento" pré-preenchido para o paciente (ex.: botão "Agendar" da ficha). */
export function useOpenNewAppointment() {
  const navigate = useNavigate();
  return useCallback(
    (patientId: string) => navigate(routePath('agenda'), { state: { newAppointment: { patientId } } satisfies AgendaNavState }),
    [navigate],
  );
}
