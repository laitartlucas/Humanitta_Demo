/**
 * Repositórios: a ÚNICA camada que escreve no banco. Sem regra de negócio nem permissão
 * (isso é dos serviços). No produto, cada método vira uma chamada HTTP com a mesma assinatura.
 */
import type { CollectionKey, Database, EntityOf, ID, SingletonKey } from '../domain';
import { notFound } from '../errors/AppError';
import { db } from '../store/database';
import type { Store } from '../store/createStore';

export interface CollectionRepository<T> {
  list(): T[];
  getById(id: ID): T | undefined;
  /** Igual a getById, mas lança NOT_FOUND. */
  require(id: ID): T;
  create(entity: T): T;
  update(id: ID, patch: Partial<Omit<T, 'id'>>): T;
  remove(id: ID): void;
  /** Substitui a coleção inteira (reordenação, importação, limpeza). */
  replaceAll(items: T[]): void;
}

export interface SingletonRepository<T> {
  get(): T;
  update(patch: Partial<T>): T;
}

const ENTITY_LABEL: Record<CollectionKey, string> = {
  patients: 'Paciente',
  professionals: 'Profissional',
  users: 'Usuário',
  specialties: 'Especialidade',
  services: 'Serviço',
  rooms: 'Sala',
  appointments: 'Agendamento',
  attendances: 'Atendimento',
  clinicalRecords: 'Registro clínico',
  financialEntries: 'Lançamento',
  conversations: 'Conversa',
  messages: 'Mensagem',
  blockRequests: 'Solicitação',
  activity: 'Atividade',
};

function makeCollection<T extends { id: ID }>(
  label: string,
  read: () => T[],
  write: (items: T[]) => void,
): CollectionRepository<T> {
  return {
    list: read,
    getById: (id) => read().find((x) => x.id === id),
    require(id) {
      const found = read().find((x) => x.id === id);
      if (!found) throw notFound(label);
      return found;
    },
    create(entity) {
      write([...read(), entity]);
      return entity;
    },
    update(id, patch) {
      let updated: T | undefined;
      const items = read().map((x) => {
        if (x.id !== id) return x;
        updated = { ...x, ...patch, id } as T;
        return updated;
      });
      if (!updated) throw notFound(label);
      write(items);
      return updated;
    },
    remove(id) {
      const items = read();
      if (!items.some((x) => x.id === id)) throw notFound(label);
      write(items.filter((x) => x.id !== id));
    },
    replaceAll(items) {
      write([...items]);
    },
  };
}

export function createCollectionRepository<K extends CollectionKey>(
  key: K,
  store: Store<Database> = db,
): CollectionRepository<EntityOf<K>> {
  type Item = { id: ID };
  const repo = makeCollection<Item>(
    ENTITY_LABEL[key],
    () => store.getState()[key] as unknown as Item[],
    (items) => store.setState((s) => ({ ...s, [key]: items })),
  );
  return repo as unknown as CollectionRepository<EntityOf<K>>;
}

export function createSingletonRepository<K extends SingletonKey>(
  key: K,
  store: Store<Database> = db,
): SingletonRepository<Database[K]> {
  return {
    get: () => store.getState()[key],
    update(patch) {
      const next = { ...store.getState()[key], ...patch };
      store.setState((s) => ({ ...s, [key]: next }));
      return next;
    },
  };
}

/** Gera um ID estável e legível: `<prefixo>-<base36 tempo><aleatório>`. */
export function newId(prefix: string): ID {
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}
