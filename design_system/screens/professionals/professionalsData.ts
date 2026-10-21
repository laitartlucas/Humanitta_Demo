/**
 * Gestão de profissionais — leituras PURAS derivadas do `@core` (situação de acesso, semana,
 * expediente do dia). Sem React: testadas em tests/modules/professionals.
 */
import type { BadgeTone } from '@ds/components';
import type { Professional, UserRecord } from '@core';
import { toDateKey } from '@ds/mocks/clinical';
import { weekDays } from '../agenda/agendaUtils';

/** Situação do profissional = status do usuário individual do Portal vinculado. */
export type ProfessionalSituation = 'ativo' | 'inativo' | 'convidado' | 'sem_acesso';

export const SITUATION_LABEL: Record<ProfessionalSituation, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  convidado: 'Convite pendente',
  sem_acesso: 'Sem acesso ao Portal',
};

export const SITUATION_TONE: Record<ProfessionalSituation, BadgeTone> = {
  ativo: 'success',
  inativo: 'neutral',
  convidado: 'info',
  sem_acesso: 'warning',
};

export function situationOf(user: UserRecord | undefined): ProfessionalSituation {
  return user ? user.status : 'sem_acesso';
}

/** Chaves AAAA-MM-DD da semana (seg–sáb) que contém `d`. */
export function weekKeysOf(d: Date): string[] {
  return weekDays(d).map(toDateKey);
}

/** Expediente do profissional no dia da semana de `d`. */
export function hoursOn(p: Pick<Professional, 'workingHours'>, d: Date): { start: string; end: string } | undefined {
  return p.workingHours.find((w) => w.weekday === d.getDay());
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
