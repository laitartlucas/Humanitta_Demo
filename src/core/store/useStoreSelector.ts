import { useRef, useSyncExternalStore } from 'react';
import type { Store } from './createStore';

/**
 * Lê uma fatia do store e re-renderiza só quando o estado muda.
 * O resultado é memorizado por (estado, seletor): seletores que devolvem listas derivadas
 * (filter/map) não causam loop. Para estabilidade entre renders, prefira seletores com useCallback
 * quando o custo for alto.
 */
export function useStoreSelector<S, T>(store: Store<S>, selector: (state: S) => T): T {
  const cache = useRef<{ state: S; selector: (state: S) => T; value: T } | null>(null);
  const getSnapshot = () => {
    const state = store.getState();
    const c = cache.current;
    if (c && c.state === state && c.selector === selector) return c.value;
    const value = selector(state);
    cache.current = { state, selector, value };
    return value;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
