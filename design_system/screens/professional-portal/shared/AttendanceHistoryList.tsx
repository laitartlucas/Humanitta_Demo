import { CheckCheck, ChevronRight, Lock, UserX } from 'lucide-react';
import { Badge } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { formatTime } from '@ds/mocks/clinical';
import type { PortalAttendanceRecord } from '@ds/mocks/portal';
import { weekdayDate } from './portalUtils';

export interface AttendanceHistoryListProps {
  records: PortalAttendanceRecord[];
  /** Abre o detalhe de um registro próprio (registros restritos nunca são clicáveis). */
  onSelect?: (record: PortalAttendanceRecord) => void;
  /** Esconde o nome do paciente (ex.: dentro da ficha do próprio paciente). */
  hidePatient?: boolean;
  className?: string;
}

/**
 * Histórico de atendimentos. Itens de OUTROS profissionais aparecem apenas como marcador
 * bloqueado (cadeado, sem serviço/conteúdo) — o servidor nem envia esses dados.
 */
export function AttendanceHistoryList({ records, onSelect, hidePatient = false, className }: AttendanceHistoryListProps) {
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {records.map((r) => {
        const when = `${weekdayDate(r.date)} · ${formatTime(r.date)}`;
        if (r.restricted) {
          return (
            <li
              key={r.id}
              className="hm-striped flex items-center gap-3 rounded-sm border border-graphite-200 px-3 py-2.5"
              aria-label={`${when}: atendimento de outro profissional, conteúdo restrito`}
            >
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-graphite-500 ring-1 ring-graphite-200">
                <Lock size={14} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-caption font-semibold tabular-nums text-graphite-600">{when}</span>
                <span className="block truncate text-body-sm font-bold text-graphite-700">
                  {hidePatient ? 'Atendimento de outro profissional' : `${r.patientName} · outro profissional`}
                </span>
                <span className="block text-caption text-graphite-600">Acesso restrito ao profissional responsável.</span>
              </span>
              <Badge tone="neutral" icon={Lock} size="sm">
                Restrito
              </Badge>
            </li>
          );
        }
        const content = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                r.outcome === 'faltou' ? 'bg-warning-bg text-warning' : 'bg-gold-50 text-gold-600',
              )}
            >
              {r.outcome === 'faltou' ? <UserX size={14} strokeWidth={2} /> : <CheckCheck size={14} strokeWidth={2} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-semibold tabular-nums text-graphite-500">{when}</span>
              <span className="block truncate text-body-sm font-bold text-graphite-900">
                {hidePatient ? r.service : `${r.patientName} · ${r.service}`}
              </span>
              {r.summary && <span className="block truncate text-caption text-graphite-600">{r.summary}</span>}
            </span>
            {r.outcome === 'faltou' ? (
              <Badge tone="warning" size="sm">
                Faltou
              </Badge>
            ) : (
              <Badge tone="neutral" size="sm">
                Concluído
              </Badge>
            )}
            {onSelect && <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-graphite-400" />}
          </>
        );
        return (
          <li key={r.id}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="flex w-full items-center gap-3 rounded-sm border border-graphite-200 bg-white px-3 py-2.5 text-left hover:bg-graphite-50 focus-visible:outline-none focus-visible:shadow-focus"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-sm border border-graphite-200 bg-white px-3 py-2.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
