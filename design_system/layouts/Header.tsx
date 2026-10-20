import { useEffect, useMemo, useRef } from 'react';
import { Bell, CalendarDays, ChevronDown, ChevronRight, FlaskConical, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { DropdownMenu, IconButton, MONTHS_PT, SearchInput, Tooltip, WEEKDAYS_PT } from '@ds/components';
import { DEMO_USER, type DemoUser } from './nav';

export interface HeaderProps {
  title: string;
  breadcrumb?: string[];
  onOpenMenu?: () => void;
  /** Data exibida (padrão: hoje). */
  date?: Date;
  /** Busca global: chamada a cada alteração. */
  onSearch?: (q: string) => void;
  /** Usuário exibido (padrão: administradora demo). */
  user?: DemoUser;
  /** Placeholder da busca (o portal do profissional busca só nos próprios registros). */
  searchPlaceholder?: string;
  /** Ação "Sair" do menu do usuário. */
  onSignOut?: () => void;
  /** Ação "Meu perfil" do menu do usuário. */
  onOpenProfile?: () => void;
  className?: string;
}

/** "Segunda, 19 de outubro de 2026" */
export function formatLongDate(d: Date): string {
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Header branco 72px (64px no celular), sticky. Título Cormorant + breadcrumb, busca global (⌘K / Ctrl+K),
 * selo "Ambiente de demonstração", data, notificações e menu do usuário.
 */
export function Header({ title, breadcrumb, onOpenMenu, date, onSearch, user = DEMO_USER, searchPlaceholder, onSignOut, onOpenProfile, className }: HeaderProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const today = useMemo(() => date ?? new Date(), [date]);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const crumbs = breadcrumb && breadcrumb.length > 0 ? breadcrumb : ['Início'];

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-graphite-200 bg-white px-4 md:h-[72px] md:gap-4 md:px-6 xl:px-8',
        className,
      )}
    >
      {onOpenMenu && (
        <IconButton icon={Menu} label="Abrir menu" onClick={onOpenMenu} className="-ml-1 lg:hidden" />
      )}

      <div className="mr-auto flex min-w-0 flex-col gap-0.5">
        <nav aria-label="Trilha de navegação" className="hidden sm:block">
          <ol className="flex items-center gap-1 text-caption text-graphite-500">
            {crumbs.map((c, i) => (
              <li key={`${c}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />}
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="truncate font-display text-[22px] font-semibold leading-[1.1] text-graphite-900 md:text-display-md">
          {title}
        </h1>
      </div>

      <SearchInput
        ref={searchRef}
        aria-label="Busca global"
        placeholder={searchPlaceholder ?? 'Buscar pacientes, consultas, profissionais…'}
        shortcut={isMac ? '⌘K' : 'Ctrl K'}
        onChange={onSearch ? (e) => onSearch(e.target.value) : undefined}
        className="hidden w-[260px] lg:flex xl:w-[360px]"
      />

      <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-warning-bg px-2.5 text-caption font-bold text-warning">
        <FlaskConical size={14} strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">Ambiente de demonstração</span>
        <span className="sm:hidden">Demo</span>
      </span>

      <span className="hidden shrink-0 items-center gap-2 text-body-sm font-semibold text-graphite-700 2xl:inline-flex">
        <CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
        <time dateTime={today.toISOString().slice(0, 10)}>{formatLongDate(today)}</time>
      </span>

      <Tooltip content="Notificações">
        <IconButton icon={Bell} label="Notificações (3 novas)" variant="secondary" badge />
      </Tooltip>

      <DropdownMenu
        label="Menu do usuário"
        align="end"
        trigger={
          <button
            type="button"
            aria-label={`Menu do usuário: ${user.name}, ${user.role}`}
            className="flex h-11 shrink-0 items-center gap-2.5 rounded-sm pl-1 pr-1 transition-colors hover:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus md:pr-2"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-[13px] font-extrabold text-gold-700 shadow-[0_0_0_2px_#FFFFFF,0_0_0_3px_#DDB872]"
            >
              {user.initials}
            </span>
            <span className="hidden flex-col items-start xl:flex" aria-hidden="true">
              <span className="text-body-sm font-bold text-graphite-900">{user.name}</span>
              <span className="text-caption font-medium text-graphite-500">{user.role}</span>
            </span>
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className="hidden text-graphite-500 md:block" />
          </button>
        }
        items={[
          { label: 'Meu perfil', icon: UserRound, onSelect: () => onOpenProfile?.() },
          { label: 'Preferências', icon: Settings, onSelect: () => undefined },
          { label: 'Sair da demonstração', icon: LogOut, onSelect: () => onSignOut?.(), danger: true },
        ]}
      />
    </header>
  );
}
