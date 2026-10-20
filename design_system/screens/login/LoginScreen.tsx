import { useState, type FormEvent } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@ds/layouts';
import { Badge, Button, Checkbox, Input, Logo, Select } from '@ds/components';
import { ROLES, ROLE_LABEL, type Role } from '@ds/access';

export interface LoginScreenProps {
  /**
   * Chamado após a autenticação simulada. Na demo o perfil vem do seletor de apresentação;
   * no sistema real ele vem da conta autenticada no servidor (nunca de um campo do formulário).
   */
  onLogin?: (role: Role) => void;
}

const DEMO_EMAILS: Record<Role, string> = {
  admin: 'administracao@humanitta.demo',
  recepcao: 'recepcao@humanitta.demo',
  profissional: 'dra.lauren@humanitta.demo',
  financeiro: 'financeiro@humanitta.demo',
};
const DEMO_EMAIL = DEMO_EMAILS.admin;

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [role, setRole] = useState<Role>('admin');
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Informe seu e-mail.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'E-mail em formato inválido.';
    if (!password) next.password = 'Informe sua senha.';
    setFieldErrors(next);
    setError(null);
    if (next.email || next.password) return;

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      // Simulação: a senha "erro" demonstra o estado de falha de autenticação.
      if (password.toLowerCase() === 'erro') {
        setError('E-mail ou senha incorretos. Verifique os dados e tente novamente.');
        return;
      }
      onLogin?.(role);
    }, 1100);
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-start gap-6">
          <Logo variant="full" tone="light" size={44} />
          <div>
            <p className="text-overline uppercase tracking-[0.08em] text-gold-600">Humanittá Gestão</p>
            <h1 className="mt-2 font-display text-display-lg text-graphite-900">Bem-vinda de volta</h1>
            <p className="mt-2 text-sm text-graphite-500">
              Acesse a plataforma de gestão da clínica para acompanhar agenda, pacientes e atendimentos.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-describedby={error ? 'login-error' : undefined}>
          <div className="rounded-md border border-dashed border-gold-200 bg-gold-50 p-4">
            <Select
              label="Perfil de demonstração"
              value={role}
              onChange={(e) => {
                const next = e.target.value as Role;
                setRole(next);
                setEmail(DEMO_EMAILS[next]);
              }}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              hint="Somente para a apresentação. No sistema real o perfil e as permissões vêm da conta autenticada."
            />
          </div>
          {error && (
            <div
              id="login-error"
              role="alert"
              className="flex items-start gap-3 rounded-sm border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
            >
              <AlertCircle size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            id="login-email"
            type="email"
            label="E-mail"
            autoComplete="username"
            leftIcon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={loading}
            required
          />

          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            label="Senha"
            autoComplete="current-password"
            leftIcon={Lock}
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint={fieldErrors.password ? undefined : 'Demonstração: qualquer senha entra; use "erro" para simular falha.'}
            disabled={loading}
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="flex h-8 w-8 items-center justify-center rounded-xs text-graphite-500 hover:bg-graphite-50 hover:text-graphite-800 focus-visible:shadow-focus focus-visible:outline-none"
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Checkbox
              id="login-remember"
              label="Manter conectado neste dispositivo"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
            />
            <Button type="button" variant="link" size="sm" disabled={loading}>
              Esqueci minha senha
            </Button>
          </div>

          <Button type="submit" size="lg" fullWidth loading={loading} leftIcon={loading ? undefined : LogIn}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-8 flex flex-col gap-4 border-t border-graphite-100 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold" dot>
              Ambiente de demonstração
            </Badge>
            <Badge tone="neutral" icon={ShieldCheck}>
              Acesso por perfil
            </Badge>
          </div>
          <p className="text-xs leading-5 text-graphite-500">
            Dados de pacientes, valores e métricas exibidos nesta demonstração são fictícios. Informações clínicas são
            restritas aos profissionais responsáveis.
          </p>
          <p className="flex items-center gap-2 text-xs text-graphite-500">
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-gold-600" />
            Humanittá Saúde Integral · R. Rio Branco, 185 – Centro, Ronda Alta – RS
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
