import { useState } from 'react';
import { CalendarOff, Check, X } from 'lucide-react';
import { ROLE_LABEL } from '@ds/access';
import { Badge, Button, Card, EmptyState, FilterChip, Modal, Textarea } from '@ds/components';
import { formatDateBR } from '@ds/mocks/business';
import { blockRequestService, useAccessContext, useAction, useBlockRequests, useClinicSettings, useProfessionals, type BlockRequestRecord } from '@core';
import { ReadOnlyNote } from './shared';

type StatusFilter = 'enviada' | 'aprovada' | 'recusada' | 'todas';

const STATUS: Record<BlockRequestRecord['status'], { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  enviada: { label: 'Aguardando decisão', tone: 'warning' },
  aprovada: { label: 'Aprovada', tone: 'success' },
  recusada: { label: 'Recusada', tone: 'danger' },
};

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'enviada', label: 'Pendentes' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'recusada', label: 'Recusadas' },
  { id: 'todas', label: 'Todas' },
];

function when(r: BlockRequestRecord): string {
  const day = r.weekday !== undefined && r.kind === 'disponibilidade' ? `A partir de ${formatDateBR(r.date)}` : formatDateBR(r.date);
  return r.allDay ? `${day} · dia inteiro` : `${day} · ${r.start}–${r.end}`;
}

/**
 * Configurações › Solicitações de bloqueio — aprovação pelo perfil definido em
 * `clinicSettings.blockApproverRole` via `blockRequestService.decideBlockRequest`.
 */
export function BlockRequestsSection() {
  const ctx = useAccessContext();
  const settings = useClinicSettings();
  const requests = useBlockRequests();
  const professionals = useProfessionals();
  const approve = useAction(blockRequestService.decideBlockRequest, { success: 'Solicitação aprovada' });
  const refuse = useAction(blockRequestService.decideBlockRequest, { success: 'Solicitação recusada' });
  const [filter, setFilter] = useState<StatusFilter>('enviada');
  const [refusing, setRefusing] = useState<BlockRequestRecord | null>(null);
  const [reason, setReason] = useState('');

  const canDecide = ctx.role === settings.blockApproverRole;
  const list = filter === 'todas' ? requests : requests.filter((r) => r.status === filter);
  const count = (s: StatusFilter) => (s === 'todas' ? requests.length : requests.filter((r) => r.status === s).length);
  const profName = (id: string) => professionals.find((p) => p.id === id)?.name ?? 'Profissional';

  async function submitRefusal() {
    if (!refusing) return;
    const ok = await refuse.run(refusing.id, 'recusada', reason);
    if (ok) {
      setRefusing(null);
      setReason('');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!canDecide && <ReadOnlyNote>Somente o perfil {ROLE_LABEL[settings.blockApproverRole]} aprova ou recusa solicitações.</ReadOnlyNote>}
      <Card title="Solicitações de bloqueio" description="Pedidos dos profissionais para bloquear horários ou alterar a disponibilidade. Só as aprovadas afetam a agenda.">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar solicitações">
          {FILTERS.map((f) => (
            <FilterChip key={f.id} label={f.label} count={count(f.id)} active={filter === f.id} onClick={() => setFilter(f.id)} />
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarOff}
            title={filter === 'enviada' ? 'Nenhuma solicitação pendente' : 'Nenhuma solicitação'}
            description="Quando um profissional pedir um bloqueio pelo Portal, ele aparece aqui."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-graphite-100">
            {list.map((r) => {
              const st = STATUS[r.status];
              return (
                <li key={r.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-bold text-graphite-900">{profName(r.professionalId)}</p>
                      <Badge tone={st.tone} dot size="sm">
                        {st.label}
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        {r.kind === 'bloqueio' ? 'Bloqueio' : 'Disponibilidade'}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-graphite-700">{when(r)}</p>
                    <p className="text-[13px] text-graphite-500">Motivo: {r.reason}</p>
                    {r.decidedBy && (
                      <p className="text-[12px] text-graphite-500">
                        Decidido por {r.decidedBy}
                        {r.decidedAt ? ` em ${formatDateBR(r.decidedAt)}` : ''}
                        {r.refusalReason ? ` — ${r.refusalReason}` : ''}
                      </p>
                    )}
                  </div>
                  {r.status === 'enviada' && canDecide && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" leftIcon={X} onClick={() => setRefusing(r)} disabled={approve.loading}>
                        Recusar
                      </Button>
                      <Button size="sm" leftIcon={Check} loading={approve.loading} onClick={() => void approve.run(r.id, 'aprovada')}>
                        Aprovar
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Modal
        open={refusing !== null}
        onClose={() => setRefusing(null)}
        title="Recusar solicitação"
        description={refusing ? `${profName(refusing.professionalId)} · ${when(refusing)}` : undefined}
        size="sm"
        dismissible={!refuse.loading}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefusing(null)} disabled={refuse.loading}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void submitRefusal()} loading={refuse.loading}>
              Recusar
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo da recusa"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={refuse.error?.fields?.refusalReason}
          hint="O profissional vê este motivo no Portal."
          required
        />
      </Modal>
    </div>
  );
}
