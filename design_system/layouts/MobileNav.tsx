import type { MouseEvent } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import type { Role } from '@ds/access';
import { getMobileNavItems, type AppRoute } from './nav';

export interface MobileNavProps {
  active: AppRoute;
  onNavigate?: (id: AppRoute) => void;
  /** Perfil logado (define os atalhos). Padrão: admin. */
  role?: Role;
  onOpenMenu: () => void;
  className?: string;
}

const itemCls =
  'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-sm text-[11px] font-bold no-underline transition-colors focus-visible:outline-none focus-visible:shadow-focus';

/** Barra inferior (< md): 4 atalhos do perfil + Menu. Alvos ≥ 44px. */
export function MobileNav({ active, onNavigate, onOpenMenu, className, role = 'admin' }: MobileNavProps) {
  const items = getMobileNavItems(role);
  const activeInBar = items.some((n) => n.id === active);

  function go(e: MouseEvent<HTMLAnchorElement>, id: AppRoute) {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(id);
    }
  }

  return (
    <nav
      aria-label="Navegação rápida"
      className={cn(
        'hm-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-graphite-200 bg-white/95 backdrop-blur md:hidden',
        className,
      )}
    >
      <ul className="flex items-stretch gap-1 px-2 py-1">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const isActive = id === active;
          return (
            <li key={id} className="flex flex-1">
              <a
                href={`#/${id}`}
                onClick={(e) => go(e, id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(itemCls, isActive ? 'text-gold-700' : 'text-graphite-500 hover:text-graphite-900')}
              >
                <span className={cn('relative inline-flex h-7 w-12 items-center justify-center rounded-full', isActive && 'bg-gold-50')}>
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  {badge !== undefined && (
                    <span className="absolute -top-0.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-300 px-1 text-[10px] font-extrabold text-graphite-900">
                      {badge}
                      <span className="sr-only"> novas</span>
                    </span>
                  )}
                </span>
                {label === 'Meu Dashboard' ? 'Início' : label.replace(/^(Meu|Minha|Meus) /, '')}
              </a>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className={cn(itemCls, !activeInBar ? 'text-gold-700' : 'text-graphite-500 hover:text-graphite-900')}
          >
            <span className={cn('inline-flex h-7 w-12 items-center justify-center rounded-full', !activeInBar && 'bg-gold-50')}>
              <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            Menu
          </button>
        </li>
      </ul>
    </nav>
  );
}
