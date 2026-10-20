/**
 * Agente 02 — API pública do módulo Agenda para outros módulos (ex.: Portal do Profissional,
 * Assistente IA). Os agendamentos continuam no `db` do core: leia com `useAppointments()`
 * (já filtrado ao profissional logado) e use estas regras/serviços para disponibilidade e escrita.
 */
export * from './agendaRules';
export * from './agendaService';
export * from './hooks';
