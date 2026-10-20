import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRightLeft, Check } from 'lucide-react';
import { Button } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { TRANSFER_TARGETS } from '@ds/mocks/business';

export interface TransferMenuProps {
  onTransfer: (target: { id: string; label: string }) => void;
  currentTarget?: string;
  compact?: boolean;
}

/** Menu de transferência da conversa para um setor/pessoa (simulado). */
export function TransferMenu({ onTransfer, currentTarget, compact = false }: TransferMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        size="sm"
        leftIcon={ArrowRightLeft}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={compact ? 'Transferir conversa' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {compact ? <span className="sr-only sm:not-sr-only">Transferir</span> : 'Transferir'}
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Transferir conversa para"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-md border border-graphite-200 bg-white p-1.5 shadow-md"
        >
          <p className="px-3 pb-1 pt-2 text-overline uppercase tracking-[.08em] text-graphite-500">Transferir para</p>
          {TRANSFER_TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onTransfer({ id: t.id, label: t.label });
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-sm px-3 py-2.5 text-left',
                'hover:bg-graphite-50 focus-visible:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus',
              )}
            >
              <span className="flex flex-1 flex-col">
                <span className="text-[14px] font-semibold text-graphite-900">{t.label}</span>
                <span className="text-[12px] text-graphite-500">{t.description}</span>
              </span>
              {currentTarget === t.label && <Check size={16} className="mt-1 text-gold-600" aria-label="Atual" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
