import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HOME_BY_ROLE, NAV_BY_ROLE, type AppRoute } from '@ds/layouts';
import { useToast } from '@ds/components';
import type { Role } from '@ds/access';
import { LoginScreen, type DemoProfessionalOption } from '@ds/screens/login';
import { toAppError, useSession, useUsers } from '@core';
import { ROUTE_PATHS } from './routes';

/**
 * Destino após o login: a página pedida antes do login, se for um caminho interno do perfil;
 * senão, a tela inicial do perfil. Recusa "\" e "//" (mitigação de open redirect — GHSA-wrjc-x8rr-h8h6).
 */
function targetAfterLogin(role: Role, from: unknown): string {
  const safe = typeof from === 'string' && from.startsWith('/') && !from.includes('\\') && !from.includes('//');
  if (safe && NAV_BY_ROLE[role].some((r: AppRoute) => from.startsWith(ROUTE_PATHS[r]))) return from;
  return ROUTE_PATHS[HOME_BY_ROLE[role]];
}

/** Login de DEMONSTRAÇÃO: escolhe um perfil fictício (e, no perfil Profissional, qual profissional). */
export function LoginPage() {
  const { user, signIn } = useSession();
  const users = useUsers();
  const location = useLocation();
  const { toast } = useToast();
  const from = (location.state as { from?: unknown } | null)?.from;

  const professionals = useMemo<DemoProfessionalOption[]>(
    () =>
      users
        .filter((u) => u.role === 'profissional' && u.status === 'ativo')
        .map((u) => ({ value: u.id, label: `${u.name} — ${u.title}`, email: u.email })),
    [users],
  );

  // Com sessão (inclusive logo após o signIn), um único redirecionamento decide o destino.
  if (user) return <Navigate to={targetAfterLogin(user.role, from)} replace />;

  return (
    <LoginScreen
      demoProfessionals={professionals}
      onLogin={(role, demoUserId) => {
        try {
          signIn(role, demoUserId);
        } catch (e) {
          toast({ tone: 'danger', title: 'Não foi possível entrar', description: toAppError(e).message });
        }
      }}
    />
  );
}
