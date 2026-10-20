import { CalendarPlus, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { AppointmentStatus, Professional, Specialty } from '@ds/mocks/types';
import { Button, FilterChip, IconButton, SegmentedControl, Select } from '@ds/components';
import { SPECIALTY_NAMES, STATUS_NAMES } from '@ds/mocks/clinical';
import type { AgendaFilters, AgendaView } from '../agendaUtils';

export interface AgendaToolbarProps {
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  filters: AgendaFilters;
  onFiltersChange: (f: AgendaFilters) => void;
  professionals: Professional[];
  onNew: () => void;
  resultCount: number;
}

const VIEW_OPTIONS = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

const STATUS_ORDER: AppointmentStatus[] = ['agendada', 'confirmada', 'em_atendimento', 'concluida', 'cancelada', 'faltou', 'reagendada'];

export function AgendaToolbar({
  view,
  onViewChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  filters,
  onFiltersChange,
  professionals,
  onNew,
  resultCount,
}: AgendaToolbarProps) {
  const hasFilters = filters.professionalId !== 'todos' || filters.specialties.length > 0 || filters.status !== 'todos';
  const prevLabel = view === 'dia' ? 'Dia anterior' : view === 'semana' ? 'Semana anterior' : 'Mês anterior';
  const nextLabel = view === 'dia' ? 'Próximo dia' : view === 'semana' ? 'Próxima semana' : 'Próximo mês';
  const removeSpecialty = (s: Specialty) =>
    onFiltersChange({ ...filters, specialties: filters.specialties.filter((x) => x !== s) });
  const professionalName = professionals.find((p) => p.id === filters.professionalId)?.name;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-3 shadow-sm md:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label={prevLabel} variant="secondary" size="sm" onClick={onPrev} />
          <IconButton icon={ChevronRight} label={nextLabel} variant="secondary" size="sm" onClick={onNext} />
          <Button variant="ghost" size="sm" onClick={onToday}>
            Hoje
          </Button>
        </div>
        <h2 className="min-w-0 flex-1 font-display text-2xl first-letter:uppercase leading-tight text-graphite-900" aria-live="polite">
          {periodLabel}
        </h2>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={view}
          onChange={(v) => onViewChange(v as AgendaView)}
          ariaLabel="Visualização da agenda"
        />
        <Button leftIcon={CalendarPlus} onClick={onNew} className="hidden sm:inline-flex">
          Novo agendamento
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-graphite-100 pt-3 md:flex-row md:items-end">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-[520px]">
          <Select
            id="agenda-filter-prof"
            label="Profissional"
            value={filters.professionalId}
            onChange={(e) => onFiltersChange({ ...filters, professionalId: e.target.value })}
            options={[{ value: 'todos', label: 'Todos os profissionais' }, ...professionals.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Select
            id="agenda-filter-status"
            label="Status"
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as AgendaFilters['status'] })}
            options={[{ value: 'todos', label: 'Todos os status' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_NAMES[s] }))]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:ml-auto" aria-label="Filtros ativos">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-graphite-500">
            <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden="true" />
            {resultCount} {resultCount === 1 ? 'agendamento' : 'agendamentos'}
          </span>
          {professionalName && (
            <FilterChip label={professionalName} active onRemove={() => onFiltersChange({ ...filters, professionalId: 'todos' })} />
          )}
          {filters.status !== 'todos' && (
            <FilterChip label={STATUS_NAMES[filters.status]} active onRemove={() => onFiltersChange({ ...filters, status: 'todos' })} />
          )}
          {filters.specialties.map((s) => (
            <FilterChip key={s} label={SPECIALTY_NAMES[s]} active onRemove={() => removeSpecialty(s)} />
          ))}
          {hasFilters && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onFiltersChange({ professionalId: 'todos', specialties: [], status: 'todos' })}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
      <Button leftIcon={CalendarPlus} onClick={onNew} fullWidth className="sm:hidden">
        Novo agendamento
      </Button>
    </div>
  );
}
