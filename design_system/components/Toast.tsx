import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

export interface ToastOptions {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Duração em ms (padrão 5000; 0 = não some sozinho). */
  duration?: number;
}

export interface ToastContextValue {
  toast: (t: ToastOptions) => void;
}

export interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<ToastTone, { icon: LucideIcon; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'bg-success-bg text-success' },
  danger: { icon: XCircle, cls: 'bg-danger-bg text-danger' },
  info: { icon: Info, cls: 'bg-info-bg text-info' },
  warning: { icon: AlertTriangle, cls: 'bg-warning-bg text-warning' },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const tone = TONE[item.tone ?? 'success'];
  const Icon = tone.icon;
  const duration = item.duration ?? 5000;
  useEffect(() => {
    if (duration <= 0) return undefined;
    const t = window.setTimeout(() => onDismiss(item.id), duration);
    return () => window.clearTimeout(t);
  }, [duration, item.id, onDismiss]);

  return (
    <li
      role={item.tone === 'danger' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-md animate-pop-in"
    >
      <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone.cls)} aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
        <p className="text-body font-bold text-graphite-900">{item.title}</p>
        {item.description && <p className="text-body-sm text-graphite-600">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar notificação"
        className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-graphite-500 hover:bg-graphite-50 hover:text-graphite-900 focus-visible:outline-none focus-visible:shadow-focus"
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Provedor de notificações (canto inferior direito; acima da bottom-nav no celular). */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: ToastOptions) => {
    seq.current += 1;
    const id = seq.current;
    setItems((list) => [...list.slice(-3), { ...t, id }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <ol
            aria-live="polite"
            aria-label="Notificações"
            className="pointer-events-none fixed bottom-20 left-4 right-4 z-[70] flex flex-col gap-3 sm:left-auto sm:w-[380px] md:bottom-6 md:right-6"
          >
            {items.map((item) => (
              <ToastCard key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </ol>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Dispara toasts. Fora do ToastProvider vira no-op (com aviso no console em dev). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    toast: (t) => {
      console.warn('[Humanittá DS] useToast() chamado fora de <ToastProvider>:', t.title);
    },
  };
}
