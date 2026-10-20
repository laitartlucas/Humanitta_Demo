/**
 * Utilitários internos dos componentes (não exportados pelo barrel).
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Anel de foco padrão (elementos com borda). */
export const focusRing =
  'focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-gold-500';
/** Anel de foco para elementos sem borda. */
export const focusRingBare = 'focus-visible:outline-none focus-visible:shadow-focus';
export const disabledCls = 'disabled:cursor-not-allowed disabled:opacity-50';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

let scrollLocks = 0;
/** Pilha de diálogos abertos: só o do topo reage a Esc/Tab. */
const dialogStack: symbol[] = [];

/**
 * Comportamento de diálogo: Esc fecha, foco vai para o painel ao abrir,
 * Tab fica preso no painel, scroll do body travado, foco restaurado ao fechar.
 */
export function useDialogBehavior(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement>) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('dialog');
    dialogStack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    scrollLocks += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (dialogStack[dialogStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = getFocusable(panelRef.current);
        if (items.length === 0) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const at = dialogStack.indexOf(token);
      if (at >= 0) dialogStack.splice(at, 1);
      scrollLocks -= 1;
      if (scrollLocks <= 0) {
        scrollLocks = 0;
        document.body.style.overflow = prevOverflow;
      }
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open, panelRef]);
}

/** Largura observada de um elemento (para gráficos SVG responsivos). */
export function useElementWidth<T extends HTMLElement>(fallback = 600): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width || fallback);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);

  return [ref, width];
}

/** Arredonda para cima em um valor "bonito" (1, 2, 2.5, 5, 10 × 10^n). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const f = value / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

export function defaultFormat(v: number): string {
  return v.toLocaleString('pt-BR');
}

/** Iniciais a partir do nome, ignorando títulos (Dra., Dr.). */
export function initialsOf(name: string): string {
  const parts = name
    .replace(/^(Dra?\.|Sr\.|Sra\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}
