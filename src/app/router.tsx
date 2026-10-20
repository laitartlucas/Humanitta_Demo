/**
 * Roteador da aplicação (react-router v6, data router). Somente o Integrador altera.
 * Os módulos declaram rotas em `src/modules/<módulo>/routes.tsx`; aqui elas são montadas
 * dentro do shell autenticado, com `handle.routeId` para permissão, título e menu ativo.
 */
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { MODULES } from './moduleRegistry';
import { HomeRedirect, ProtectedLayout, type RouteHandle } from './ProtectedLayout';
import { LoginPage } from './LoginPage';
import { LOGIN_PATH } from './routes';

const moduleRoutes: RouteObject[] = MODULES.flatMap((m) =>
  m.routes.map((r) => ({
    path: r.path,
    element: r.element,
    handle: { routeId: r.routeId, bleed: r.bleed } satisfies RouteHandle,
  })),
);

export const routes: RouteObject[] = [
  { path: LOGIN_PATH, element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [{ index: true, element: <HomeRedirect /> }, ...moduleRoutes, { path: '*', element: null }],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
