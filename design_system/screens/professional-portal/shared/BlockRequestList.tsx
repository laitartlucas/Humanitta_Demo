import type { ReactNode } from 'react';
import { CalendarOff, CheckCircle2, Clock3, Hourglass, Inbox, XCircle } from 'lucide-react';
import { Badge, EmptyState } from '@ds/components';
import type { BadgeTone } from '@ds/components';
import { WEEKDAY_NAMES, formatDate } from '@ds/mocks/clinical';
import type { BlockRequest, BlockRequestStatus } from '@ds/mocks/portal';
import { REQUEST_STATUS_LABEL, weekdayDate } from './portalUtils';

const TONE: Record<BlockRequestStatus, BadgeTone> = { enviada: 'warning', aprovada: 'success', recusada: 'danger' };
const ICON = { enviada: Hourglass, aprovada: CheckCircle2, recusada: XCircle } as const;

export interface BlockRequestStatusBadgeProps {
  status: BlockRequestStatus;
  size?: 'sm' | 'md';
}

/** Status de solicitação: ícone + texto (nunca só cor). */
export function BlockRequestStatusBadge({ status, size = 'md' }: BlockRequestStatusBadgeProps) {
  return (
    <Badge tone={TONE[status]} icon={ICON[status]} size={size}>
      {REQUEST_STATUS_LABEL[status]}
    </Badge>
  );
}

export interface BlockRequestListProps {
  requests: BlockRequest[];
  /** Mostra no máximo N itens (padrão: todos). */
  limit?: number;
  className?: string;
  /** Ações por solicitação (ex.: "Retirar" no portal, "Aprovar/Recusar" na administração). */
  renderActions?: (r: BlockRequest) => ReactNode;
  /** Texto do estado vazio (padrão: visão do profissional). */
  emptyDescription?: string;
}

function periodLabel(r: BlockRequest): string {
  if (r.kind === 'disponibilidade') {
    const day = r.weekday !== undefined ? WEEKDAY_NAMES[r.weekday] : 'Dia';
    return `${day}s · ${r.start}–${r.end} · a partir de ${weekdayDate(r.date)}`;
  }
  return r.allDay ? `${weekdayDate(r.date)} · dia inteiro` : `${weekdayDate(r.date)} · ${r.start}–${r.end}`;
}

/** Lista "Minhas solicitações" (bloqueios e alterações de disponibilidade). */
export function BlockRequestList({
  requests,
  limit,
  className,
  renderActions,
  emptyDescription = 'Quando você pedir um bloqueio ou alteração de horário, o andamento aparece aqui.',
}: BlockRequestListProps) {
  const items = limit ? requests.slice(0, limit) : requests;
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={Inbox}
        title="Nenhuma solicitação"
        description={emptyDescription}
        className={className}
      />
    );
  }
  return (
    <ul className={className ? `flex flex-col gap-3 ${className}` : 'flex flex-col gap-3'}>
      {items.map((r) => {
        const KindIcon = r.kind === 'bloqueio' ? CalendarOff : Clock3;
        return (
          <li key={r.id} className="flex flex-col gap-2 rounded-md border border-graphite-200 p-4">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-graphite-50 text-graphite-600">
                <KindIcon size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-[160px] flex-1">
                <p className="text-body font-bold text-graphite-900">
                  {r.kind === 'bloqueio' ? 'Bloqueio de horário' : 'Alteração de disponibilidade'}
                </p>
                <p className="text-body-sm tabular-nums text-graphite-600">{periodLabel(r)}</p>
              </div>
              <BlockRequestStatusBadge status={r.status} />
            </div>
            <p className="text-body-sm text-graphite-700">
              <span className="font-semibold">Motivo:</span> {r.reason}
              {r.note ? ` — ${r.note}` : ''}
            </p>
            {r.status === 'recusada' && r.refusalReason && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-body-sm text-danger">
                <span className="font-bold">Motivo da recusa:</span> {r.refusalReason}
              </p>
            )}
            <p className="text-caption text-graphite-500">
              Enviada em {formatDate(r.createdAt, { day: '2-digit', month: '2-digit' })}
              {r.decidedBy && r.decidedAt ? ` · ${r.status === 'aprovada' ? 'aprovada' : 'analisada'} por ${r.decidedBy} em ${formatDate(r.decidedAt, { day: '2-digit', month: '2-digit' })}` : ' · em análise pela administração'}
            </p>
            {renderActions?.(r)}
          </li>
        );
      })}
    </ul>
  );
}
