import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRightLeft, Bot, RotateCcw, SendHorizontal, Sparkles } from 'lucide-react';
import { Badge, Button, Card, IconButton, ProgressBar, Switch } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { AI_SAMPLE_PROMPTS } from '@ds/mocks/business';
import type { AiSettings } from '@modules/ai-assistant/settings';
import { INTENT_LABEL, simulateReply } from './simulate';
import type { SimulationContext, SimulationResult } from './simulate';

export interface TestingTabProps {
  config: AiSettings;
  /** Dados reais (somente leitura) usados pela simulação: horários livres e especialidades. */
  context?: Pick<SimulationContext, 'findSlots' | 'specialties'>;
}

/** Cenários prontos para validar o comportamento configurado. */
const SCENARIOS: { label: string; text: string; outOfHours?: boolean }[] = [
  { label: 'Pergunta frequente', text: 'Qual o endereço de vocês?' },
  { label: 'Fora do horário', text: 'Oi, boa noite!', outOfHours: true },
  { label: 'Atendimento humano', text: 'Preciso falar com uma atendente' },
  { label: 'Disponibilidade', text: 'Tem horário disponível para fisioterapia?' },
  { label: 'Não reconhecida', text: 'Blá blá xyz' },
];

const SOURCE_LABEL: Record<SimulationResult['source'], string> = {
  faq: 'Base de conhecimento (FAQ)',
  personalizada: 'Resposta personalizada',
  regra: 'Regra do assistente',
  fallback: 'Mensagem padrão (não reconhecida)',
};

interface TestMessage {
  id: number;
  from: 'paciente' | 'ia';
  text: string;
  transfer?: boolean;
}

