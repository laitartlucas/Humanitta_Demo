import { CalendarDays, CreditCard, FileText, FlaskConical, Instagram, Mail, MessageCircle, Plug } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card } from '@ds/components';
import type { IntegrationSetting } from '@ds/mocks/business';
import { settingsService, useAction, useCan, useClinicSettings } from '@core';

const ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  google: CalendarDays,
  nfse: FileText,
  pagamentos: CreditCard,
  email: Mail,
  instagram: Instagram,
};

/** Na demonstração nenhuma integração é real: "conectado" significa "simulado ativo". */
const STATUS: Record<IntegrationSetting['status'], { label: string; tone: 'ai' | 'neutral' | 'gold' }> = {
  conectado: { label: 'Simulação ativa', tone: 'ai' },
  desconectado: { label: 'Não conectado', tone: 'neutral' },
  em_breve: { label: 'Integração futura', tone: 'gold' },
};

/** Configurações › Integrações — estado simulado em `clinicSettings.integrations`. */
export function IntegrationsSection() {
  const settings = useClinicSettings();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateClinicSettings, { success: 'Integração simulada atualizada' });
  const items = settings.integrations;

  const toggle = (it: IntegrationSetting) => {
    const next: IntegrationSetting['status'] = it.status === 'conectado' ? 'desconectado' : 'conectado';
    void update.run({ integrations: items.map((x) => (x.id === it.id ? { ...x, status: next } : x)) });
  };

  return (
    <Card title="Integrações" description="Serviços externos. Nesta demonstração nenhuma conexão real é feita.">
      <p role="note" className="mb-4 flex items-start gap-3 rounded-md border border-ai/20 bg-ai-bg px-4 py-3 text-body-sm text-ai">
        <FlaskConical size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          <strong>Ambiente de demonstração.</strong>{' '}
          <span className="text-graphite-800">
            “Simulação ativa” apenas habilita o comportamento simulado dentro do sistema. Nenhuma mensagem, e-mail, nota fiscal ou cobrança é enviada.
          </span>
        </span>
      </p>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((it) => {
          const Icon = ICONS[it.id] ?? Plug;
          const s = STATUS[it.status];
          return (
            <li key={it.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-graphite-50 text-graphite-700">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-graphite-900">{it.name}</h3>
                    <Badge tone={s.tone} dot size="sm">
                      {s.label}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-graphite-500">{it.description}</p>
                </div>
              </div>
              <div className="flex justify-end">
                {it.status === 'em_breve' ? (
                  <Button size="sm" variant="ghost" disabled>
                    Disponível em breve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={it.status === 'conectado' ? 'secondary' : 'primary'}
                    disabled={!canEdit || update.loading}
                    onClick={() => toggle(it)}
                  >
                    {it.status === 'conectado' ? 'Desativar simulação' : 'Ativar simulação'}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
