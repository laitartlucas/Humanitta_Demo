import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock, DoorOpen, Stethoscope, UserPlus, UserRoundSearch } from 'lucide-react';
import type { Professional, Specialty } from '@ds/mocks/types';
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
  SpecialtyTag,
  useToast,
} from '@ds/components';
import {
  ALL_SPECIALTIES,
  DEMO_TODAY,
  DEMO_WEEK,
  SPECIALTY_NAMES,
  WEEKDAY_SHORT,
  appointments,
  getRoomName,
  professionals as seedProfessionals,
  toDateKey,
} from '@ds/mocks/clinical';
import { NewProfessionalModal } from './modals';

export interface ProfessionalsScreenProps {
  onOpenProfessional?: (professionalId: string) => void;
}

type Availability = 'todos' | 'hoje' | 'livre';

const weekKeys = DEMO_WEEK.map(toDateKey);
const todayKey = toDateKey(DEMO_TODAY);

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function todayHours(p: Professional): { start: string; end: string } | undefined {
  return p.workingHours.find((w) => w.weekday === DEMO_TODAY.getDay());
}

export function ProfessionalsScreen({ onOpenProfessional }: ProfessionalsScreenProps) {
  const { toast } = useToast();
  const [list, setList] = useState<Professional[]>(seedProfessionals);
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<Specialty | 'todas'>('todas');
  const [availability, setAvailability] = useState<Availability>('todos');
  const [newOpen, setNewOpen] = useState(false);

  const stats = useMemo(() => {
    const map: Record<string, { week: number; today: number }> = {};
    list.forEach((p) => {
      const mine = appointments.filter((a) => a.professionalId === p.id && a.status !== 'cancelada');
      map[p.id] = {
        week: mine.filter((a) => weekKeys.some((k) => a.start.startsWith(k))).length,
        today: mine.filter((a) => a.start.startsWith(todayKey)).length,
      };
    });
    return map;
  }, [list]);

  const filtered = list.filter((p) => {
    const q = normalize(query.trim());
    const matchQ = !q || normalize(p.name).includes(q) || normalize(p.title).includes(q);
    const matchS = specialty === 'todas' || p.specialty === specialty;
    const hrs = todayHours(p);
    const matchA =
      availability === 'todos' ||
      (availability === 'hoje' && hrs !== undefined) ||
      (availability === 'livre' && hrs !== undefined && p.occupancy < 0.8);
    return matchQ && matchS && matchA;
  });

  const specialtiesInUse = ALL_SPECIALTIES.filter((s) => list.some((p) => p.specialty === s));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profissionais"
        subtitle={`${list.length} profissionais · ${list.filter((p) => todayHours(p)).length} atendendo hoje`}
        breadcrumb={['Início', 'Profissionais']}
        actions={
          <Button leftIcon={UserPlus} onClick={() => setNewOpen(true)}>
            Novo profissional
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <SearchInput
              aria-label="Buscar profissionais"
              placeholder="Buscar por nome ou cargo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
              key={s}
              label={SPECIALTY_NAMES[s]}
              active={specialty === s}
              count={list.filter((p) => p.specialty === s).length}
              onClick={() => setSpecialty(specialty === s ? 'todas' : s)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-graphite-200 bg-white p-8 shadow-sm">
          <EmptyState
            icon={UserRoundSearch}
            title="Nenhum profissional encontrado"
            description="Ajuste a busca ou os filtros de especialidade e disponibilidade."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setSpecialty('todas');
                  setAvailability('todos');
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((p) => {
            const hrs = todayHours(p);
            const pct = Math.round(p.occupancy * 100);
            const s = stats[p.id] ?? { week: 0, today: 0 };
            return (
              <li key={p.id}>
                <article className="flex h-full flex-col rounded-md border border-graphite-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4 p-5">
                    <Avatar name={p.name} src={p.avatarUrl} size="lg" ring={!p.isDemo} status={hrs ? 'online' : 'offline'} />
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
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 border-t border-graphite-100 px-5 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DoorOpen size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                      <dt className="sr-only">Sala</dt>
                      <dd className="text-graphite-800">{getRoomName(p.roomId ?? '')}</dd>
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
                        {p.workingHours.map((w) => WEEKDAY_SHORT[w.weekday]).join(', ')}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-col gap-3 border-t border-graphite-100 px-5 py-4">
                    <ProgressBar value={pct} tone={pct >= 85 ? 'warning' : 'gold'} label={`Ocupação ${pct}%`} />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        disabled={!hrs}
                        onClick={() =>
                          toast({ tone: 'info', title: 'Agenda filtrada', description: `Abra a Agenda para ver ${p.name}.` })
                        }
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
        Profissionais marcados como “Demo” têm nomes fictícios para fins de demonstração.
      </p>

      <NewProfessionalModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(p) => {
          setList((l) => [...l, p]);
          setNewOpen(false);
          toast({ tone: 'success', title: 'Profissional cadastrado', description: p.name });
        }}
      />
    </div>
  );
}
