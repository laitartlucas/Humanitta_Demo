import { useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { IconButton } from './IconButton';
import { useDialogBehavior } from './internal';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Largura em px (padrão 480). Em telas menores ocupa 100%. */
  width?: number;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Painel lateral à direita (detalhes, formulários longos). Mesmo comportamento de foco do Modal. */
export function Drawer({ open, onClose, title, description, width = 480, footer, children, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');
  const titleId = `drawer-${id}-title`;
  const descId = description ? `drawer-${id}-desc` : undefined;
  useDialogBehavior(open, onClose, panelRef);

  if (!open || typeof document === 'undefined') return null;

  function onOverlay(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-graphite-900/[.45] backdrop-blur-[2px] animate-fade-in"
      onMouseDown={onOverlay}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        style={{ width, maxWidth: '100%' }}
        className={cn('flex h-full flex-col bg-white shadow-lg outline-none animate-drawer-in', className)}
      >
        <header className="flex items-start gap-4 border-b border-graphite-100 px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={titleId} className="font-display text-[24px] font-semibold leading-[30px] text-graphite-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-body text-graphite-500">
                {description}
              </p>
            )}
          </div>
          <IconButton icon={X} label="Fechar painel" onClick={onClose} className="-mr-2 -mt-1" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="hm-safe-bottom flex flex-wrap items-center justify-end gap-3 border-t border-graphite-100 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
