import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { Button } from './Button';
import { IconButton } from './IconButton';

export interface DropdownMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  /**
   * Gatilho. Se for <button>, <Button> ou <IconButton>, recebe os atributos ARIA diretamente;
   * qualquer outro conteúdo é envolvido num botão com aria-label={label}.
   */
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: 'start' | 'end';
  /** Rótulo acessível do menu (e do botão gerado, quando aplicável). */
  label: string;
  className?: string;
}

interface TriggerProps {
  onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  'aria-haspopup'?: 'menu';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

/** Menu suspenso (role="menu"): setas, Home/End, Esc fecha e devolve o foco, clique fora fecha. */
export function DropdownMenu({ trigger, items, align = 'end', label, className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = `menu-${useId().replace(/:/g, '')}`;

  const enabledIdx = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  function focusTrigger() {
    rootRef.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) focusTrigger();
  }

  useEffect(() => {
    if (!open) return undefined;
    itemRefs.current[enabledIdx[0] ?? 0]?.focus();
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = enabledIdx.indexOf(current);
    let next: number | undefined;
    if (e.key === 'ArrowDown') next = enabledIdx[(pos + 1) % enabledIdx.length];
    else if (e.key === 'ArrowUp') next = enabledIdx[(pos - 1 + enabledIdx.length) % enabledIdx.length];
    else if (e.key === 'Home') next = enabledIdx[0];
    else if (e.key === 'End') next = enabledIdx[enabledIdx.length - 1];
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    } else if (e.key === 'Tab') {
      close(false);
      return;
    }
    if (next !== undefined) {
      e.preventDefault();
      itemRefs.current[next]?.focus();
    }
  }

  const triggerProps: TriggerProps = {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
  };

  let triggerNode: ReactNode;
  const isButtonLike =
    isValidElement(trigger) && (trigger.type === 'button' || trigger.type === Button || trigger.type === IconButton);
  if (isButtonLike) {
    const el = trigger as ReactElement<TriggerProps>;
    const original = el.props.onClick;
    triggerNode = cloneElement(el, {
      ...triggerProps,
      onClick: (e: ReactMouseEvent<HTMLElement>) => {
        original?.(e);
        setOpen((o) => !o);
      },
    });
  } else {
    triggerNode = (
      <button
        type="button"
        aria-label={label}
        {...triggerProps}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
      >
        {trigger}
      </button>
    );
  }

  return (
    <span ref={rootRef} className={cn('relative inline-flex', className)}>
      {triggerNode}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            'absolute top-full z-50 mt-2 min-w-[208px] rounded-md border border-graphite-200 bg-white p-1.5 shadow-md animate-pop-in',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={it.disabled}
                onClick={() => {
                  close();
                  it.onSelect();
                }}
                className={cn(
                  'flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-sm px-3 text-left text-body font-semibold outline-none transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  it.danger
                    ? 'text-danger hover:bg-danger-bg focus-visible:bg-danger-bg'
                    : 'text-graphite-800 hover:bg-graphite-50 focus-visible:bg-gold-50 focus-visible:text-graphite-900',
                )}
              >
                {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />}
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
