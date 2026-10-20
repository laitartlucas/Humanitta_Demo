import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

/** Aviso de seção somente leitura (perfil sem nível "editar"). */
export function ReadOnlyNote({ children }: { children?: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-md border border-graphite-200 bg-graphite-50 px-4 py-3 text-body-sm text-graphite-600">
      <Lock size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children ?? 'Somente leitura: seu perfil pode consultar, mas não alterar esta seção.'}</span>
    </p>
  );
}

/** Classe dos selects nativos compactos usados dentro de listas (mesma da seção Especialidades). */
export const INLINE_SELECT =
  'h-10 rounded-sm border border-graphite-200 bg-white px-2 text-[13px] text-graphite-900 focus:border-gold-500 focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-graphite-50 disabled:opacity-60';
