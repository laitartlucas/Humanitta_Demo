import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppRoute } from '@ds/layouts';
import { routePath } from './routes';

/** Navegação tipada entre módulos: `go('pacientes', 'pac-01')`. */
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback((route: AppRoute, param?: string) => navigate(routePath(route, param)), [navigate]);
}
