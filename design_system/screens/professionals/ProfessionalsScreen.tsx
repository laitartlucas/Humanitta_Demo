import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock, DoorOpen, Hourglass, Stethoscope, UserPlus, UserRoundSearch } from 'lucide-react';
import type { Specialty } from '@core';
import { now, useAppointments, useBlockRequests, useCan, useProfessionals, useRooms, useSpecialties, useUsers } from '@core';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FilterChip,
  PageHeader,
  ProgressBar,
  SearchInput,
  SegmentedControl,
  Select,
  SpecialtyTag,
} from '@ds/components';
import { WEEKDAY_SHORT, toDateKey } from '@ds/mocks/clinical';
import { freeSlotsCount, occupancyOf } from '../professional-portal/shared/portalData';
import { NewProfessionalModal } from './modals';
import { linkedUserOf } from './professionalActions';
import { SITUATION_LABEL, SITUATION_TONE, hoursOn, normalize, situationOf, weekKeysOf, type ProfessionalSituation } from './professionalsData';

export interface ProfessionalsScreenProps {
  onOpenProfessional?: (professionalId: string) => void;
  /** Agenda individual do profissional (o container abre o perfil, que mostra a semana). */
  onOpenAgenda?: (professionalId: string) => void;
}

type Availability = 'todos' | 'hoje' | 'livre';
type SituationFilter = 'todas' | ProfessionalSituation;