export function TestingTab({ config, context }: TestingTabProps) {
  const [messages, setMessages] = useState<TestMessage[]>(() => [{ id: 0, from: 'ia', text: config.greeting }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [last, setLast] = useState<SimulationResult | null>(null);
  const [outOfHours, setOutOfHours] = useState(false);
  const failures = useRef(0);
  const counter = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, typing]);

  const ask = (text: string, forceOutOfHours = outOfHours) => {
    const t = text.trim();
    if (!t || typing) return;
    const id = counter.current++;
    setMessages((m) => [...m, { id, from: 'paciente', text: t }]);
    setInput('');
    setTyping(true);
    window.setTimeout(() => {
      const result: SimulationResult = config.enabled
        ? simulateReply(t, config, { ...context, forceOutOfHours, previousFailures: failures.current })
        : {
            intent: 'humano',
            confidence: 1,
            reply: 'Assistente desativado — a mensagem seria encaminhada direto para a equipe.',
            transfer: true,
            outOfHours: forceOutOfHours,
            source: 'regra',
            matchedKeywords: [],
            entities: [],
          };
      failures.current = result.source === 'fallback' && !result.transfer ? failures.current + 1 : 0;
      setMessages((m) => [...m, { id: counter.current++, from: 'ia', text: result.reply, transfer: result.transfer }]);
      setLast(result);
      setTyping(false);
    }, 650);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    ask(input);
  };

  const reset = () => {
    counter.current = 1;
    failures.current = 0;
    setMessages([{ id: 0, from: 'ia', text: config.greeting }]);
    setLast(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card
        padding="none"
        title="Ambiente de testes"
        description="Converse como se fosse um paciente. Respostas simuladas por regras — não é IA real."
        action={
          <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={reset}>
            Reiniciar
          </Button>
        }
      >
        <div className="flex h-[480px] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto bg-ivory p-4" aria-live="polite">
            <ol className="flex flex-col gap-3">
              {messages.map((m) => (
                <li key={m.id} className={cn('flex', m.from === 'paciente' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-md px-3.5 py-2.5 text-[14px] leading-[22px] shadow-sm sm:max-w-[70%]',
                      m.from === 'paciente' ? 'rounded-tr-xs border border-graphite-200 bg-white' : 'rounded-tl-xs border border-ai/20 bg-ai-bg',
                    )}
                  >
                    <span className="sr-only">{m.from === 'paciente' ? 'Você (paciente): ' : `${config.name}: `}</span>
                    {m.from === 'ia' && (
                      <span className="mb-1 flex items-center gap-1 text-[11px] font-bold text-ai">
                        <Bot size={12} aria-hidden="true" /> {config.name}
                      </span>
                    )}
                    <p className="whitespace-pre-wrap text-graphite-900">{m.text}</p>
                    {m.transfer && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-info">
                        <ArrowRightLeft size={12} aria-hidden="true" /> Transferida para a equipe
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {typing && (
                <li className="flex justify-start">
                  <span className="rounded-md bg-ai-bg px-3 py-2 text-[12px] font-semibold text-ai">digitando…</span>
                </li>
              )}
            </ol>
            <div ref={endRef} />
          </div>
          <div className="border-t border-graphite-200 bg-white p-3">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Switch checked={outOfHours} onChange={setOutOfHours} label="Simular fora do horário" />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cenários de teste">
                {SCENARIOS.map((s) => (
                  <Button key={s.label} size="sm" variant="ghost" disabled={typing} onClick={() => ask(s.text, s.outOfHours ?? outOfHours)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Exemplos de mensagens">
              {AI_SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => ask(p)}
                  disabled={typing}
                  className="rounded-full border border-graphite-200 bg-graphite-50 px-3 py-1.5 text-[12px] font-semibold text-graphite-700 hover:border-gold-300 hover:bg-gold-50 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="flex items-center gap-2">
              <label htmlFor="ai-test-input" className="sr-only">
                Mensagem de teste
              </label>
              <input
                id="ai-test-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite como um paciente…"
                className="h-10 flex-1 rounded-sm border border-graphite-200 px-3 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:border-gold-500 focus:outline-none focus:shadow-focus"
              />
              <IconButton type="submit" icon={SendHorizontal} label="Enviar mensagem de teste" variant="secondary" disabled={!input.trim() || typing} />
            </form>
          </div>
        </div>
      </Card>

      <Card title="Intenção detectada" description="Como o assistente interpretou a última mensagem.">
        {last ? (
          <dl className="flex flex-col gap-4 text-[13px]">
            <div>
              <dt className="text-graphite-500">Intenção</dt>
              <dd className="mt-1 flex items-center gap-2">
                <Badge tone={last.transfer ? 'info' : 'ai'} icon={last.transfer ? ArrowRightLeft : Sparkles}>
                  {INTENT_LABEL[last.intent]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-graphite-500">Confiança</dt>
              <dd>
                <ProgressBar
                  value={Math.round(last.confidence * 100)}
                  label={`${Math.round(last.confidence * 100)}%`}
                  tone={last.confidence >= 0.8 ? 'success' : last.confidence >= 0.5 ? 'gold' : 'warning'}
                />
              </dd>
            </div>
            <div>
              <dt className="text-graphite-500">Origem da resposta</dt>
              <dd className="font-semibold text-graphite-900">{SOURCE_LABEL[last.source]}</dd>
            </div>
            {last.outOfHours && (
              <div>
                <dt className="text-graphite-500">Horário</dt>
                <dd className="font-semibold text-warning">Fora do atendimento humano</dd>
              </div>
            )}
            <div>
              <dt className="text-graphite-500">Ação</dt>
              <dd className="font-semibold text-graphite-900">{last.transfer ? 'Transferir para a equipe' : 'Responder automaticamente'}</dd>
            </div>
            <div>
              <dt className="mb-1 text-graphite-500">Palavras-chave reconhecidas</dt>
              <dd className="flex flex-wrap gap-1">
                {last.matchedKeywords.length ? (
                  last.matchedKeywords.map((k) => (
                    <span key={k} className="rounded-full bg-graphite-100 px-2 py-0.5 text-[11px] font-semibold text-graphite-700">
                      {k}
                    </span>
                  ))
                ) : (
                  <span className="text-graphite-500">Nenhuma</span>
                )}
              </dd>
            </div>
            {last.entities.length > 0 && (
              <div>
                <dt className="mb-1 text-graphite-500">Informações extraídas</dt>
                <dd>
                  <ul className="flex flex-col gap-1">
                    {last.entities.map((e) => (
                      <li key={e.label} className="flex justify-between gap-2">
                        <span className="text-graphite-600">{e.label}</span>
                        <span className="font-semibold text-graphite-900">{e.value}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {last.faqId && (
              <div>
                <dt className="text-graphite-500">Fonte</dt>
                <dd className="font-semibold text-graphite-900">
                  FAQ: {config.faqs.find((f) => f.id === last.faqId)?.question ?? '—'}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-[13px] text-graphite-500">Envie uma mensagem de teste para ver a análise.</p>
        )}
      </Card>
    </div>
  );
}
