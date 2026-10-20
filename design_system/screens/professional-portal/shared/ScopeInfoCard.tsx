import { Check, ShieldCheck, X } from 'lucide-react';
import { Card } from '@ds/components';

export interface ScopeInfoCardProps {
  className?: string;
}

const SHOWN = ['Nome, idade e telefone parcialmente oculto', 'Suas consultas com o paciente (próxima e última)', 'Tratamento em curso e alertas de atendimento', 'Observações administrativas relevantes'];
const HIDDEN = ['Saldo, pagamentos e valores', 'CPF, e-mail e endereço completo', 'Registros de outros profissionais'];

/** Card "Por que vejo apenas estes dados?" — explica a regra de escopo/LGPD do portal. */
export function ScopeInfoCard({ className }: ScopeInfoCardProps) {
  return (
    <Card
      as="section"
      aria-labelledby="scope-info-title"
      className={className}
      title={
        <span id="scope-info-title" className="inline-flex items-center gap-2">
          <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" className="text-ai" />
          Por que vejo apenas estes dados?
        </span>
      }
      description="Pela LGPD, cada profissional acessa somente o necessário para o próprio atendimento."
    >
      <div className="flex flex-col gap-4 text-body-sm">
        <div>
          <p className="mb-2 font-bold text-graphite-900">Você vê</p>
          <ul className="flex flex-col gap-1.5">
            {SHOWN.map((t) => (
              <li key={t} className="flex items-start gap-2 text-graphite-700">
                <Check size={14} strokeWidth={2.25} aria-hidden="true" className="mt-1 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 font-bold text-graphite-900">Fica com a recepção / financeiro</p>
          <ul className="flex flex-col gap-1.5">
            {HIDDEN.map((t) => (
              <li key={t} className="flex items-start gap-2 text-graphite-700">
                <X size={14} strokeWidth={2.25} aria-hidden="true" className="mt-1 shrink-0 text-danger" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-sm bg-graphite-50 px-3 py-2 text-caption text-graphite-600">
          Este filtro é aplicado no servidor, não apenas na tela. Todo acesso fica registrado para auditoria.
        </p>
      </div>
    </Card>
  );
}