/** Profissionais — cadastro administrativo (admin edita; recepção consulta). Dados do core. */
export function ProfessionalsScreen({ onOpenProfessional, onOpenAgenda }: ProfessionalsScreenProps) {
  const canEdit = useCan('profissionais', 'editar');
  const list = useProfessionals();
  const users = useUsers();
  const rooms = useRooms();
  const specialties = useSpecialties();
  const requests = useBlockRequests();
  const today = useMemo(() => now(), []);
  const todayKey = toDateKey(today);
  const weekKeys = useMemo(() => weekKeysOf(today), [today]);
  const weekAppointments = useAppointments({ from: weekKeys[0], to: weekKeys[weekKeys.length - 1] });

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<Specialty | 'todas'>('todas');
  const [availability, setAvailability] = useState<Availability>('todos');
  const [situation, setSituation] = useState<SituationFilter>('todas');
  const [newOpen, setNewOpen] = useState(false);

  const stats = useMemo(() => {
    const map: Record<string, { week: number; today: number; occupancy: number; free: number; situation: ProfessionalSituation }> = {};
    list.forEach((p) => {
      const mine = weekAppointments.filter((a) => a.professionalId === p.id && a.status !== 'cancelada');
      map[p.id] = {
        week: mine.length,
        today: mine.filter((a) => a.start.startsWith(todayKey)).length,
        occupancy: occupancyOf(p, weekKeys, weekAppointments, requests),
        free: freeSlotsCount(p, weekKeys.filter((k) => k >= todayKey), weekAppointments, requests),
        situation: situationOf(linkedUserOf(users, p.id)),
      };
    });
    return map;
  }, [list, users, weekAppointments, requests, weekKeys, todayKey]);

  const roomName = (id?: string) => rooms.find((r) => r.id === id)?.name ?? '—';
  const pending = requests.filter((r) => r.status === 'enviada');

  const filtered = list.filter((p) => {
    const q = normalize(query.trim());
    const matchQ = !q || normalize(p.name).includes(q) || normalize(p.title).includes(q);
    const matchS = specialty === 'todas' || p.specialty === specialty;
    const hrs = hoursOn(p, today);
    const s = stats[p.id];
    const matchA =
      availability === 'todos' ||
      (availability === 'hoje' && hrs !== undefined) ||
      (availability === 'livre' && hrs !== undefined && (s?.free ?? 0) > 0 && (s?.occupancy ?? 0) < 0.8);
    const matchSit = situation === 'todas' || s?.situation === situation;
    return matchQ && matchS && matchA && matchSit;
  });

  const specialtiesInUse = specialties.filter((s) => list.some((p) => p.specialty === s.id));
  const activeCount = list.filter((p) => stats[p.id]?.situation === 'ativo').length;

  function clearFilters() {
    setQuery('');
    setSpecialty('todas');
    setAvailability('todos');
    setSituation('todas');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profissionais"
        subtitle={`${list.length} profissionais · ${activeCount} com acesso ativo · ${list.filter((p) => hoursOn(p, today)).length} atendendo hoje`}
        breadcrumb={['Início', 'Profissionais']}
        actions={
          canEdit ? (
            <Button leftIcon={UserPlus} onClick={() => setNewOpen(true)}>
              Novo profissional
            </Button>
          ) : (
            <Badge tone="neutral">Somente consulta</Badge>
          )
        }
      />

      {pending.length > 0 && (
        <section
          aria-label="Solicitações de disponibilidade pendentes"
          className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning-bg p-4 sm:flex-row sm:items-center"
        >
          <Hourglass size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-body-sm text-graphite-800">
            <span className="font-bold">
              {pending.length === 1 ? '1 solicitação aguardando aprovação' : `${pending.length} solicitações aguardando aprovação`}
            </span>
            {' · '}
            {Array.from(new Set(pending.map((r) => list.find((p) => p.id === r.professionalId)?.name).filter(Boolean))).join(', ')}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(pending.map((r) => r.professionalId))).map((id) => {
              const p = list.find((x) => x.id === id);
              return p ? (
                <Button key={id} variant="secondary" size="sm" rightIcon={ChevronRight} onClick={() => onOpenProfessional?.(id)}>
                  {p.name.split(' ').slice(0, 2).join(' ')}
                </Button>
              ) : null;
            })}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-xl">
            <div className="w-full sm:flex-1">
              <SearchInput
                aria-label="Buscar profissionais"
                placeholder="Buscar por nome ou cargo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                aria-label="Situação"
                value={situation}
                onChange={(e) => setSituation(e.target.value as SituationFilter)}
                options={[
                  { value: 'todas', label: 'Todas as situações' },
                  ...(Object.keys(SITUATION_LABEL) as ProfessionalSituation[]).map((s) => ({ value: s, label: SITUATION_LABEL[s] })),
                ]}
              />
            </div>
          </div>
          <SegmentedControl
            ariaLabel="Disponibilidade"
            value={availability}
            onChange={(v) => setAvailability(v as Availability)}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'hoje', label: 'Atendem hoje' },
              { value: 'livre', label: 'Com horários livres' },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por especialidade">
          <FilterChip label="Todas" active={specialty === 'todas'} onClick={() => setSpecialty('todas')} count={list.length} />
          {specialtiesInUse.map((s) => (
            <FilterChip
              key={s.id}
              label={s.name}
              active={specialty === s.id}
              count={list.filter((p) => p.specialty === s.id).length}
              onClick={() => setSpecialty(specialty === s.id ? 'todas' : s.id)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-graphite-200 bg-white p-8 shadow-sm">
          <EmptyState
            icon={UserRoundSearch}
            title={list.length === 0 ? 'Nenhum profissional cadastrado' : 'Nenhum profissional encontrado'}
            description={
              list.length === 0
                ? 'Cadastre o primeiro profissional para montar a agenda da clínica.'
                : 'Ajuste a busca ou os filtros de especialidade, situação e disponibilidade.'
            }
            action={
              list.length === 0 ? (
                canEdit ? (
                  <Button leftIcon={UserPlus} onClick={() => setNewOpen(true)}>
                    Novo profissional
                  </Button>
                ) : undefined
              ) : (
                <Button variant="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((p) => {
            const hrs = hoursOn(p, today);
            const s = stats[p.id] ?? { week: 0, today: 0, occupancy: 0, free: 0, situation: 'sem_acesso' as const };
            const pct = Math.round(s.occupancy * 100);
            const inactive = s.situation === 'inativo';
            return (
              <li key={p.id}>
                <article
                  className={
                    inactive
                      ? 'flex h-full flex-col rounded-md border border-graphite-200 bg-graphite-50 shadow-sm transition-shadow hover:shadow-md'
                      : 'flex h-full flex-col rounded-md border border-graphite-200 bg-white shadow-sm transition-shadow hover:shadow-md'
                  }
                >
                  <div className="flex items-start gap-4 p-5">
                    <Avatar name={p.name} src={p.avatarUrl} size="lg" ring={!p.isDemo} status={hrs && !inactive ? 'online' : 'offline'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="truncate text-base font-bold text-graphite-900">{p.name}</h2>
                        {p.isDemo ? (
                          <Badge tone="neutral" size="sm">
                            Demo
                          </Badge>
                        ) : (
                          <Badge tone="gold" size="sm">
                            Responsável Técnica
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-graphite-500">{p.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SpecialtyTag specialty={p.specialty} variant="chip" />
                        {p.registry && <span className="text-xs text-graphite-500">{p.registry}</span>}
                        {s.situation !== 'ativo' && (
                          <Badge tone={SITUATION_TONE[s.situation]} size="sm">
                            {SITUATION_LABEL[s.situation]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 border-t border-graphite-100 px-5 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DoorOpen size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                      <dt className="sr-only">Sala</dt>
                      <dd className="text-graphite-800">{roomName(p.roomId)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                      <dt className="sr-only">Hoje</dt>
                      <dd className={hrs ? 'text-graphite-800' : 'text-graphite-400'}>
                        {hrs ? `Hoje ${hrs.start}–${hrs.end}` : 'Sem expediente hoje'}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                      <dt className="sr-only">Semana</dt>
                      <dd className="text-graphite-800">{s.week} consultas na semana</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                      <dt className="sr-only">Dias de atendimento</dt>
                      <dd className="truncate text-graphite-800">
                        {p.workingHours.length ? p.workingHours.map((w) => WEEKDAY_SHORT[w.weekday]).join(', ') : 'Sem grade'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-col gap-3 border-t border-graphite-100 px-5 py-4">
                    <ProgressBar
                      value={pct}
                      tone={pct >= 85 ? 'warning' : 'gold'}
                      label={`Ocupação ${pct}% · ${s.free} ${s.free === 1 ? 'horário livre' : 'horários livres'} na semana`}
                    />
                    {/* grid: dois Button fullWidth (w-full + shrink-0) numa linha flex estouravam o card. */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        disabled={!hrs}
                        onClick={() => (onOpenAgenda ?? onOpenProfessional)?.(p.id)}
                        aria-label={`Agenda de ${p.name}: ${s.today} consultas hoje`}
                      >
                        {s.today} hoje
                      </Button>
                      <Button size="sm" fullWidth rightIcon={ChevronRight} onClick={() => onOpenProfessional?.(p.id)} aria-label={`Ver perfil de ${p.name}`}>
                        Ver perfil
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-graphite-500">
        Profissionais marcados como “Demo” têm nomes fictícios para fins de demonstração. Ocupação calculada pela agenda
        compartilhada desta semana.
      </p>

      {canEdit && (
        <NewProfessionalModal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onCreate={(p) => onOpenProfessional?.(p.id)}
        />
      )}
    </div>
  );
}
