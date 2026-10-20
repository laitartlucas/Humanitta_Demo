import { useState } from 'react';
import type { FormEvent } from 'react';
import { MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, IconButton, Input, Switch, Textarea } from '@ds/components';
import { newId } from '@core';
import type { AiCustomReply } from '@modules/ai-assistant/settings';
import type { AiTabProps } from './IdentityTab';

interface Draft {
  id: string | null;
  label: string;
  answer: string;
  keywords: string;
}

const EMPTY: Draft = { id: null, label: '', answer: '', keywords: '' };

/** Respostas personalizadas: têm prioridade sobre a FAQ quando a palavra-chave aparece. */
export function CustomRepliesCard({ config, onChange }: AiTabProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replies = config.customReplies;

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft) return;
    const keywords = draft.keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (!draft.label.trim() || !draft.answer.trim() || keywords.length === 0) {
      setError('Preencha o nome, a resposta e ao menos uma palavra-chave.');
      return;
    }
    const item: AiCustomReply = { id: draft.id ?? newId('cr'), label: draft.label.trim(), answer: draft.answer.trim(), keywords, enabled: true };
    onChange({
      customReplies: draft.id ? replies.map((r) => (r.id === draft.id ? { ...item, enabled: r.enabled } : r)) : [...replies, item],
    });
    setDraft(null);
    setError(null);
  };

  return (
    <Card
      title="Respostas personalizadas"
      description="Textos da clínica para palavras-chave específicas. Têm prioridade sobre a FAQ."
      action={
        <Button size="sm" variant="secondary" leftIcon={Plus} onClick={() => setDraft(EMPTY)}>
          Nova resposta
        </Button>
      }
    >
      {draft && (
        <form onSubmit={save} className="mb-5 flex flex-col gap-4 rounded-md border border-gold-200 bg-gold-50 p-4" aria-label="Editar resposta personalizada">
          <Input label="Nome" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Textarea label="Resposta" rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
          <Input
            label="Palavras-chave"
            hint="Separe por vírgulas."
            value={draft.keywords}
            onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
            error={error ?? undefined}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDraft(null); setError(null); }}>
              Cancelar
            </Button>
            <Button type="submit">Salvar resposta</Button>
          </div>
        </form>
      )}
      {replies.length === 0 ? (
        <EmptyState compact icon={MessageSquareText} title="Nenhuma resposta personalizada" description="Crie respostas para assuntos frequentes da sua clínica." />
      ) : (
        <ul className="flex flex-col divide-y divide-graphite-100">
          {replies.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[14px] font-bold text-graphite-900">{r.label}</p>
                <p className="text-[13px] text-graphite-600">{r.answer}</p>
                <ul className="mt-1 flex flex-wrap gap-1" aria-label="Palavras-chave">
                  {r.keywords.map((k) => (
                    <li key={k} className="rounded-full bg-graphite-100 px-2 py-0.5 text-[11px] font-semibold text-graphite-600">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={r.enabled}
                  label={r.enabled ? 'Ativa' : 'Inativa'}
                  onChange={(v) => onChange({ customReplies: replies.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) })}
                />
                <IconButton
                  icon={Pencil}
                  label={`Editar "${r.label}"`}
                  size="sm"
                  onClick={() => setDraft({ id: r.id, label: r.label, answer: r.answer, keywords: r.keywords.join(', ') })}
                />
                <IconButton icon={Trash2} label={`Excluir "${r.label}"`} size="sm" onClick={() => onChange({ customReplies: replies.filter((x) => x.id !== r.id) })} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
