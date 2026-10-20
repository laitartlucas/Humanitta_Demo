import { House, ShieldAlert } from 'lucide-react';
import { Button } from '@ds/components';
import { cn } from '@ds/foundations/cn';

export interface AccessDeniedProps {
  /** Volta para a rota inicial do perfil. */
  onBack?: () => void;
  title?: string;
  description?: string;
  backLabel?: string;
  /** Mostra o código técnico (403) abaixo do texto. */
  showCode?: boolean;
  className?: string;
}

/**
 * Estado 403 — exibido quando uma rota/ação não é permitida ao perfil (ex.: URL digitada manualmente).
 * Ocultar menus não é segurança: o servidor também recusa a requisição.
 */
export function AccessDenied({
  onBack,
  title = 'Acesso não autorizado',
  description = 'Esta área não faz parte do seu perfil de acesso. Se você precisa dela para o seu trabalho, fale com a administração da clínica.',
  backLabel = 'Voltar ao meu início',
  showCode = true,
  className,
}: AccessDeniedProps) {
  return (
    <section
      role="alert"
      aria-labelledby="access-denied-title"
      className={cn(
        'flex flex-col items-center justify-center gap-5 rounded-md border border-graphite-200 bg-white px-6 py-14 text-center shadow-sm md:py-20',
        className,
      )}
    >
      <span aria-hidden="true" className="relative inline-flex h-[96px] w-[96px] items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0">
          <circle cx="48" cy="48" r="46" fill="#FBF6EC" stroke="#DDB872" strokeWidth="1.5" />
          <path d="M48 2a46 46 0 0 1 46 46" fill="none" stroke="#B5832F" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <ShieldAlert size={36} strokeWidth={1.5} className="relative text-gold-600" />
      </span>
      <div className="flex max-w-[460px] flex-col gap-2">
        <h2 id="access-denied-title" className="font-display text-[28px] font-semibold leading-[34px] text-graphite-900">
          {title}
        </h2>
        <p className="text-body text-graphite-600">{description}</p>
        {showCode && (
          <p className="text-caption text-graphite-500">
            Código 403 · a tentativa foi registrada no log de auditoria.
          </p>
        )}
      </div>
      {onBack && (
        <Button leftIcon={House} onClick={onBack}>
          {backLabel}
        </Button>
      )}
    </section>
  );
}
