/**
 * Agente 05 — API pública do módulo de Atendimentos para outros módulos
 * (Portal do Profissional · Agente 04, Financeiro · Agente 06). Rotas ficam em `routes.tsx`.
 */
export * from './model';
export * from './clinicalNote';
export * as attendanceFlow from './flow';
export type { CompletionInput } from './flow';
export * from './hooks';
