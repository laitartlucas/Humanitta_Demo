/** Agente 06 — hooks de leitura do Financeiro (sempre via `useQuery`, com escopo do perfil). */
import { useQuery } from '@core';
import { selectBillableAppointments, selectFinanceRows, selectPayoutRows, selectPayoutStatement, type DateRange } from './domain';

/** Lançamentos do financeiro geral com situação efetiva. */
export const useFinanceRows = () => useQuery(selectFinanceRows);

/** Repasses visíveis ao perfil (todos ou só os próprios). */
export const usePayoutRows = () => useQuery(selectPayoutRows);

/** Apuração de repasses do período. */
export const usePayoutStatement = (period: DateRange) =>
  useQuery((s, c) => selectPayoutStatement(s, c, period), [period.from, period.to]);

/** Consultas concluídas ainda sem cobrança (para vincular uma receita). */
export const useBillableAppointments = () => useQuery(selectBillableAppointments);
