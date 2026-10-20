import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@ds/foundations/cn';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Lado preferido (padrão top). */
  side?: 'top' | 'right' | 'bottom';
  /** Desativa o tooltip sem desmontar o filho. */
  disabled?: boolean;
}

interface Pos {
  top: number;
  left: number;
}

/**
 * Dica curta em hover/foco (portal com position fixed — não é cortada por overflow).
 * O filho recebe aria-describedby. Use só para texto complementar; nunca para informação essencial.
 */
export function Tooltip({ content, children, side = 'top', disabled = false }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = `tt-${useId().replace(/:/g, '')}`;

  function show() {
    if (disabled) return;
    const el = wrapRef.current?.firstElementChild ?? wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (side === 'right') setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    else if (side === 'bottom') setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
    else setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    setOpen(true);
  }
  function hide() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
    };
  }, [open]);

  const child =
    isValidElement(children) && !disabled
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': id })
      : children;

  const transform =
    side === 'right' ? 'translate(0, -50%)' : side === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';

  return (
    <span
      ref={wrapRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {child}
      {!disabled &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={pos ? { top: pos.top, left: pos.left, transform } : undefined}
            className={cn(
              'pointer-events-none fixed z-[80] max-w-[240px] rounded-xs bg-graphite-900 px-2.5 py-1.5 text-caption font-semibold text-sidebar-strong shadow-md',
              open && pos ? 'opacity-100 animate-fade-in' : 'invisible opacity-0',
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
