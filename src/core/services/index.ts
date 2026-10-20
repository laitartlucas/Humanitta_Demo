/**
 * Serviços tipados — a ÚNICA porta de escrita para os módulos.
 * Assinatura padrão: `(ctx: AccessContext, ...args) => Entidade` e lançam `AppError`.
 * Nas telas, use `useAction()` (hooks) para obter ctx, toast de erro e estado de loading.
 */
export * as appointmentService from './appointments';
export * as patientService from './patients';
export * as attendanceService from './attendances';
export * as financeService from './finance';
export * as messagingService from './messaging';
export * as blockRequestService from './blockRequests';
export * as settingsService from './settings';
export { logActivity } from './activity';
