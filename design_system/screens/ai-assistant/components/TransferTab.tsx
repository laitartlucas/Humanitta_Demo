import { Card, Select, Switch, Textarea } from '@ds/components';
import { TRANSFER_TARGETS } from '@ds/mocks/business';
import type { AiTabProps } from './IdentityTab';

export function TransferTab({ config, onChange }: AiTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card title="Quando transferir para a equipe" description="O assistente pausa e notifica a pessoa responsável.">
        <ul className="flex flex-col divide-y divide-graphite-100">
          {config.transferRules.map((r) => (
            <li key={r.id} className="py-3 first:pt-0 last:pb-0">
              <Switch
                checked={r.enabled}
                label={r.label}
                description={r.description}
                onChange={(v) => onChange({ transferRules: config.transferRules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) })}
              />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Destino e mensagem">
        <div className="flex flex-col gap-4">
          <Select
            label="Transferir para"
            options={TRANSFER_TARGETS.map((t) => ({ value: t.id, label: `${t.label} — ${t.description}` }))}
            value={config.transferTarget}
            onChange={(e) => onChange({ transferTarget: e.target.value })}
          />
          <Textarea
            label="Mensagem de transferência"
            rows={3}
            value={config.transferMessage}
            onChange={(e) => onChange({ transferMessage: e.target.value })}
            hint="Enviada ao paciente no momento da transferência."
          />
        </div>
      </Card>
    </div>
  );
}
