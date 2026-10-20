import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, CalendarCheck, Clock, Eye, FlaskConical, MessagesSquare, RotateCcw, Save, ShieldCheck, SlidersHorizontal, UserRound, Zap } from 'lucide-react';
import { Badge, Button, ConfirmDialog, KpiCard, Switch, Tabs, useToast } from '@ds/components';
import { can, messagingService, selectAppointments, todayKey, useAction, useAiConfig, useCan, useProfessionals, useQuery, useSpecialties } from '@core';
import { defaultAiSettings, withExtras, type AiSettings } from '@modules/ai-assistant/settings';
import { findAvailableSlots } from '@modules/messaging/availability';
import { statusOf } from '@modules/messaging/model';
import {
  BehaviorTab,
  ChatPreview,
  HoursTab,
  IdentityTab,
  KnowledgeTab,
  TestingTab,
  TransferTab,
} from './components';
import type { SimulationContext } from './components';

type AiTab = 'identidade' | 'comportamento' | 'conhecimento' | 'horarios' | 'transferencia' | 'testes';

const TAB_IDS: AiTab[] = ['identidade', 'comportamento', 'conhecimento', 'horarios', 'transferencia', 'testes'];

function isAiTab(v: string): v is AiTab {
  return (TAB_IDS as string[]).includes(v);
}

const same = (a: AiSettings, b: AiSettings) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Assistente IA — painel de configuração (SIMULAÇÃO, sem IA real nem integração conectada).
 * Lê e grava o documento compartilhado `aiConfig` (`useAiConfig` + `messagingService.updateAiConfig`).
 * Perfis sem `assistente_ia ≥ editar` veem tudo em somente leitura; o simulador continua disponível.
 */
