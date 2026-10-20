/** Repositórios por entidade. Use pelos SERVIÇOS; telas não escrevem direto no repositório. */
import { createCollectionRepository, createSingletonRepository } from './repository';

export const repositories = {
  patients: createCollectionRepository('patients'),
  professionals: createCollectionRepository('professionals'),
  users: createCollectionRepository('users'),
  specialties: createCollectionRepository('specialties'),
  services: createCollectionRepository('services'),
  rooms: createCollectionRepository('rooms'),
  appointments: createCollectionRepository('appointments'),
  attendances: createCollectionRepository('attendances'),
  clinicalRecords: createCollectionRepository('clinicalRecords'),
  financialEntries: createCollectionRepository('financialEntries'),
  conversations: createCollectionRepository('conversations'),
  messages: createCollectionRepository('messages'),
  blockRequests: createCollectionRepository('blockRequests'),
  activity: createCollectionRepository('activity'),
  aiConfig: createSingletonRepository('aiConfig'),
  clinicSettings: createSingletonRepository('clinicSettings'),
};

export type Repositories = typeof repositories;
export { createCollectionRepository, createSingletonRepository, newId } from './repository';
export type { CollectionRepository, SingletonRepository } from './repository';
