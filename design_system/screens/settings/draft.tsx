/**
 * Rascunhos das seções de Configurações (estado de INTERFACE, não de entidades).
 *
 * Cada seção edita uma cópia local do documento compartilhado (`clinicSettings`) e só grava ao
 * salvar — pela própria seção ou pela barra "Salvar alterações" — via serviço do core. Enquanto não
 * há edição, a seção mostra o valor do banco (alterações de outros módulos aparecem na hora).
 */
import { useToast } from '@ds/components';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface DraftHandle {
  save: (opts?: { silent?: boolean }) => Promise<boolean>;
  discard: () => void;
}

interface DraftRegistry {
  setEntry: (id: string, dirty: boolean, handle: DraftHandle) => void;
  remove: (id: string) => void;
}

const RegistryContext = createContext<DraftRegistry | null>(null);

export interface SettingsDrafts {
  dirtyIds: string[];
  saveAll: () => Promise<{ saved: number; failed: number }>;
  discardAll: () => void;
}

export function SettingsDraftProvider({ children, onChange }: { children: ReactNode; onChange: (drafts: SettingsDrafts) => void }) {
  const handles = useRef(new Map<string, DraftHandle>());
  const [dirty, setDirty] = useState<string[]>([]);

  const registry = useMemo<DraftRegistry>(
    () => ({
      setEntry(id, isDirty, handle) {
        handles.current.set(id, handle);
        setDirty((list) => {
          const has = list.includes(id);
          if (isDirty === has) return list;
          return isDirty ? [...list, id] : list.filter((x) => x !== id);
        });
      },
      remove(id) {
        handles.current.delete(id);
        setDirty((list) => (list.includes(id) ? list.filter((x) => x !== id) : list));
      },
    }),
    [],
  );

  const saveAll = useCallback(async () => {
    let saved = 0;
    let failed = 0;
    for (const id of dirty) {
      const ok = await handles.current.get(id)?.save({ silent: true });
      if (ok) saved += 1;
      else failed += 1;
    }
    return { saved, failed };
  }, [dirty]);

  const discardAll = useCallback(() => {
    for (const id of dirty) handles.current.get(id)?.discard();
  }, [dirty]);

  useEffect(() => onChange({ dirtyIds: dirty, saveAll, discardAll }), [dirty, saveAll, discardAll, onChange]);

  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface DraftOptions<T> {
  /** Erros por campo (vazio = válido). */
  validate?: (value: T) => Record<string, string>;
  /** Toast de sucesso ao salvar pela própria seção (a barra global mostra um toast único). */
  success: string;
}

/**
 * Rascunho de uma seção. `persist` grava o valor (via `useAction(...).run`) e devolve `undefined`
 * em caso de erro (o toast de erro vem do `useAction`).
 */
export function useSettingsDraft<T>(id: string, source: T, persist: (value: T) => Promise<unknown>, { validate, success }: DraftOptions<T>) {
  const registry = useContext(RegistryContext);
  const { toast } = useToast();
  const [draft, setDraftState] = useState<T | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const value = draft ?? source;
  const dirty = draft !== null && !same(draft, source);

  const setDraft = useCallback(
    (updater: (current: T) => T) => setDraftState((d) => updater(d ?? source)),
    [source],
  );

  const discard = useCallback(() => {
    setDraftState(null);
    setErrors({});
  }, []);

  const save = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const errs = validate?.(value) ?? {};
      setErrors(errs);
      if (Object.keys(errs).length) {
        toast({ tone: 'danger', title: 'Revise os campos destacados', description: Object.values(errs)[0] });
        return false;
      }
      setSaving(true);
      const result = await persist(value);
      setSaving(false);
      if (result === undefined) return false;
      setDraftState(null);
      if (!opts.silent) toast({ tone: 'success', title: success, description: 'Salvo nos dados de demonstração.' });
      return true;
    },
    [persist, validate, value, toast, success],
  );

  useEffect(() => {
    registry?.setEntry(id, dirty, { save, discard });
  }, [registry, id, dirty, save, discard]);
  useEffect(() => () => registry?.remove(id), [registry, id]);

  return { value, setDraft, dirty, save, discard, saving, errors };
}