export function AiAssistantScreen() {
  const { toast } = useToast();
  const canEdit = useCan('assistente_ia', 'editar');
  const stored = useAiConfig();
  const saved = useMemo(() => withExtras(stored), [stored]);
  const [config, setConfig] = useState<AiSettings>(saved);
  const [tab, setTab] = useState<AiTab>('identidade');
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = !same(saved, config);
  // Outro módulo/aba gravou a configuração: acompanha se não houver rascunho em edição.
  const [base, setBase] = useState(saved);
  useEffect(() => {
    if (!same(base, saved)) {
      if (same(base, config)) setConfig(saved);
      setBase(saved);
    }
  }, [saved, base, config]);

  const update = useAction(messagingService.updateAiConfig);
  const patch = (p: Partial<AiSettings>) => setConfig((c) => ({ ...c, ...p }));

  /* ------------------------- indicadores (dados reais) ------------------------- */
  const kpis = useQuery((s, c) => {
    if (!can(c, 'whatsapp', 'ver', s.clinicSettings.permissionOverrides)) return null;
    const today = todayKey();
    const todays = s.conversations.filter((cv) => cv.lastAt.startsWith(today));
    const withAi = s.conversations.filter((cv) => cv.mode === 'ia' && statusOf(cv) !== 'encerrada').length;
    const active = s.conversations.filter((cv) => statusOf(cv) !== 'encerrada').length;
    const booked = selectAppointments(s, c).filter((a) => a.channel === 'whatsapp' || a.channel === 'assistente_ia').length;
    const byConv = new Map<string, typeof s.messages>();
    for (const m of s.messages) byConv.set(m.conversationId, [...(byConv.get(m.conversationId) ?? []), m]);
    const gaps: number[] = [];
    byConv.forEach((list) => {
      const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
      sorted.forEach((m, i) => {
        const next = sorted[i + 1];
        if (m.from === 'paciente' && next?.from === 'ia') gaps.push((new Date(next.at).getTime() - new Date(m.at).getTime()) / 1000);
      });
    });
    const avg = gaps.length ? Math.round(gaps.reduce((t, g) => t + g, 0) / gaps.length) : 0;
    return { today: todays.length, aiShare: active ? withAi / active : 0, booked, avg, hasGaps: gaps.length > 0 };
  });

  /* ------------------------- contexto real para o simulador ------------------------- */
  const professionals = useProfessionals();
  const specialties = useSpecialties();
  const simContext = useMemo<Pick<SimulationContext, 'findSlots' | 'specialties'>>(
    () => ({
      findSlots: (specialty) => findAvailableSlots(professionals, { specialty, limit: 3 }).map((s) => s.label),
      specialties: specialties.filter((s) => s.active).map((s) => s.name),
    }),
    [professionals, specialties],
  );

  /* ------------------------------- ações ------------------------------- */
  const toggleEnabled = async (enabled: boolean) => {
    const ok = await update.run({ enabled });
    if (!ok) return;
    setConfig((c) => ({ ...c, enabled }));
    toast({
      tone: enabled ? 'success' : 'warning',
      title: enabled ? 'Assistente ativado' : 'Assistente desativado',
      description: enabled
        ? 'Conversas em modo IA voltam a receber respostas simuladas.'
        : 'Nenhuma resposta automática será enviada; as mensagens ficam com a equipe.',
    });
  };

  const save = async () => {
    if (!config.name.trim()) {
      setTab('identidade');
      toast({ tone: 'danger', title: 'Revise os campos', description: 'O nome do assistente é obrigatório.' });
      return;
    }
    const ok = await update.run(config);
    if (ok) toast({ tone: 'success', title: 'Configurações salvas', description: 'As alterações valem para as próximas respostas simuladas.' });
  };

  const restoreDefaults = async () => {
    const defaults = defaultAiSettings();
    const ok = await update.run(defaults);
    setConfirmReset(false);
    if (ok) {
      setConfig(defaults);
      toast({ tone: 'success', title: 'Configuração padrão restaurada', description: 'Valores fictícios de demonstração.' });
    }
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
              <Badge tone={saved.enabled ? 'success' : 'neutral'} dot>
                {saved.enabled ? 'Ativo' : 'Desativado'}
              </Badge>
              <Badge tone="gold" icon={ShieldCheck} size="sm">
                Simulação — sem IA real
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-graphite-500">
              Respostas demonstrativas por regras locais. Nenhum provedor de IA ou WhatsApp está conectado.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end xl:flex-row xl:items-center">
          <Switch
            checked={saved.enabled}
            onChange={(v) => void toggleEnabled(v)}
            disabled={!canEdit || update.loading}
            label="Assistente ativo"
            description="Liga ou desliga as respostas simuladas"
          />
          {canEdit && (
            <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={() => setConfirmReset(true)}>
              Restaurar padrão
            </Button>
          )}
        </div>
      </section>

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-sm bg-info-bg p-3 text-[13px] text-info" role="status">
          <Eye size={16} aria-hidden="true" /> Seu perfil visualiza a configuração, mas somente a administração pode alterá-la.
        </p>
      )}

      {kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Conversas hoje" value={String(kpis.today)} icon={MessagesSquare} tone="ai" />
          <KpiCard
            label="Conversas com a IA (simulação)"
            value={`${Math.round(kpis.aiShare * 100)}%`}
            icon={Zap}
            tone="success"
            progress={kpis.aiShare * 100}
          />
          <KpiCard label="Agendamentos via WhatsApp" value={String(kpis.booked)} icon={CalendarCheck} tone="gold" />
          <KpiCard label="Tempo médio de resposta" value={kpis.hasGaps ? `${kpis.avg}s` : '—'} icon={Clock} tone="warning" />
        </div>
      )}

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
        <TestingTab key={`${config.greeting}-${config.enabled}`} config={config} context={simContext} />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <fieldset disabled={!canEdit} className="min-w-0">
            <legend className="sr-only">Configurações do assistente</legend>
            {tab === 'identidade' && <IdentityTab config={config} onChange={patch} />}
            {tab === 'comportamento' && <BehaviorTab config={config} onChange={patch} />}
            {tab === 'conhecimento' && <KnowledgeTab config={config} onChange={patch} />}
            {tab === 'horarios' && <HoursTab config={config} onChange={patch} />}
            {tab === 'transferencia' && <TransferTab config={config} onChange={patch} />}
          </fieldset>
          <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
            <ChatPreview config={config} />
            <Button variant="secondary" leftIcon={FlaskConical} onClick={() => setTab('testes')} fullWidth>
              Testar o assistente
            </Button>
          </div>
        </div>
      )}

      {dirty && canEdit && (
        <div
          role="region"
          aria-label="Alterações não salvas"
          className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-md border border-gold-200 bg-white p-4 shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-[13px] font-semibold text-graphite-800">Você tem alterações não salvas.</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfig(saved)} disabled={update.loading}>
              Descartar
            </Button>
            <Button leftIcon={Save} onClick={() => void save()} loading={update.loading}>
              Salvar alterações
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => void restoreDefaults()}
        title="Restaurar configuração padrão?"
        description="Nome, mensagens, FAQ, respostas personalizadas, horários e regras voltam aos valores fictícios de demonstração."
        confirmLabel="Restaurar"
        loading={update.loading}
      />
    </div>
  );
}
