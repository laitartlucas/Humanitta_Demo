/**
 * Shell autenticado: exige sessão demo, monta o AppShell do perfil e aplica a guarda de rota.
 * A guarda é CONVENIÊNCIA de interface (espelho do 403 do servidor), não segurança.
 */
import { Navigate, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import { AppShell, HOME_BY_ROLE, NAV_BY_ROLE, type AppRoute, type DemoUser } from '@ds/layouts';
import { AccessDenied } from '@ds/screens/professional-portal';
import { ErrorBoundary, useSession } from '@core';
import { LOGIN_PATH, ROUTE_PATHS, ROUTE_TITLES } from './routes';

export interface RouteHandle {
  routeId: AppRoute;
  bleed?: boolean;
}

function isRouteHandle(h: unknown): h is RouteHandle {
  return typeof h === 'object' && h !== null && 'routeId' in h;
}

export function ProtectedLayout() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const matches = useMatches();

  if (!user) return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />;

  const role = user.role;
  const home = HOME_BY_ROLE[role];
  // "/" não pertence a nenhum módulo: vai direto para a tela inicial do perfil.
  if (location.pathname === '/') return <Navigate to={ROUTE_PATHS[home]} replace />;
  const handle = [...matches].reverse().map((m) => m.handle).find(isRouteHandle);
  const routeId = handle?.routeId;
  const allowed = routeId ? NAV_BY_ROLE[role].includes(routeId) : false;
  const meta = routeId ? ROUTE_TITLES[routeId] : null;

  const shellUser: DemoUser = {
    name: user.name,
    role: user.title,
    initials: user.initials,
    professionalId: user.professionalId,
  };

  return (
    <AppShell
      role={role}
      user={shellUser}
      active={routeId ?? home}
      title={!meta ? 'Página não encontrada' : allowed ? meta.title : 'Acesso não autorizado'}
      breadcrumb={meta?.breadcrumb}
      onNavigate={(id) => navigate(ROUTE_PATHS[id])}
      onSignOut={() => {
        signOut();
        navigate(LOGIN_PATH, { replace: true });
      }}
      bleed={allowed && Boolean(handle?.bleed)}
    >
      {allowed ? (
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      ) : (
        <AccessDenied
          title={meta ? undefined : 'Página não encontrada'}
          description={meta ? undefined : 'O endereço acessado não existe. Volte ao seu início para continuar.'}
          showCode={Boolean(meta)}
          onBack={() => navigate(ROUTE_PATHS[home])}
        />
      )}
    </AppShell>
  );
}
