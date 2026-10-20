import { useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HOME_BY_ROLE, NAV_BY_ROLE, type AppRoute } from '@ds/layouts';
import { useToast } from '@ds/components';
import { LoginScreen, type DemoProfessionalOption } from '@ds/screens/login';
import { toAppError, useSession, useUsers } from '@core';
import { ROUTE_PATHS } from './routes';

/** Login de DEMONSTRAÇÃO: escolhe um perfil fictício (e, no perfil Profissional, qual profissional). */
export function LoginPage() {
  const { user, signIn } = useSession();
  const users = useUsers();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const professionals = useMemo<DemoProfessionalOption[]>(
    () =>
      users
        .filter((u) => u.role === 'profissional' && u.status === 'ativo')
        .map((u) => ({ value: u.id, label: `${u.name} — ${u.title}`, email: u.email })),
    [users],
  );

  if (user) return <Navigate to={ROUTE_PATHS[HOME_BY_ROLE[user.role]]} replace />;

  return (
    <LoginScreen
      demoProfessionals={professionals}
      onLogin={(role, demoUserId) => {
        try {
          signIn(role, demoUserId);
          // Volta para a rota pedida antes do login, se ela pertencer ao perfil.
          const from = (location.state as { from?: string } | null)?.from;
          const allowedFrom = from && NAV_BY_ROLE[role].some((r: AppRoute) => from.startsWith(ROUTE_PATHS[r]));
          navigate(allowedFrom ? from : ROUTE_PATHS[HOME_BY_ROLE[role]], { replace: true });
        } catch (e) {
          toast({ tone: 'danger', title: 'Não foi possível entrar', description: toAppError(e).message });
        }
      }}
    />
  );
}
