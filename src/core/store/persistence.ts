/**
 * Persistência local DEMONSTRATIVA (localStorage). Não é banco de dados nem é seguro:
 * qualquer pessoa com acesso ao navegador lê e altera. No produto, os repositórios passam a
 * chamar a API — a interface dos repositórios não muda.
 */
import type { Store } from './createStore';

export interface PersistOptions<S> {
  key: string;
  /** Versão do formato. Se a gravada for diferente, a semente é recarregada. */
  version: number;
  getVersion: (s: S) => number;
  debounceMs?: number;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadPersisted<S>(opts: PersistOptions<S>): S | null {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(opts.key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as S;
    return opts.getVersion(parsed) === opts.version ? parsed : null;
  } catch {
    return null;
  }
}

/** Grava o estado a cada mudança (com debounce). Devolve a função de cancelamento. */
export function persistStore<S>(store: Store<S>, opts: PersistOptions<S>): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const write = () => {
    const ls = storage();
    if (!ls) return;
    try {
      ls.setItem(opts.key, JSON.stringify(store.getState()));
    } catch (e) {
      console.warn('[Humanittá] Não foi possível salvar os dados de demonstração.', e);
    }
  };
  const unsubscribe = store.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, opts.debounceMs ?? 150);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}

export function clearPersisted(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* sem acesso ao storage: nada a limpar */
  }
}
