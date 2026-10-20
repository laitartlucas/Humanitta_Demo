import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, IconButton, Input, Switch, Textarea } from '@ds/components';
import type { AiFaq } from '@ds/mocks/business';
import type { AiTabProps } from './IdentityTab';

interface Draft {
  id: string | null;
  question: string;
  answer: string;
  keywords: string;
}

const EMPTY: Draft = { id: null, question: '', answer: '', keywords: '' };

export function KnowledgeTab({ config, onChange }: AiTabProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.question.trim() || !draft.answer.trim()) {
      setError('Preencha a pergunta e a resposta.');
      return;
    }
    const keywords = draft.keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const faq: AiFaq = {
      id: draft.id ?? `faq-${Date.now()}`,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      keywords,
      enabled: true,
    };
    onChange({
      faqs: draft.id ? config.faqs.map((f) => (f.id === draft.id ? { ...faq, enabled: f.enabled } : f)) : [...config.faqs, faq],
    });
    setDraft(null);
    setError(null);
  };

  return (
    <Card
      title="Base de conhecimento (FAQ)"
      description="Respostas que o assistente usa quando identifica as palavras-chave."
      action={
        <Button size="sm" leftIcon={Plus} onClick={() => setDraft(EMPTY)}>
          Nova pergunta
        </Button>
      }
    >
      {draft && (
        <form onSubmit={save} className="mb-5 flex flex-col gap-4 rounded-md border border-gold-200 bg-gold-50 p-4" aria-label="Editar pergunta frequente">
          <Input label="Pergunta" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          <Textarea label="Resposta" rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
          <Input
            label="Palavras-chave"
            hint="Separe por vírgulas. Ex.: endereço, onde fica, localização"
            value={draft.keywords}
            onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
            error={error ?? undefined}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDraft(null); setError(null); }}>
              Cancelar
            </Button>
            <Button type="submit">Salvar pergunta</Button>
          </div>
        </form>
      )}

      {config.faqs.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma pergunta cadastrada" description="Adicione perguntas frequentes para o assistente responder." />
      ) : (
        <ul className="flex flex-col divide-y divide-graphite-100">
          {config.faqs.map((f) => (
            <li key={f.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[14px] font-bold text-graphite-900">{f.question}</p>
                <p className="text-[13px] text-graphite-600">{f.answer}</p>
                <ul className="mt-1 flex flex-wrap gap-1" aria-label="Palavras-chave">
                  {f.keywords.map((k) => (
                    <li key={k} className="rounded-full bg-graphite-100 px-2 py-0.5 text-[11px] font-semibold text-graphite-600">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={f.enabled}
                  label={f.enabled ? 'Ativa' : 'Inativa'}
                  onChange={(v) => onChange({ faqs: config.faqs.map((x) => (x.id === f.id ? { ...x, enabled: v } : x)) })}
                />
                <IconButton
                  icon={Pencil}
                  label={`Editar "${f.question}"`}
                  size="sm"
                  onClick={() => setDraft({ id: f.id, question: f.question, answer: f.answer, keywords: f.keywords.join(', ') })}
                />
                <IconButton
                  icon={Trash2}
                  label={`Excluir "${f.question}"`}
                  size="sm"
                  onClick={() => onChange({ faqs: config.faqs.filter((x) => x.id !== f.id) })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
