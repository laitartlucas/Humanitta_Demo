import { HandCoins, Users } from 'lucide-react';
import { Badge, Button, Card, DataTable, EmptyState, PaymentStatusBadge, SPECIALTY_LABEL, Select, type DataTableColumn } from '@ds/components';
import { formatCurrency } from '@ds/mocks/business';
import { DEMO_PAYOUT_RULE, fromCents, sumCents, type Fortnight, type PayoutLine } from '@modules/finance/domain';

export interface PayoutStatementCardProps {
  lines: PayoutLine[];
  periods: Fortnight[];
  periodId: string;
  onPeriodChange: (id: string) => void;
  /** "Hoje" da demonstração: períodos não encerrados não geram repasse. */
  today: string;
  /** Perfil com `repasses ≥ editar`. */
  canGenerate: boolean;
  generatingId?: string | null;
  onGenerate: (line: PayoutLine) => void;
}

/** Apuração quinzenal de repasses por profissional (regra demonstrativa, sem percentuais oficiais). */
export function PayoutStatementCard({ lines, periods, periodId, onPeriodChange, today, canGenerate, generatingId, onGenerate }: PayoutStatementCardProps) {
  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const closed = period.range.to < today;
  const totalCalculated = fromCents(sumCents(lines.map((l) => ({ amount: l.calculated ?? 0 }))));

  const columns: DataTableColumn<PayoutLine>[] = [
    {
      key: 'professional',
      header: 'Profissional',
      render: (l) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-graphite-900">{l.professionalName}</span>
          <span className="truncate text-[12px] text-graphite-500">{SPECIALTY_LABEL[l.specialty]}</span>
        </div>
      ),
    },
    {
      key: 'attendances',
      header: 'Atendimentos',
      align: 'center',
      hideBelow: 'md',
      render: (l) => <span className="tabular-nums text-graphite-700">{l.attendances}</span>,
    },
    {
      key: 'base',
      header: 'Receita considerada',
      align: 'right',
      hideBelow: 'md',
      render: (l) => <span className="tabular-nums text-graphite-700">{l.base === null ? '—' : formatCurrency(l.base)}</span>,
    },
    {
      key: 'rule',
      header: '% repasse',
      align: 'center',
      hideBelow: 'lg',
      render: (l) => <span className="tabular-nums text-graphite-700">{l.percent}%</span>,
    },
    {
      key: 'calculated',
      header: 'Repasse calculado',
      align: 'right',
      render: (l) => <span className="font-semibold tabular-nums text-graphite-900">{l.calculated === null ? '—' : formatCurrency(l.calculated)}</span>,
    },
    {
      key: 'existing',
      header: 'Lançado',
      align: 'right',
      render: (l) =>
        l.existing ? (
          <div className="flex flex-col items-end gap-1">
            <span className="tabular-nums text-graphite-900">{formatCurrency(l.existing.amount)}</span>
            <PaymentStatusBadge status={l.existing.effective} size="sm" />
          </div>
        ) : (
          <span className="text-graphite-500">Não lançado</span>
        ),
    },
    {
      key: 'action',
      header: 'Ação',
      align: 'right',
      srOnlyHeader: true,
      render: (l) => {
        if (!canGenerate || l.existing) return null;
        const disabled = !closed || !l.calculated || l.calculated <= 0;
        return (
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            loading={generatingId === l.professionalId}
            onClick={() => onGenerate(l)}
            title={!closed ? 'Período em andamento' : !l.calculated ? 'Sem receita recebida no período' : undefined}
          >
            Gerar repasse
          </Button>
        );
      },
    },
  ];

  return (
    <Card
      title="Apuração de repasses"
      description={`${period.label} · ${DEMO_PAYOUT_RULE.label}`}
      padding="none"
      action={
        <Select
          aria-label="Quinzena de apuração"
          controlSize="sm"
          wrapperClassName="w-52"
          options={periods.map((p) => ({ value: p.id, label: p.label }))}
          value={period.id}
          onChange={(e) => onPeriodChange(e.target.value)}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-graphite-100 px-4 py-3 text-[13px] sm:px-5">
        <Badge tone="gold" size="sm">
          Demonstração
        </Badge>
        <span className="text-graphite-600">
          {closed ? 'Período encerrado — repasses podem ser gerados.' : 'Período em andamento — a geração fica disponível após o fechamento.'}
        </span>
        <span className="ml-auto text-graphite-700">
          Total calculado: <strong className="tabular-nums text-graphite-900">{formatCurrency(totalCalculated)}</strong>
        </span>
      </div>
      <DataTable<PayoutLine>
        caption={`Apuração de repasses — ${period.label}`}
        columns={columns}
        rows={lines}
        rowKey={(l) => l.professionalId}
        empty={<EmptyState compact icon={Users} title="Nenhum profissional no escopo" description="Não há repasses visíveis para o seu perfil." />}
      />
      <p className="flex items-center gap-2 border-t border-graphite-100 px-4 py-3 text-[12px] text-graphite-500 sm:px-5">
        <HandCoins size={14} aria-hidden="true" />
        Um repasse por profissional e quinzena. A regra real de repasse da clínica ainda não foi definida.
      </p>
    </Card>
  );
}
