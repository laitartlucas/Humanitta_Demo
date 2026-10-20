/**
 * Humanittá Gestão — núcleo compartilhado (Integrador / Agente 0).
 * Ponto único de importação para os módulos: `import { useAppointments, appointmentService } from '@core';`
 * Somente o Integrador altera arquivos em src/core/.
 */
export * from './domain';
export * from './errors/AppError';
export { ErrorBoundary } from './errors/ErrorBoundary';
export { DEMO_NOW, now, nowIso, todayKey, isoAfter, resetDemoClock } from './clock';
export { db, resetDemoData, DB_STORAGE_KEY } from './store/database';
export { createStore, type Store } from './store/createStore';
export { useStoreSelector } from './store/useStoreSelector';
export { createSeed, SCHEMA_VERSION, DEFAULT_DEMO_USER_BY_ROLE, type SeedOptions } from './data/seed';
export { repositories, newId } from './repositories';
export type { CollectionRepository, SingletonRepository, Repositories } from './repositories';
export * from './access/accessContext';
export { session, signInDemo, signOutDemo, selectCurrentUser, toAccessContext, requireAccessContext } from './session/session';
export type { SessionState } from './session/session';
export * from './selectors';
export * from './services';
export * from './hooks';
