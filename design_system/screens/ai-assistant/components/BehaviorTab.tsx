import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Card, Input, Switch } from '@ds/components';
import type { AiTabProps } from './IdentityTab';

export function BehaviorTab({ config, onChange }: AiTabProps) {
  const [topic, setTopic] = useState('');

  const addTopic = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = topic.trim();
    if (!t || config.forbiddenTopics.includes(t)) return;
    onChange({ forbiddenTopics: [...config.forbiddenTopics, t] });
    setTopic('');
  };

  return (
    <div className="flex flex-col gap-6">
      <Card title="O que o assistente pode fazer" description="Ative apenas o que a clínica deseja automatizar.">
        <ul className="flex flex-col divide-y divide-graphite-100">
          {config.capabilities.map((c) => (
            <li key={c.id} className="py-3 first:pt-0 last:pb-0">
              <Switch
                checked={c.enabled}
                label={c.label}
                description={c.description}
                onChange={(v) =>
                  onChange({ capabilities: config.capabilities.map((x) => (x.id === c.id ? { ...x, enabled: v } : x)) })
                }
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Limites de atuação" description="Assuntos que o assistente nunca responde — ele transfere para a equipe.">
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Assuntos bloqueados">
          {config.forbiddenTopics.map((t) => (
            <li key={t} className="inline-flex h-8 items-center gap-1 rounded-full border border-danger/30 bg-danger-bg pl-3 pr-1 text-[12px] font-semibold text-danger">
              {t}
              <button
                type="button"
                aria-label={`Remover ${t}`}
                onClick={() => onChange({ forbiddenTopics: config.forbiddenTopics.filter((x) => x !== t) })}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/70 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addTopic} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Novo assunto bloqueado" placeholder="Ex.: Resultados de exames" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" leftIcon={Plus} disabled={!topic.trim()}>
            Adicionar
          </Button>
        </form>
        <p className="mt-4 rounded-sm bg-info-bg p-3 text-[12px] text-info">
          O assistente nunca informa diagnósticos nem inventa valores: preços e formas de pagamento seguem apenas o que estiver
          cadastrado pela clínica.
        </p>
      </Card>
    </div>
  );
}
