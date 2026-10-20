/**
 * Agente 02 — Hooks de leitura da Agenda (disponibilidade e validação ao vivo).
 * Leem o mesmo `db` do core e re-renderizam quando qualquer módulo altera agendamentos,
 * bloqueios, salas ou horários da clínica.
 */
import { useCallback, useMemo } from 'react';
import { useDb, type Database, type ID } from '@core';
import {
  buildSlots,
  checkSlot,
  clinicDay,
  professionalDay,
  type AgendaSlot,
  type AvailabilitySource,
  type SlotCheck,
  type SlotIssue,
} from './agendaRules';

/** Grade de horários (livre/ocupado/bloqueado) para um profissional, data, duração e sala. */
export function useAgendaSlots(c: { professionalId?: ID; dateKey?: string; durationMin: number; roomId?: ID; ignoreIds?: ID[]; notBefore?: string }): AgendaSlot[] {
  const key = JSON.stringify(c);
  const selector = useCallback(
    (s: Database) =>
      c.professionalId && c.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(c.dateKey)
        ? buildSlots(s, { ...c, professionalId: c.professionalId, dateKey: c.dateKey })
        : [],
    [key],
  );
  return useDb(selector);
}

/** Problemas do horário pedido (para avisar antes de enviar o formulário). */
export function useSlotIssues(c: SlotCheck | null): SlotIssue[] {
  const key = JSON.stringify(c);
  const selector = useCallback((s: Database) => (c ? checkSlot(s, c) : []), [key]);
  return useDb(selector);
}

/**
 * Funções de disponibilidade para as grades dia/semana. Recalculadas quando horários da clínica,
 * profissionais ou bloqueios mudam.
 */
export function useAvailability() {
  const hours = useDb((s) => s.clinicSettings.hours);
  const professionals = useDb((s) => s.professionals);
  const blockRequests = useDb((s) => s.blockRequests);
  return useMemo(() => {
    const src: AvailabilitySource = { clinicSettings: { hours }, professionals, blockRequests };
    return {
      clinicDay: (dateKey: string) => clinicDay(src, dateKey),
      professionalDay: (professionalId: ID, dateKey: string) => professionalDay(src, professionalId, dateKey),
    };
  }, [hours, professionals, blockRequests]);
}
