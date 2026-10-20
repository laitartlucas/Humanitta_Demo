import { SearchX } from 'lucide-react';
import type { AppointmentRecord } from '@core';
import { AppointmentCard, Button, EmptyState } from '@ds/components';
import { formatDate } from '@ds/mocks/clinical';

export interface AgendaSearchResultsProps {
  query: string;
  results: AppointmentRecord[];
  onSelectAppointment: (a: AppointmentRecord) => void;
  onClear: () => void;
}

/** Resultado da pesquisa de consultas (todas as datas), agrupado por dia. */
export function AgendaSearchResults({ query, results, onSelectAppointment, onClear }: AgendaSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-md border border-graphite-200 bg-white shadow-sm">
        <EmptyState
          icon={SearchX}
          title="Nenhuma consulta encontrada"
          description={`Nada corresponde a “${query.trim()}” com os filtros atuais. Tente o nome do paciente, do profissional ou uma data (ex.: 21/10).`}
          action={
            <Button variant="secondary" size="sm" onClick={onClear}>
              Limpar pesquisa
            </Button>
          }
        />
      </div>
    );
  }

  const groups = results.reduce<{ key: string; items: AppointmentRecord[] }[]>((acc, a) => {
    const key = a.start.slice(0, 10);
    const last = acc[acc.length - 1];
    if (last?.key === key) last.items.push(a);
    else acc.push({ key, items: [a] });
    return acc;
  }, []);

  return (
    <section aria-label="Resultados da pesquisa" className="flex flex-col gap-4 rounded-md border border-graphite-200 bg-white p-3 shadow-sm md:p-4">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-2">
          <h3 className="text-overline uppercase tracking-[0.08em] text-graphite-500">
            {formatDate(`${g.key}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          {g.items.map((a) => (
            <AppointmentCard key={a.id} appointment={a} variant="row" onClick={() => onSelectAppointment(a)} />
          ))}
        </div>
      ))}
    </section>
  );
}
