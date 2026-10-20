import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@ds/foundations/cn';
import { useDialogBehavior } from '../components/internal';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import type { Role } from '@ds/access';
import { DEMO_USERS, type AppRoute, type DemoUser } from './nav';

export interface AppShellProps {
  active: AppRoute;
  title: string;
  breadcrumb?: string[];
  onNavigate?: (id: AppRoute) => void;
  /**
   * Perfil autenticado. Define menu, bottom-nav e usuário exibido.
   * Apenas apresentação: o controle de acesso efetivo é do servidor (ver documentation/PERMISSIONS.md).
   */
  role?: Role;
  user?: DemoUser;
  onSignOut?: () => void;
  children: ReactNode;
  /** Remove o padding/max-width do <main> (telas full-bleed como WhatsApp). */
  bleed?: boolean;
}

const STORAGE_KEY = 'hm.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function MobileMenuDrawer({
  open,
  onClose,
  active,
  onNavigate,
  role,
  user,
}: {
  open: boolean;
  onClose: () => void;
  active: AppRoute;
  onNavigate?: (id: AppRoute) => void;
  role: Role;
  user: DemoUser;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, onClose, panelRef);
  if (!open || typeof document === 'undefined') return null;
  function onOverlay(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }
  return createPortal(
    <div className="fixed inset-0 z-[55] flex bg-graphite-900/[.45] animate-fade-in lg:hidden" onMouseDown={onOverlay}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
        tabIndex={-1}
        className="h-full max-w-[86vw] shadow-lg outline-none animate-drawer-in-left"
      >
        <Sidebar
          mode="overlay"
          collapsed={false}
          active={active}
          role={role}
          user={user}
          onToggle={onClose}
          onNavigate={(id) => {
            onClose();
            onNavigate?.(id);
          }}
          className="w-[280px] max-w-full"
        />
      </div>
    </div>,
    document.body,
  );
}

/**
 * Estrutura global das telas internas.
 * - lg+: sidebar fixa 264px, recolhível para 76px (estado persistido por navegador).
 * - < lg: sidebar vira drawer (botão de menu no header).
 * - < md: bottom-nav com 5 itens; header compacto.
 */
export function AppShell({ active, title, breadcrumb, onNavigate, children, bleed = false, role = 'admin', user, onSignOut }: AppShellProps) {
  const currentUser = user ?? DEMO_USERS[role];
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* armazenamento indisponível: segue só em memória */
      }
      return next;
    });
  }, []);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setMenuOpen(false);
    }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="flex min-h-screen bg-ivory font-sans text-graphite-900">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-sm focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-gold-700 focus:shadow-md"
      >
        Pular para o conteúdo
      </a>

      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar active={active} role={role} user={currentUser} collapsed={collapsed} onToggle={toggle} onNavigate={onNavigate} />
      </div>

      <MobileMenuDrawer open={menuOpen} onClose={closeMenu} active={active} onNavigate={onNavigate} role={role} user={currentUser} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          breadcrumb={breadcrumb}
          onOpenMenu={openMenu}
          user={currentUser}
          onSignOut={onSignOut}
          onOpenProfile={role === 'profissional' ? () => onNavigate?.('meu-perfil') : undefined}
          searchPlaceholder={role === 'profissional' ? 'Buscar nos meus pacientes e consultas…' : undefined}
        />
        <main
          id="conteudo"
          tabIndex={-1}
          className={cn(
            'flex-1 pb-24 outline-none md:pb-8',
            bleed ? 'p-0 md:pb-0' : 'mx-auto w-full max-w-content px-4 pt-4 md:px-6 md:pt-6 xl:px-8 xl:pt-8',
          )}
        >
          {children}
        </main>
      </div>

      <MobileNav active={active} role={role} onNavigate={onNavigate} onOpenMenu={openMenu} />
    </div>
  );
}
