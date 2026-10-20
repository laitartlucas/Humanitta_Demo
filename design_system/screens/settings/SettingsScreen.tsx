import { useState, type ComponentType, type MouseEvent } from 'react';
import {
  Bell,
  Building2,
  CalendarClock,
  DoorOpen,
  KeyRound,
  ListChecks,
  Palette,
  PlugZap,
  RotateCcw,
  Save,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button, PageHeader, Select, useToast } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import {
  ClinicDataSection,
  HoursSection,
  IntegrationsSection,
  NotificationsSection,
  PermissionsSection,
  RoomsSection,
  ServicesSection,
  SpecialtiesSection,
  UsersSection,
  VisualIdentitySection,
} from './sections';

export type SettingsSectionId =
  | 'clinica'
  | 'especialidades'
  | 'servicos'
  | 'salas'
  | 'horarios'
  | 'usuarios'
  | 'permissoes'
  | 'notificacoes'
  | 'identidade'
  | 'integracoes';

export interface SettingsScreenProps {
  /** Seção aberta inicialmente (padrão "clinica"). */
  initialSection?: SettingsSectionId;
}

interface SectionDef {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  component: ComponentType;
}

interface SectionGroup {
  label: string;
  items: SectionDef[];
}

const GROUPS: SectionGroup[] = [
  {
    label: 'Clínica',
    items: [
      { id: 'clinica', label: 'Dados da clínica', description: 'Identificação, contato, endereço e responsável técnica.', icon: Building2, component: ClinicDataSection },
      { id: 'especialidades', label: 'Especialidades', description: 'Áreas de atendimento e cores usadas na agenda.', icon: Stethoscope, component: SpecialtiesSection },
      { id: 'servicos', label: 'Serviços', description: 'Procedimentos, duração e valores de referência (fictícios).', icon: ListChecks, component: ServicesSection },
      { id: 'salas', label: 'Salas', description: 'Salas de atendimento conforme a placa da recepção.', icon: DoorOpen, component: RoomsSection },
      { id: 'horarios', label: 'Horários', description: 'Funcionamento da clínica e intervalos.', icon: CalendarClock, component: HoursSection },
    ],
  },
  {
    label: 'Equipe e acesso',
    items: [
      { id: 'usuarios', label: 'Usuários', description: 'Quem acessa o sistema e com qual perfil.', icon: Users, component: UsersSection },
      { id: 'permissoes', label: 'Permissões', description: 'O que cada perfil pode ver e editar.', icon: KeyRound, component: PermissionsSection },
      { id: 'notificacoes', label: 'Notificações', description: 'Lembretes, confirmações e alertas automáticos.', icon: Bell, component: NotificationsSection },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'identidade', label: 'Identidade visual', description: 'Logo, cores e textos institucionais.', icon: Palette, component: VisualIdentitySection },
      { id: 'integracoes', label: 'Integrações', description: 'WhatsApp, pagamentos e outros serviços conectados.', icon: PlugZap, component: IntegrationsSection },
    ],
  },
];

const ALL_SECTIONS: SectionDef[] = GROUPS.flatMap((g) => g.items);

function findSection(id: SettingsSectionId): SectionDef {
  return ALL_SECTIONS.find((s) => s.id === id) ?? ALL_SECTIONS[0];
}

export function SettingsScreen({ initialSection = 'clinica' }: SettingsScreenProps) {
  const { toast } = useToast();
  const [active, setActive] = useState<SettingsSectionId>(initialSection);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Incrementado ao descartar: remonta a seção e restaura os dados de demonstração. */
  const [resetKey, setResetKey] = useState(0);

  const section = findSection(active);

  function go(id: SettingsSectionId) {
    setActive(id);
    document.getElementById('settings-content')?.focus({ preventScroll: true });
  }

  function markDirtyOnToggle(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('[role="switch"], input[type="checkbox"], input[type="radio"]')) setDirty(true);
  }

  function save() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setDirty(false);
      toast({ tone: 'success', title: 'Alterações salvas', description: 'Configurações atualizadas nesta demonstração. Nenhum dado real foi alterado.' });
    }, 600);
  }

  function discard() {
    setResetKey((k) => k + 1);
    setDirty(false);
    toast({ tone: 'info', title: 'Alterações descartadas', description: 'Os valores de demonstração foram restaurados.' });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações da clínica"
        subtitle="Dados cadastrais, serviços, equipe, acessos e integrações da Humanittá Saúde Integral."
        breadcrumb={['Sistema', 'Configurações']}
        actions={
          <Badge tone="gold" dot>
            Alterações não afetam dados reais
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Navegação secundária — select em telas menores */}
        <div className="lg:hidden">
          <Select
            label="Seção"
            value={active}
            onChange={(e) => go(e.target.value as SettingsSectionId)}
            options={ALL_SECTIONS.map((s) => ({ value: s.id, label: s.label }))}
          />
        </div>

        {/* Navegação secundária — lista vertical em lg+ */}
        <nav aria-label="Seções de configuração" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-5 rounded-md border border-graphite-200 bg-white p-3 shadow-sm">
            {GROUPS.map((g) => (
              <div key={g.label} className="flex flex-col gap-1">
                <p className="px-3 pb-1 text-overline uppercase tracking-[0.08em] text-graphite-500">{g.label}</p>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((s) => {
                    const Icon = s.icon;
                    const isActive = s.id === active;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => go(s.id)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'flex h-10 w-full items-center gap-2.5 rounded-sm px-3 text-left text-body font-semibold transition-colors',
                            'focus-visible:outline-none focus-visible:shadow-focus',
                            isActive ? 'bg-gold-50 text-graphite-900' : 'text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900',
                          )}
                        >
                          <Icon size={18} strokeWidth={1.75} aria-hidden="true" className={isActive ? 'text-gold-600' : 'text-graphite-500'} />
                          <span className="min-w-0 flex-1 truncate">{s.label}</span>
                          {isActive && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          <section
            id="settings-content"
            tabIndex={-1}
            aria-labelledby="settings-section-title"
            className="flex min-w-0 flex-col gap-4 outline-none"
          >
            <div>
              <h3 id="settings-section-title" className="font-display text-display-md font-semibold text-graphite-900">
                {section.label}
              </h3>
              <p className="text-body text-graphite-600">{section.description}</p>
            </div>
            {/* Todas as seções ficam montadas: alterações persistem ao trocar de seção até salvar/descartar. */}
            <div key={resetKey} onChangeCapture={() => setDirty(true)} onClickCapture={markDirtyOnToggle}>
              {ALL_SECTIONS.map((s) => {
                const SectionComponent = s.component;
                return (
                  <div key={s.id} hidden={s.id !== active}>
                    <SectionComponent />
                  </div>
                );
              })}
            </div>
          </section>

          <div
            className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-md sm:flex-row sm:items-center md:bottom-4"
            role="region"
            aria-label="Salvar configurações"
          >
            <p className="flex-1 text-body-sm text-graphite-600" aria-live="polite">
              {dirty ? (
                <span className="font-semibold text-warning">Há alterações não salvas nas configurações.</span>
              ) : (
                'Nenhuma alteração pendente. Ambiente de demonstração.'
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <Button variant="secondary" leftIcon={RotateCcw} onClick={discard} disabled={!dirty || saving}>
                Descartar
              </Button>
              <Button leftIcon={Save} onClick={save} loading={saving} disabled={!dirty}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
