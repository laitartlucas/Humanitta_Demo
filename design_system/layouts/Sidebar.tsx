import type { MouseEvent } from 'react';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { Logo, Tooltip } from '@ds/components';
import type { Role } from '@ds/access';
import { DEMO_USERS, HOME_BY_ROLE, getNavItems, type AppRoute, type DemoUser } from './nav';

export interface SidebarProps {
  active: AppRoute;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: (id: AppRoute) => void;
  /** Perfil logado: define o menu (apresentação apenas — autorização real no servidor). Padrão: admin. */
  role?: Role;
  /** Usuário exibido no rodapé. Padrão: usuário demo do perfil. */
  user?: DemoUser;
  /** docked = fixa à esquerda (lg+); overlay = dentro do drawer mobile (botão vira "Fechar menu"). */
  mode?: 'docked' | 'overlay';
  className?: string;
}

/**
 * Sidebar escura (graphite-900). 264px expandida / 76px recolhida (com tooltips).
 * Item ativo: fundo rgba(221,184,114,.12), texto gold-100 e ponto dourado à direita — sem borda lateral.
 * Links usam href="#/<rota>"; com onNavigate o clique é interceptado.
 */
export function Sidebar({ active, collapsed, onToggle, onNavigate, mode = 'docked', className, role = 'admin', user }: SidebarProps) {
  const isCollapsed = mode === 'docked' && collapsed;
  const items = getNavItems(role);
  const currentUser = user ?? DEMO_USERS[role];
  const home = HOME_BY_ROLE[role];
  const isPortal = role === 'profissional';

  function go(e: MouseEvent<HTMLAnchorElement>, id: AppRoute) {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(id);
    }
  }

  const ToggleIcon = mode === 'overlay' ? X : isCollapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = mode === 'overlay' ? 'Fechar menu' : isCollapsed ? 'Expandir menu' : 'Recolher menu';

  return (
    <aside
      aria-label="Menu principal"
      className={cn(
        'flex h-full shrink-0 flex-col gap-6 overflow-hidden bg-graphite-900 py-6 text-sidebar-text transition-[width] duration-200',
        isCollapsed ? 'w-[76px] px-3' : 'w-[264px] px-4',
        className,
      )}
    >
      <a
        href={`#/${home}`}
        onClick={(e) => go(e, home)}
        aria-label="Humanittá Gestão — início"
        className={cn(
          'flex items-center rounded-sm py-1 no-underline focus-visible:outline-none focus-visible:shadow-focus',
          isCollapsed ? 'justify-center px-0' : 'px-2',
        )}
      >
        <Logo variant={isCollapsed ? 'mark' : 'full'} tone="dark" size={40} />
      </a>

      {isPortal && !isCollapsed && (
        <span className="-mt-3 inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-gold-300/[.12] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-300">
          Portal do Profissional
        </span>
      )}

      <nav aria-label="Seções" className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const isActive = id === active;
          const link = (
            <a
              href={`#/${id}`}
              onClick={(e) => go(e, id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={isCollapsed ? (badge ? `${label} (${badge} novas)` : label) : undefined}
              className={cn(
                'relative flex h-11 shrink-0 items-center gap-3 rounded-[10px] text-body no-underline transition-colors duration-150',
                'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#DDB872]',
                isCollapsed ? 'w-[52px] justify-center px-0' : 'px-3',
                isActive
                  ? 'bg-gold-300/[.12] font-bold text-gold-100 hover:text-gold-100'
                  : 'font-semibold text-sidebar-muted hover:bg-white/[.05] hover:text-sidebar-strong',
              )}
            >
              <Icon
                size={20}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn('shrink-0', isActive ? 'text-gold-300' : 'text-current')}
              />
              {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
              {!isCollapsed && badge !== undefined && (
                <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-gold-300 px-1.5 text-[11px] font-extrabold text-graphite-900">
                  {badge}
                  <span className="sr-only"> novas</span>
                </span>
              )}
              {!isCollapsed && isActive && (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
              )}
              {isCollapsed && badge !== undefined && (
                <span
                  aria-hidden="true"
                  className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-graphite-900 bg-gold-300"
                />
              )}
              {isCollapsed && isActive && (
                <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-1 rounded-full bg-gold-300" />
              )}
            </a>
          );
          return isCollapsed ? (
            <Tooltip key={id} content={label} side="right">
              {link}
            </Tooltip>
          ) : (
            <span key={id} className="contents">
              {link}
            </span>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-md bg-white/[.05]',
            isCollapsed ? 'justify-center p-2' : 'p-3',
          )}
        >
          <span
            aria-hidden={isCollapsed ? undefined : true}
            aria-label={isCollapsed ? `${currentUser.name}, ${currentUser.role}` : undefined}
            role={isCollapsed ? 'img' : undefined}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-graphite-700 text-[13px] font-extrabold text-gold-100"
          >
            {currentUser.initials}
          </span>
          {!isCollapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm font-bold text-sidebar-strong">{currentUser.name}</span>
              <span className="truncate text-caption font-medium text-sidebar-icon">{currentUser.role}</span>
            </span>
          )}
        </div>
        {isCollapsed ? (
          <Tooltip content={toggleLabel} side="right">
            <button
              type="button"
              onClick={onToggle}
              aria-label={toggleLabel}
              aria-expanded={false}
              className="mx-auto inline-flex h-10 w-[52px] items-center justify-center rounded-[10px] text-sidebar-icon transition-colors hover:bg-white/[.05] hover:text-sidebar-strong focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#DDB872]"
            >
              <ToggleIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={mode === 'docked' ? true : undefined}
            className="flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-body-sm font-semibold text-sidebar-icon transition-colors hover:bg-white/[.05] hover:text-sidebar-strong focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#DDB872]"
          >
            <ToggleIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            {toggleLabel}
          </button>
        )}
      </div>
    </aside>
  );
}
