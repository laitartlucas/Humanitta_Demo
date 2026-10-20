/**
 * O ÚNICO armazenamento de dados da aplicação. Nenhum módulo cria outro store, localStorage
 * ou cópia própria de entidades: leia via seletores/hooks e escreva via serviços.
 */
import type { Database } from '../domain';
import { createSeed, SCHEMA_VERSION, type SeedOptions } from '../data/seed';
import { createStore, type Store } from './createStore';
import { clearPersisted, loadPersisted, persistStore, type PersistOptions } from './persistence';

export const DB_STORAGE_KEY = 'humanitta:demo:db';

const persistOptions: PersistOptions<Database> = {
  key: DB_STORAGE_KEY,
  version: SCHEMA_VERSION,
  getVersion: (s) => s.schemaVersion,
};

function shouldReset(): boolean {
  try {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('reset-demo');
  } catch {
    return false;
  }
}

function initialState(): Database {
  if (shouldReset()) clearPersisted(DB_STORAGE_KEY);
  return loadPersisted(persistOptions) ?? createSeed();
}

export const db: Store<Database> = createStore<Database>(initialState());

persistStore(db, persistOptions);

/** Volta todos os dados para a semente original (botão "Restaurar demonstração" / testes). */
export function resetDemoData(options?: SeedOptions): void {
  clearPersisted(DB_STORAGE_KEY);
  db.setState(() => createSeed(options));
}
