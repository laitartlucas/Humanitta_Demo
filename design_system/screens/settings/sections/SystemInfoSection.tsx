import { useState } from 'react';
import { CheckCircle2, CloudOff, Database, FlaskConical, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, useToast } from '@ds/components';
import { DEMO_NOW, resetDemoData, SCHEMA_VERSION, useCan, useClinicSettings, useDb } from '@core';

/** Versão demonstrativa exibida ao cliente (acompanha o package.json da base). */
export const PLATFORM_VERSION = '1.0.0-demo';

type Kind = 'local' | 'simulada' | 'futura';
const KIND: Record<Kind, { label: string; tone: 'success' | 'ai' | 'gold'; icon: LucideIcon; description: string }> = {
  local: { label: 'Funciona localmente', tone: 'success', icon: CheckCircle2, description: 'Executado no navegador com os dados fictícios desta demonstração.' },
  simulada: { label: 'Simulada', tone: 'ai', icon: FlaskConical, description: 'Comportamento ilustrativo; nenhuma conexão externa é feita.' },
  futura: { label: 'Integração futura', tone: 'gold', icon: CloudOff, description: 'Prevista para a versão com servidor; ainda não conectada.' },
};

const LOCAL_FEATURES = ['Agenda, pacientes e atendimentos', 'Financeiro e repasses', 'Relatórios e exportação CSV', 'Perfis e matriz de permissões'];

const fmtNow = () => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(DEMO_NOW.getDate())}/${p(DEMO_NOW.getMonth() + 1)}/${DEMO_NOW.getFullYear()} às ${p(DEMO_NOW.getHours())}:${p(DEMO_NOW.getMinutes())}`;
};

/** Configurações › Informações do sistema — versão, ambiente, base de dados e estado das integrações. */
export function SystemInfoSection() {
  const { toast } = useToast();
  const canEdit = useCan('configuracoes', 'editar');
  const settings = useClinicSettings();
  const counts = useDb((s) => `${s.patients.length}|${s.appointments.length}|${s.financialEntries.length}|${s.users.length}`);
  const [patients, appointments, entries, users] = counts.split('|').map(Number);
  const [confirm, setConfirm] = useState(false);

  const integrationKind = (status: string): Kind => (status === 'conectado' ? 'simulada' : 'futura');

  function reset() {
    resetDemoData();
    setConfirm(false);
    toast({ tone: 'success', title: 'Demonstração restaurada', description: 'Todos os dados voltaram ao estado original.' });
  }

  const info: [string, string][] = [
    ['Plataforma', 'Humanittá Gestão'],
    ['Versão', PLATFORM_VERSION],
    ['Ambiente', 'Demonstração comercial (sem servidor)'],
    ['Autenticação', 'Seletor de perfil de demonstração — não é login real'],
    ['Armazenamento', 'Navegador (localStorage), dados fictícios'],
    ['Versão do esquema de dados', String(SCHEMA_VERSION)],
    ['Data e hora da demonstração', fmtNow()],
    ['Desenvolvimento', 'Laitart Tech'],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card title="Informações gerais">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {info.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="text-[12px] font-semibold uppercase tracking-[.06em] text-graphite-500">{k}</dt>
              <dd className="text-body text-graphite-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card
        title="Dados de demonstração"
        description="Registros fictícios usados por todos os módulos."
        action={
          canEdit ? (
            <Button size="sm" variant="secondary" leftIcon={RotateCcw} onClick={() => setConfirm(true)}>
              Restaurar demonstração
            </Button>
          ) : undefined
        }
      >
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Pacientes', patients],
            ['Agendamentos', appointments],
            ['Lançamentos', entries],
            ['Usuários', users],
          ].map(([label, n]) => (
            <li key={label} className="flex items-center gap-3 rounded-md border border-graphite-200 p-3">
              <Database size={18} aria-hidden="true" className="shrink-0 text-gold-600" />
              <div>
                <p className="font-display text-[22px] font-semibold leading-none text-graphite-900 tabular-nums">{n}</p>
                <p className="text-[12px] text-graphite-500">{label}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Funcionalidades e integrações" description="O que roda nesta demonstração e o que depende da versão com servidor.">
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
          {(Object.keys(KIND) as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-2 text-caption text-graphite-600">
              <Badge tone={KIND[k].tone} icon={KIND[k].icon} size="sm">
                {KIND[k].label}
              </Badge>
              {KIND[k].description}
            </span>
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-graphite-100">
          {LOCAL_FEATURES.map((f) => (
            <li key={f} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-body-sm font-semibold text-graphite-900">{f}</span>
              <Badge tone={KIND.local.tone} size="sm">
                {KIND.local.label}
              </Badge>
            </li>
          ))}
          {settings.integrations.map((it) => {
            const k = integrationKind(it.status);
            return (
              <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-body-sm font-semibold text-graphite-900">{it.name}</span>
                <Badge tone={KIND[k].tone} size="sm">
                  {KIND[k].label}
                </Badge>
              </li>
            );
          })}
          {['Exportação em PDF', 'Envio real de e-mails, SMS e WhatsApp', 'Autenticação e autorização no servidor'].map((f) => (
            <li key={f} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-body-sm font-semibold text-graphite-900">{f}</span>
              <Badge tone={KIND.futura.tone} size="sm">
                {KIND.futura.label}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={reset}
        title="Restaurar os dados de demonstração?"
        description="Agendamentos, pacientes, lançamentos, usuários e configurações voltam ao estado original. As alterações feitas nesta demonstração serão perdidas."
        confirmLabel="Restaurar"
        tone="danger"
      />
    </div>
  );
}
