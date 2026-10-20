import type { ReactNode } from 'react';
import { FlaskConical, MapPin } from 'lucide-react';
import { Logo } from '@ds/components';

export interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Layout de autenticação (login, recuperar senha).
 * lg+: painel de marca grafite à esquerda (anel e quarto-de-círculo dourados) + formulário à direita.
 * < lg: logo no topo e formulário centralizado.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-ivory font-sans text-graphite-900">
      <aside
        aria-hidden="true"
        className="relative hidden w-[44%] max-w-[640px] shrink-0 flex-col justify-between overflow-hidden bg-graphite-900 p-12 text-sidebar-text lg:flex"
      >
        <svg className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px]" viewBox="0 0 520 520">
          <circle cx="260" cy="260" r="258" fill="none" stroke="#CC9B47" strokeOpacity=".55" strokeWidth="1.5" />
          <circle cx="260" cy="260" r="200" fill="none" stroke="#CC9B47" strokeOpacity=".18" strokeWidth="1.5" />
        </svg>
        <svg className="pointer-events-none absolute bottom-0 left-0 h-40 w-40" viewBox="0 0 160 160">
          <path d="M0 0a160 160 0 0 1 160 160H0z" fill="#B5832F" fillOpacity=".9" />
        </svg>

        <Logo tone="dark" size={48} />

        <div className="relative flex max-w-[440px] flex-col gap-5">
          <span className="text-overline uppercase text-gold-300">Plataforma de Saúde Integral</span>
          <p className="font-display text-[44px] font-semibold leading-[1.08] text-sidebar-strong">
            Cuidado integral começa por uma gestão acolhedora.
          </p>
          <p className="text-body text-sidebar-icon">
            Agenda, pacientes, financeiro e atendimento por WhatsApp em um só lugar — para cada especialidade da
            clínica.
          </p>
        </div>

        <div className="relative flex flex-col gap-1 pl-44 text-caption text-sidebar-icon">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} strokeWidth={1.75} />
            Ronda Alta · RS
          </span>
          <span>Humanittá Saúde Integral</span>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Logo size={44} />
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
        <p className="mt-10 inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1 text-caption font-bold text-warning">
          <FlaskConical size={14} strokeWidth={2} aria-hidden="true" />
          Ambiente de demonstração — dados fictícios
        </p>
      </main>
    </div>
  );
}
