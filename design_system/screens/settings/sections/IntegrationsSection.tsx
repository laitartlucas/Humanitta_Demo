import { useState } from 'react';
import { CalendarDays, FileText, Instagram, Mail, MessageCircle, Plug, CreditCard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, useToast } from '@ds/components';
import { integrations as initialIntegrations } from '@ds/mocks/business';
import type { IntegrationSetting } from '@ds/mocks/business';

const ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  google: CalendarDays,
  nfse: FileText,
  pagamentos: CreditCard,
  email: Mail,
  instagram: Instagram,
};

const STATUS: Record<IntegrationSetting['status'], { label: string; tone: 'success' | 'neutral' | 'gold' }> = {
  conectado: { label: 'Conectado', tone: 'success' },
  desconectado: { label: 'Desconectado', tone: 'neutral' },
  em_breve: { label: 'Em breve', tone: 'gold' },
};

export function IntegrationsSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<IntegrationSetting[]>(initialIntegrations);

  const toggle = (it: IntegrationSetting) => {
    const next = it.status === 'conectado' ? 'desconectado' : 'conectado';
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, status: next } : x)));
    toast({
      tone: next === 'conectado' ? 'success' : 'info',
      title: next === 'conectado' ? `${it.name} conectado` : `${it.name} desconectado`,
      description: 'Integração simulada — nenhuma conexão real foi feita.',
    });
  };

  return (
    <Card title="Integrações" description="Conecte serviços externos. Na demonstração, todas as conexões são simuladas.">
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
                  <Button size="sm" variant={it.status === 'conectado' ? 'secondary' : 'primary'} onClick={() => toggle(it)}>
                    {it.status === 'conectado' ? 'Desconectar' : 'Conectar'}
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
