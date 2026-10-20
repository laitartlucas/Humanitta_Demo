import { useState } from 'react';
import { BookOpen, Bot, CalendarCheck, Clock, FlaskConical, MessagesSquare, Save, ShieldCheck, SlidersHorizontal, UserRound, Zap } from 'lucide-react';
import { Badge, Button, KpiCard, Switch, Tabs, useToast } from '@ds/components';
import { aiAssistantStats, defaultAiConfig } from '@ds/mocks/business';
import type { AiAssistantConfig } from '@ds/mocks/business';
import {
  BehaviorTab,
  ChatPreview,
  HoursTab,
  IdentityTab,
  KnowledgeTab,
  TestingTab,
  TransferTab,
} from './components';

type AiTab = 'identidade' | 'comportamento' | 'conhecimento' | 'horarios' | 'transferencia' | 'testes';

const TAB_IDS: AiTab[] = ['identidade', 'comportamento', 'conhecimento', 'horarios', 'transferencia', 'testes'];

function isAiTab(v: string): v is AiTab {
  return (TAB_IDS as string[]).includes(v);
}

export function AiAssistantScreen() {
  const { toast } = useToast();
  const [saved, setSaved] = useState<AiAssistantConfig>(defaultAiConfig);
  const [config, setConfig] = useState<AiAssistantConfig>(defaultAiConfig);
  const [tab, setTab] = useState<AiTab>('identidade');
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(saved) !== JSON.stringify(config);
  const patch = (p: Partial<AiAssistantConfig>) => setConfig((c) => ({ ...c, ...p }));

  const toggleEnabled = (enabled: boolean) => {
    setConfig((c) => ({ ...c, enabled }));
    setSaved((s) => ({ ...s, enabled }));
    toast({
      tone: enabled ? 'success' : 'warning',
      title: enabled ? 'Assistente ativado' : 'Assistente desativado',
      description: enabled
        ? 'Novas conversas serão atendidas automaticamente (simulação).'
        : 'Todas as mensagens irão direto para a equipe.',
    });
  };

  const save = () => {
    if (!config.name.trim()) {
      setTab('identidade');
      toast({ tone: 'danger', title: 'Revise os campos', description: 'O nome do assistente é obrigatório.' });
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      setSaved(config);
      setSaving(false);
      toast({ tone: 'success', title: 'Configurações salvas', description: 'As alterações valem para as próximas conversas.' });
    }, 600);
  };

  const enabledFaqs = config.faqs.filter((f) => f.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-md border border-graphite-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-gold-400 bg-ai-bg text-ai">
            <Bot size={26} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[26px] font-semibold leading-8 text-graphite-900">{config.name || 'Assistente'}</h2>
              <Badge tone={config.enabled ? 'success' : 'neutral'} dot>
                {config.enabled ? 'Ativo' : 'Desativado'}
              </Badge>
              <Badge tone="gold" icon={ShieldCheck} size="sm">
                Simulação — sem IA real
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-graphite-500">
              Atende pacientes no WhatsApp: agenda, confirma, responde dúvidas e transfere para a equipe quando necessário.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end xl:flex-row xl:items-center">
          <Switch
            checked={config.enabled}
            onChange={toggleEnabled}
            label="Assistente ativo"
            description="Liga ou desliga o atendimento automático"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Conversas hoje" value={String(aiAssistantStats.conversationsToday)} icon={MessagesSquare} tone="ai" />
        <KpiCard
          label="Resolvidas pela IA"
          value={`${Math.round(aiAssistantStats.resolvedByAi * 100)}%`}
          icon={Zap}
          tone="success"
          progress={aiAssistantStats.resolvedByAi * 100}
        />
        <KpiCard label="Agendamentos feitos" value={String(aiAssistantStats.appointmentsBooked)} icon={CalendarCheck} tone="gold" />
        <KpiCard label="Tempo médio de resposta" value={`${aiAssistantStats.avgResponseSec}s`} icon={Clock} tone="warning" />
      </div>

      <Tabs
        ariaLabel="Configurações do assistente"
        value={tab}
        onChange={(id) => {
          if (isAiTab(id)) setTab(id);
        }}
        items={[
          { id: 'identidade', label: 'Identidade', icon: UserRound },
          { id: 'comportamento', label: 'Comportamento', icon: SlidersHorizontal },
          { id: 'conhecimento', label: 'Conhecimento/FAQ', icon: BookOpen, count: enabledFaqs },
          { id: 'horarios', label: 'Horários', icon: Clock },
          { id: 'transferencia', label: 'Transferência humana', icon: UserRound },
          { id: 'testes', label: 'Ambiente de testes', icon: FlaskConical },
        ]}
      />

      {tab === 'testes' ? (
        <TestingTab key={`${saved.greeting}-${config.enabled}`} config={config} />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {tab === 'identidade' && <IdentityTab config={config} onChange={patch} />}
            {tab === 'comportamento' && <BehaviorTab config={config} onChange={patch} />}
            {tab === 'conhecimento' && <KnowledgeTab config={config} onChange={patch} />}
            {tab === 'horarios' && <HoursTab config={config} onChange={patch} />}
            {tab === 'transferencia' && <TransferTab config={config} onChange={patch} />}
          </div>
          <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
            <ChatPreview config={config} />
            <Button variant="secondary" leftIcon={FlaskConical} onClick={() => setTab('testes')} fullWidth>
              Testar o assistente
            </Button>
          </div>
        </div>
      )}

      {dirty && (
        <div
          role="region"
          aria-label="Alterações não salvas"
          className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-md border border-gold-200 bg-white p-4 shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-[13px] font-semibold text-graphite-800">Você tem alterações não salvas.</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfig(saved)} disabled={saving}>
              Descartar
            </Button>
            <Button leftIcon={Save} onClick={save} loading={saving}>
              Salvar alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
