import { useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@ds/foundations/cn';
import { IconButton } from './IconButton';
import { useDialogBehavior } from './internal';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  children: ReactNode;
  /** Impede fechar por overlay/Esc (ex.: durante salvamento). */
  dismissible?: boolean;
  className?: string;
}

const SIZE = { sm: 'md:max-w-[440px]', md: 'md:max-w-[640px]', lg: 'md:max-w-[880px]' } as const;

/**
 * Diálogo modal. Portal em document.body; Esc e clique no overlay fecham; foco preso no painel.
 * < md vira bottom sheet de largura total.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  dismissible = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');
  const titleId = `modal-${id}-title`;
  const descId = description ? `modal-${id}-desc` : undefined;
  const close = () => {
    if (dismissible) onClose();
  };
  useDialogBehavior(open, close, panelRef);

  if (!open || typeof document === 'undefined') return null;

  function onOverlay(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) close();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-graphite-900/[.45] backdrop-blur-[2px] animate-fade-in md:items-center md:p-6"
      onMouseDown={onOverlay}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-lg outline-none',
          'animate-sheet-up md:animate-pop-in md:rounded-lg',
          SIZE[size],
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-graphite-200 md:hidden" aria-hidden="true" />
        <header className="flex items-start gap-4 px-6 pb-4 pt-4 md:pt-6">
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
          {dismissible && <IconButton icon={X} label="Fechar" onClick={onClose} className="-mr-2 -mt-1" />}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <footer className="hm-safe-bottom flex flex-col-reverse gap-2 border-t border-graphite-100 bg-white px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
