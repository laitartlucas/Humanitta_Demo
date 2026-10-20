import { useState } from 'react';
import { Ban, Eye, Minus, Pencil, Send, ServerCog, ShieldAlert, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACCESS_LABEL, FEATURES, PERMISSIONS, ROLES, ROLE_DESCRIPTION, ROLE_LABEL } from '@ds/access';
import type { AccessLevel, Feature, FeatureMeta, Role } from '@ds/access';
import { Badge, Card, Select } from '@ds/components';
import type { BadgeTone } from '@ds/components';

const LEVEL_META: Record<AccessLevel, { tone: BadgeTone; icon: LucideIcon; short: string }> = {
  nenhum: { tone: 'neutral', icon: Ban, short: 'Sem acesso' },
  proprio: { tone: 'ai', icon: UserCheck, short: 'Somente os próprios' },
  ver: { tone: 'info', icon: Eye, short: 'Visualizar' },
  editar: { tone: 'gold', icon: Pencil, short: 'Editar' },
  solicitar: { tone: 'warning', icon: Send, short: 'Solicitar' },
};

const LEVEL_ORDER: AccessLevel[] = ['nenhum', 'proprio', 'ver', 'editar', 'solicitar'];

/** Observações da matriz oficial (PORTAL_SPEC). */
const NOTES: Partial<Record<`${Role}:${Feature}`, string>> = {
  'profissional:dashboard_clinica': 'usa Meu Dashboard',
  'admin:bloqueio_horario': 'aprova',
  'recepcao:atendimentos': 'check-in',
  'profissional:pacientes_cadastro': 'dados mínimos',
  'profissional:bloqueio_horario': 'requer aprovação',
};

/** Recurso exclusivo do Portal do Profissional: nos demais perfis "não se aplica". */
function notApplicable(role: Role, feature: Feature): boolean {
  return feature === 'agenda_propria' && role !== 'profissional';
}

const GROUPS: FeatureMeta['group'][] = ['Operação', 'Clínico', 'Gestão', 'Sistema'];

function LevelChip({ role, feature }: { role: Role; feature: Feature }) {
  if (notApplicable(role, feature)) {
    return (
      <span className="inline-flex items-center gap-1 text-caption text-graphite-400">
        <Minus size={14} strokeWidth={2} aria-hidden="true" />
        <span className="sr-only">Não se aplica</span>
      </span>
    );
  }
  const level = PERMISSIONS[role][feature];
  const meta = LEVEL_META[level];
  const note = NOTES[`${role}:${feature}`];
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge tone={meta.tone} icon={meta.icon} size="sm">
        {meta.short}
      </Badge>
      {note && <span className="pl-1 text-[11px] font-semibold text-graphite-500">({note})</span>}
    </span>
  );
}

/**
 * Configurações › Permissões — matriz FEATURES × ROLES lida de '@ds/access' (fonte única).
 * Somente leitura nesta demonstração; a edição real é persistida e validada no servidor.
 */
export function PermissionsSection() {
  const [mobileRole, setMobileRole] = useState<Role>('profissional');

  return (
    <Card
      title="Permissões por perfil"
      description="O que cada perfil pode fazer em cada recurso. Padrão de fábrica da Humanittá Gestão."
      padding="none"
    >
      <div className="flex flex-col gap-4 px-4 md:px-6">
        <p role="note" className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-bg px-4 py-3 text-body-sm text-warning">
          <ShieldAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            <strong>Ocultar menus não é segurança — o acesso efetivo é validado no servidor.</strong>{' '}
            <span className="text-graphite-800">
              Cada rota e cada ação é autorizada pela API e por políticas no banco (ex.: RLS por professional_id). Uma URL digitada
              manualmente sem permissão leva a “Acesso não autorizado”.
            </span>
          </span>
        </p>

        <div aria-label="Legenda dos níveis de acesso" role="group" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {LEVEL_ORDER.map((l) => {
            const meta = LEVEL_META[l];
            return (
              <span key={l} className="inline-flex items-center gap-2">
                <Badge tone={meta.tone} icon={meta.icon} size="sm">
                  {meta.short}
                </Badge>
                {l === 'solicitar' && <span className="text-caption text-graphite-500">{ACCESS_LABEL[l]}</span>}
                {l === 'proprio' && <span className="text-caption text-graphite-500">vínculo do profissional</span>}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1.5 text-caption text-graphite-500">
            <Minus size={14} strokeWidth={2} aria-hidden="true" />
            Não se aplica
          </span>
        </div>
      </div>

      {/* Desktop / tablet: tabela completa */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-body-sm">
          <caption className="sr-only">Matriz de permissões: recursos nas linhas e perfis nas colunas</caption>
          <thead>
            <tr className="bg-graphite-50">
              <th scope="col" className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[.06em] text-graphite-500">
                Recurso
              </th>
              {ROLES.map((r) => (
                <th key={r} scope="col" className="px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[.06em] text-graphite-500">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g}>
              <tr className="border-t border-graphite-200">
                <th colSpan={ROLES.length + 1} scope="colgroup" className="bg-white px-6 pb-1 pt-4 text-left text-overline uppercase text-gold-600">
                  {g}
                </th>
              </tr>
              {FEATURES.filter((f) => f.group === g).map((f) => (
                <tr key={f.id} className="border-t border-graphite-100 hover:bg-graphite-50">
                  <th scope="row" className="px-6 py-3 text-left font-semibold text-graphite-900">
                    {f.label}
                  </th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2.5 align-top">
                      <LevelChip role={r} feature={f.id} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Celular: um perfil por vez */}
      <div className="flex flex-col gap-4 px-4 md:hidden">
        <Select
          label="Ver permissões do perfil"
          value={mobileRole}
          onChange={(e) => setMobileRole(e.target.value as Role)}
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          hint={ROLE_DESCRIPTION[mobileRole]}
        />
        {GROUPS.map((g) => (
          <section key={g} aria-label={g} className="flex flex-col">
            <h4 className="pb-1 text-overline uppercase text-gold-600">{g}</h4>
            <ul className="flex flex-col divide-y divide-graphite-100 rounded-md border border-graphite-200">
              {FEATURES.filter((f) => f.group === g).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0 text-body-sm font-semibold text-graphite-900">{f.label}</span>
                  <LevelChip role={mobileRole} feature={f.id} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mx-4 mb-5 flex items-start gap-2 text-caption text-graphite-500 md:mx-6">
        <ServerCog size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
        Fonte única: design_system/access/permissions.ts. Ajustes por clínica são gravados no servidor e auditados.
      </p>
    </Card>
  );
}
