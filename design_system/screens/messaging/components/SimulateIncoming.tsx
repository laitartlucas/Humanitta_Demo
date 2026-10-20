import { useState } from 'react';
import type { FormEvent } from 'react';
import { FlaskConical, SendHorizontal, X } from 'lucide-react';
import { Badge, Button, IconButton } from '@ds/components';

export interface SimulateIncomingProps {
  contactName: string;
  onReceive: (text: string) => void;
  disabled?: boolean;
}

const SAMPLES: string[] = [
  'Oi, bom dia!',
  'Qual o endereço de vocês?',
  'Quero marcar uma consulta de fisioterapia',
  'Quando é minha consulta?',
  'Preciso falar com uma atendente',
  'Vocês têm estacionamento?',
];

/**
 * Ferramenta da DEMONSTRAÇÃO: cria uma mensagem "recebida" do contato, como se tivesse chegado
 * pelo WhatsApp. Não existe webhook nesta etapa — nada é recebido de fora do navegador.
 */
export function SimulateIncoming({ contactName, onReceive, disabled = false }: SimulateIncomingProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onReceive(t);
    setText('');
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 bg-ivory px-3 pb-2">
        <Badge tone="neutral" size="sm">
          Ambiente de demonstração — mensagens simuladas
        </Badge>
        <Button variant="ghost" size="sm" leftIcon={FlaskConical} onClick={() => setOpen(true)} disabled={disabled}>
          Simular mensagem recebida
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-md border border-dashed border-gold-300 bg-white p-3 sm:mx-6" role="region" aria-label="Simular mensagem recebida">
      <div className="mb-2 flex items-center gap-2">
        <FlaskConical size={16} className="text-gold-600" aria-hidden="true" />
        <span className="flex-1 text-[12px] font-semibold text-graphite-700">
          Simular mensagem de {contactName} <span className="font-normal text-graphite-500">(não vem do WhatsApp real)</span>
        </span>
        <IconButton icon={X} label="Fechar simulador" size="sm" variant="ghost" onClick={() => setOpen(false)} />
      </div>
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Exemplos de mensagens recebidas">
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onReceive(s)}
            className="shrink-0 whitespace-nowrap rounded-full border border-graphite-200 bg-graphite-50 px-2.5 py-1 text-[12px] font-semibold text-graphite-700 hover:border-gold-300 hover:bg-gold-50 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="simulate-incoming" className="sr-only">
          Mensagem simulada do contato
        </label>
        <input
          id="simulate-incoming"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva como o contato…"
          className="h-9 flex-1 rounded-sm border border-graphite-200 px-3 text-[13px] text-graphite-900 placeholder:text-graphite-400 focus:border-gold-500 focus:outline-none focus:shadow-focus"
        />
        <IconButton type="submit" icon={SendHorizontal} label="Receber mensagem simulada" variant="secondary" size="sm" disabled={!text.trim() || disabled} />
      </form>
    </div>
  );
}
