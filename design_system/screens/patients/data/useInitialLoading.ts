import { useEffect, useState } from 'react';

/**
 * Estado "carregando" da primeira pintura. A base demonstrativa é síncrona; o atraso curto reproduz
 * a experiência de uma consulta à API (no produto, este hook dá lugar ao estado real da requisição).
 */
export function useInitialLoading(ms = 320): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return loading;
}
