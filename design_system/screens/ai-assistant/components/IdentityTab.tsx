import { Card, Input, SegmentedControl, Switch, Textarea } from '@ds/components';
import type { AiTone } from '@ds/mocks/business';
import type { AiSettings } from '@modules/ai-assistant/settings';

export interface AiTabProps {
  config: AiSettings;
  onChange: (patch: Partial<AiSettings>) => void;
}

const TONE_OPTIONS: { value: AiTone; label: string }[] = [
  { value: 'acolhedor', label: 'Acolhedor' },
  { value: 'formal', label: 'Formal' },
  { value: 'objetivo', label: 'Objetivo' },
];

const TONE_HELP: Record<AiTone, string> = {
  acolhedor: 'Caloroso e próximo, como a recepção da Humanittá. Recomendado.',
  formal: 'Tratamento por "senhor(a)", frases completas e mais distanciamento.',
  objetivo: 'Respostas curtas e diretas, focadas na ação.',
};

function isTone(v: string): v is AiTone {
  return v === 'acolhedor' || v === 'formal' || v === 'objetivo';
}

export function IdentityTab({ config, onChange }: AiTabProps) {
  return (
    <div className="flex flex-col gap-6">
    <Card title="Identidade do assistente" description="Como o assistente se apresenta aos pacientes no WhatsApp.">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nome do assistente"
            value={config.name}
            onChange={(e) => onChange({ name: e.target.value })}
            error={config.name.trim() ? undefined : 'O nome é obrigatório.'}
            maxLength={40}
          />
          <Input
            label="Assinatura"
            value={config.signature}
            onChange={(e) => onChange({ signature: e.target.value })}
            hint="Exibida ao final de mensagens automáticas."
          />
        </div>
        <Textarea
          label="Mensagem inicial"
          rows={4}
          value={config.greeting}
          onChange={(e) => onChange({ greeting: e.target.value })}
          hint={`${config.greeting.length}/400 caracteres — enviada no primeiro contato do paciente.`}
          maxLength={400}
        />
        <div className="flex flex-col gap-2">
          <span id="ai-tone-label" className="text-[13px] font-semibold text-graphite-800">
            Tom de voz
          </span>
          <SegmentedControl
            ariaLabel="Tom de voz"
            options={TONE_OPTIONS}
            value={config.tone}
            onChange={(v) => {
              if (isTone(v)) onChange({ tone: v });
            }}
          />
          <p className="text-[12px] text-graphite-500">{TONE_HELP[config.tone]}</p>
        </div>
        <Switch
          checked={config.useEmojis}
          onChange={(v) => onChange({ useEmojis: v })}
          label="Permitir emojis nas respostas"
          description="Desativado por padrão para manter o tom elegante da marca."
        />
      </div>
    </Card>
    <Card title="Atendimento humanizado" description="Como a clínica quer que o assistente se comporte com os pacientes.">
      <div className="flex flex-col gap-4">
        <Textarea
          label="Descrição"
          rows={2}
          value={config.description}
          onChange={(e) => onChange({ description: e.target.value })}
          hint="Usada quando o paciente pede informações gerais."
          maxLength={240}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Textarea label="Personalidade" rows={3} value={config.personality} onChange={(e) => onChange({ personality: e.target.value })} maxLength={240} />
          <Textarea label="Objetivo" rows={3} value={config.objective} onChange={(e) => onChange({ objective: e.target.value })} maxLength={240} />
        </div>
      </div>
    </Card>
    </div>
  );
}
