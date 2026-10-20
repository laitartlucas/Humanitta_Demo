import { useRef, type KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
  /** Prefixo dos ids (tab: `${idPrefix}-tab-${id}`, painel: `${idPrefix}-panel-${id}`). */
  idPrefix?: string;
}

/**
 * Abas com sublinhado gold-500 2px. Navegação por setas/Home/End (roving tabindex).
 * O painel deve usar role="tabpanel" e aria-labelledby={`${idPrefix}-tab-${id}`}.
 */
export function Tabs({ items, value, onChange, ariaLabel, className, idPrefix = 'tabs' }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = items.filter((i) => !i.disabled);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = enabled.findIndex((i) => i.id === value);
    let next: TabItem | undefined;
    if (e.key === 'ArrowRight') next = enabled[(idx + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(idx - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next.id);
      refs.current[next.id]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn('flex gap-1 overflow-x-auto border-b border-graphite-200', className)}
    >
      {items.map(({ id, label, count, icon: Icon, disabled }) => {
        const active = id === value;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            id={`${idPrefix}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${id}`}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={cn(
              'relative -mb-px inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-xs border-b-2 px-3 text-body font-bold transition-colors',
              'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50',
              active
                ? 'border-gold-500 text-graphite-900'
                : 'border-transparent text-graphite-500 hover:border-graphite-300 hover:text-graphite-800',
            )}
          >
            {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
            {label}
            {count !== undefined && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums',
                  active ? 'bg-gold-100 text-gold-700' : 'bg-graphite-100 text-graphite-600',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
