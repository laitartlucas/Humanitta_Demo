import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  KeyRound,
  Pencil,
  Power,
  Save,
  ShieldCheck,
  Stethoscope,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import type { Professional } from '@core';
import {
  now,
  useAccessContext,
  useAction,
  useAppointments,
  useBlockRequests,
  useCan,
  useClinicSettings,
  useProfessional,
  useRooms,
  useServices,
  useSpecialties,
  useUsers,
} from '@core';
import {
  AppointmentCard,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  KpiCard,
  SpecialtyTag,
  Switch,
  useToast,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, formatCurrency, formatDate, formatTime, isSameDay, toDateKey } from '@ds/mocks/clinical';
import { addDays, weekDays } from '../agenda/agendaUtils';
import { BlockRequestList } from '../professional-portal/shared/BlockRequestList';
import { DEFAULT_BREAK, freeSlotsCount, occupancyOf } from '../professional-portal/shared/portalData';
import { EditProfessionalModal, GrantAccessModal, RefuseRequestModal } from './modals';
import { decideRequest, linkedUserOf, saveWorkingHours, setProfessionalActive } from './professionalActions';
import { SITUATION_LABEL, SITUATION_TONE, situationOf } from './professionalsData';

export interface ProfessionalProfileScreenProps {
  /** Cadastro exibido (rota `/profissionais/:professionalId`, somente perfis administrativos). */
  professionalId?: string;
  onBack?: () => void;
}

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DaySchedule {
  weekday: Weekday;
  enabled: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

function scheduleFrom(p: Professional): DaySchedule[] {
  return WEEK_ORDER.map((wd) => {
    const w = p.workingHours.find((x) => x.weekday === wd);
    return {
      weekday: wd,
      enabled: Boolean(w),
      start: w?.start ?? '08:00',
      end: w?.end ?? '17:00',
      breakStart: DEFAULT_BREAK.start,
      breakEnd: DEFAULT_BREAK.end,
    };
  });
}

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos de intervalo dentro do expediente (intervalo padrão só conta se o expediente passa por ele). */
function breakMinutes(d: DaySchedule): number {
  return d.start < d.breakStart && d.end > d.breakEnd ? minutes(d.breakEnd) - minutes(d.breakStart) : 0;
}

function weekLabel(days: Date[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${b.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    : `${a.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${b.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function ProfessionalProfileScreen({ professionalId, onBack }: ProfessionalProfileScreenProps) {
  const { toast } = useToast();
  const ctx = useAccessContext();
  const canEdit = useCan('profissionais', 'editar');
  const canManageUsers = useCan('usuarios_permissoes', 'editar');
  const canSeeFinance = useCan('financeiro', 'ver');
  const canDecideByMatrix = useCan('bloqueio_horario', 'editar');
  const { blockApproverRole } = useClinicSettings();
  const canDecide = canDecideByMatrix && ctx.role === blockApproverRole;

  const prof = useProfessional(professionalId);
  const users = useUsers();
  const rooms = useRooms();
  const specialties = useSpecialties();
  const services = useServices();
  const allRequests = useBlockRequests();
  const today = useMemo(() => now(), []);

  const [weekRef, setWeekRef] = useState<Date>(today);
  const days = useMemo(() => weekDays(weekRef), [weekRef]);
  const keys = useMemo(() => days.map(toDateKey), [days]);
  const weekAppts = useAppointments({ professionalIds: professionalId ? [professionalId] : [], from: keys[0], to: keys[keys.length - 1] });
  const futureAppts = useAppointments({ professionalIds: professionalId ? [professionalId] : [], from: toDateKey(today), statuses: ['agendada', 'confirmada'] });

  const [schedule, setSchedule] = useState<DaySchedule[]>(() => (prof ? scheduleFrom(prof) : []));
  const [dirty, setDirty] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);
  const [refusing, setRefusing] = useState<string | null>(null);

  const saveHours = useAction(saveWorkingHours, { success: 'Horários salvos' });
  const toggleActive = useAction(setProfessionalActive);
  const decide = useAction(decideRequest);

  // Recarrega a grade quando o cadastro muda por fora (ex.: aprovação de disponibilidade), se não houver edição em curso.
  useEffect(() => {
    if (prof && !dirty) setSchedule(scheduleFrom(prof));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prof?.id, prof?.workingHours]);

  const requests = useMemo(() => allRequests.filter((r) => r.professionalId === professionalId), [allRequests, professionalId]);
  const user = professionalId ? linkedUserOf(users, professionalId) : undefined;

  if (!prof) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Profissional não encontrado"
          description="Volte para a lista e selecione um profissional."
          action={
            onBack ? (
              <Button variant="secondary" leftIcon={ArrowLeft} onClick={onBack}>
                Voltar
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  const situation = situationOf(user);
  const room = rooms.find((r) => r.id === prof.roomId);
  const specialty = specialties.find((s) => s.id === prof.specialty);
  const myServices = services.filter((s) => s.specialty === prof.specialty);
  const active = weekAppts.filter((a) => a.status !== 'cancelada');
  const weekRevenue = active.reduce((s, a) => s + a.price, 0);
  const occupancy = Math.round(occupancyOf(prof, keys, weekAppts, allRequests) * 100);
  const free = freeSlotsCount(prof, keys.filter((k) => k >= toDateKey(today)), weekAppts, allRequests);
  const weeklyHours = schedule.filter((d) => d.enabled).reduce((s, d) => s + Math.max(0, minutes(d.end) - minutes(d.start) - breakMinutes(d)), 0) / 60;
  const errors = schedule.map((d) => (d.enabled && minutes(d.end) <= minutes(d.start) ? 'O término deve ser após o início.' : saveHours.error?.fields?.[`day-${d.weekday}`]));
  const hasErrors = schedule.some((d) => d.enabled && minutes(d.end) <= minutes(d.start));
  const isCurrentWeek = days.some((d) => isSameDay(d, today));

  function patch(wd: Weekday, p: Partial<DaySchedule>) {
    setSchedule((s) => s.map((d) => (d.weekday === wd ? { ...d, ...p } : d)));
    setDirty(true);
  }

  async function saveSchedule() {
    if (!prof || hasErrors) return;
    const saved = await saveHours.run(
      prof.id,
      schedule.filter((d) => d.enabled).map((d) => ({ weekday: d.weekday, start: d.start, end: d.end })),
    );
    if (saved) setDirty(false);
  }

  async function changeActive() {
    if (!prof) return;
    const next = situation !== 'ativo';
    const updated = await toggleActive.run(prof.id, next);
    setConfirmActive(false);
    if (updated) {
      toast({
        tone: next ? 'success' : 'warning',
        title: next ? 'Profissional reativado' : 'Profissional desativado',
        description: next ? `${prof.name} volta a acessar o Portal.` : `${prof.name} não entra mais no Portal. Cadastro e histórico foram mantidos.`,
      });
    }
  }

  async function approve(id: string) {
    const res = await decide.run(id, 'aprovada');
    if (res) {
      toast({
        tone: 'success',
        title: 'Solicitação aprovada',
        description: res.appliedToSchedule
          ? 'A grade semanal foi atualizada com a nova disponibilidade.'
          : res.request.kind === 'bloqueio'
            ? 'O período passa a constar como bloqueado na Agenda.'
            : 'Aprovada. Ajuste a grade manualmente, se necessário.',
      });
    }
  }

  async function refuse(reason: string) {
    if (!refusing) return;
    const res = await decide.run(refusing, 'recusada', reason);
    if (res) {
      setRefusing(null);
      toast({ tone: 'info', title: 'Solicitação recusada', description: 'O profissional verá o motivo no Portal.' });
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'enviada').length;

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <div>
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={onBack}>
            Profissionais
          </Button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-lg border border-graphite-200 bg-white p-5 shadow-sm md:p-6" aria-label="Perfil do profissional">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[1.5px] border-gold-300" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={prof.name} src={prof.avatarUrl} size="xl" ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-display-md text-graphite-900">{prof.name}</h1>
              {prof.isDemo ? <Badge tone="neutral">Demo</Badge> : <Badge tone="gold">Responsável Técnica</Badge>}
              <Badge tone={SITUATION_TONE[situation]}>{SITUATION_LABEL[situation]}</Badge>
            </div>
            <p className="mt-1 text-sm text-graphite-600">{prof.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-graphite-500">
              <SpecialtyTag specialty={prof.specialty} variant="chip" />
              {prof.registry && <span>{prof.registry}</span>}
              <span className="flex items-center gap-1.5">
                <DoorOpen size={16} strokeWidth={1.75} aria-hidden="true" />
                {room?.name ?? '—'} · {room?.label ?? '—'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageUsers && user && (
              <Button variant="ghost" leftIcon={Power} onClick={() => setConfirmActive(true)}>
                {situation === 'ativo' ? 'Desativar' : 'Reativar'}
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
                Editar perfil
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ocupação" value={`${occupancy}%`} icon={Stethoscope} progress={occupancy} footer={isCurrentWeek ? 'nesta semana' : 'na semana exibida'} />
        <KpiCard label="Consultas na semana" value={String(active.length)} icon={CalendarDays} footer={`${free} ${free === 1 ? 'horário livre' : 'horários livres'}`} />
        <KpiCard label="Horas disponíveis" value={`${weeklyHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`} icon={Clock} footer="por semana" />
        {canSeeFinance ? (
          <KpiCard label="Produção · semana" value={formatCurrency(weekRevenue)} icon={Wallet} tone="success" footer="valor fictício" />
        ) : (
          <KpiCard label="Solicitações pendentes" value={String(pendingCount)} icon={ShieldCheck} tone={pendingCount ? 'warning' : undefined} footer="bloqueios e disponibilidade" />
        )}
      </div>

      <Card
        title="Agenda da semana"
        description={`${weekLabel(days)} · somente consultas de ${prof.name.split(' ').slice(0, 2).join(' ')}`}
        action={
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Semana anterior" variant="secondary" size="sm" onClick={() => setWeekRef((d) => addDays(d, -7))} />
            <Button variant="ghost" size="sm" onClick={() => setWeekRef(today)} disabled={isCurrentWeek}>
              Hoje
            </Button>
            <IconButton icon={ChevronRight} label="Próxima semana" variant="secondary" size="sm" onClick={() => setWeekRef((d) => addDays(d, 7))} />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {days.map((d) => {
            const key = toDateKey(d);
            const dayItems = weekAppts.filter((a) => a.start.startsWith(key));
            const works = prof.workingHours.find((w) => w.weekday === d.getDay());
            const blocks = requests.filter((r) => r.kind === 'bloqueio' && r.date === key && r.status !== 'recusada');
            const isToday = isSameDay(d, today);
            return (
              <section
                key={key}
                aria-label={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                className={cn('flex min-h-[140px] flex-col gap-2 rounded-md border p-3', isToday ? 'border-gold-300 bg-gold-50/50' : 'border-graphite-200')}
              >
                <header className="flex items-baseline justify-between">
                  <span className={cn('text-overline uppercase tracking-[0.08em]', isToday ? 'text-gold-700' : 'text-graphite-500')}>
                    {WEEKDAY_SHORT[d.getDay()]} {d.getDate()}
                  </span>
                  <span className="text-xs tabular-nums text-graphite-500">{works ? `${works.start}–${works.end}` : 'Folga'}</span>
                </header>
                {blocks.map((b) => (
                  <p
                    key={b.id}
                    className={cn(
                      'rounded-xs border px-2 py-1 text-caption',
                      b.status === 'aprovada' ? 'hm-striped border-graphite-200 text-graphite-700' : 'border-dashed border-warning/40 bg-warning-bg text-warning',
                    )}
                  >
                    {b.allDay ? 'Dia inteiro' : `${b.start}–${b.end}`} · {b.status === 'aprovada' ? 'Bloqueado' : 'Pendente'}
                  </p>
                ))}
                {dayItems.length === 0 ? (
                  <p className="text-xs text-graphite-400">{works ? 'Sem consultas' : '—'}</p>
                ) : (
                  dayItems.map((a) => <AppointmentCard key={a.id} appointment={a} variant="compact" />)
                )}
              </section>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Especialidade e serviços" description="Serviços ativos da especialidade nas Configurações da clínica">
          <div className="flex flex-wrap items-center gap-2">
            <SpecialtyTag specialty={prof.specialty} variant="chip" />
            <span className="text-body-sm text-graphite-600">
              {specialty?.name ?? prof.specialty} · duração padrão {specialty?.defaultDurationMin ?? '—'} min
            </span>
          </div>
          {myServices.length === 0 ? (
            <p className="text-body-sm text-graphite-500">Nenhum serviço cadastrado para esta especialidade.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-graphite-100">
              {myServices.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-body-sm">
                  <span className={cn('min-w-0 flex-1 font-semibold', s.active ? 'text-graphite-900' : 'text-graphite-400 line-through')}>{s.name}</span>
                  <span className="tabular-nums text-graphite-600">{s.durationMin} min</span>
                  {canSeeFinance && (
                    <span className="tabular-nums text-graphite-600">{s.price === null ? 'R$ [definir]' : formatCurrency(s.price)}</span>
                  )}
                  {!s.active && (
                    <Badge tone="neutral" size="sm">
                      Inativo
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-caption text-graphite-500">O vínculo com serviços segue a especialidade do cadastro. Serviços e preços são editados em Configurações.</p>
        </Card>

        <Card title="Acesso ao Portal do Profissional" description="Usuário individual vinculado a este cadastro">
          {user ? (
            <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
              <div>
                <dt className="text-caption text-graphite-500">E-mail de acesso</dt>
                <dd className="break-all font-semibold text-graphite-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-caption text-graphite-500">Situação</dt>
                <dd>
                  <Badge tone={SITUATION_TONE[situation]} size="sm">
                    {SITUATION_LABEL[situation]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-caption text-graphite-500">Perfil de acesso</dt>
                <dd className="font-semibold text-graphite-900">Profissional de saúde · somente os próprios registros</dd>
              </div>
              <div>
                <dt className="text-caption text-graphite-500">Último acesso</dt>
                <dd className="font-semibold tabular-nums text-graphite-900">
                  {user.lastAccess ? `${formatDate(user.lastAccess, { day: '2-digit', month: '2-digit' })} ${formatTime(user.lastAccess)}` : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-warning/40 bg-warning-bg p-4 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-body-sm text-graphite-800">
                Sem usuário vinculado: este profissional ainda não entra no Portal. A agenda funciona normalmente pela recepção.
              </p>
              {canManageUsers && (
                <Button size="sm" leftIcon={KeyRound} onClick={() => setGrantOpen(true)}>
                  Liberar acesso
                </Button>
              )}
            </div>
          )}
          <p className="text-caption text-graphite-500">
            Prontuários não são exibidos à administração (LGPD). O papel do usuário é fixo e não pode ser alterado pelo próprio profissional.
          </p>
        </Card>
      </div>

      <Card
        title="Solicitações de bloqueio e disponibilidade"
        description={
          pendingCount
            ? `${pendingCount} aguardando decisão${canDecide ? '' : ' da administração'}`
            : 'Pedidos feitos pelo profissional no Portal'
        }
      >
        <BlockRequestList
          requests={requests}
          emptyDescription="Quando o profissional solicitar um bloqueio ou alteração de horário pelo Portal, o pedido aparece aqui."
          renderActions={(r) =>
            canDecide && r.status === 'enviada' ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" leftIcon={Check} loading={decide.loading} onClick={() => approve(r.id)}>
                  Aprovar
                </Button>
                <Button size="sm" variant="secondary" leftIcon={X} disabled={decide.loading} onClick={() => setRefusing(r.id)}>
                  Recusar
                </Button>
              </div>
            ) : null
          }
        />
        {!canDecide && pendingCount > 0 && <p className="text-caption text-graphite-500">Somente a administração aprova ou recusa solicitações.</p>}
      </Card>

      <Card
        title="Configuração de horários"
        description={
          canEdit
            ? 'Defina os dias e horários de atendimento. Alterações valem para novos agendamentos.'
            : 'Somente leitura para o seu perfil.'
        }
        action={
          canEdit ? (
            <Button size="sm" leftIcon={Save} onClick={saveSchedule} disabled={!dirty || hasErrors} loading={saveHours.loading}>
              Salvar horários
            </Button>
          ) : undefined
        }
      >
        <ul className="flex flex-col divide-y divide-graphite-100">
          {schedule.map((d, i) => (
            <li key={d.weekday} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
              <div className="lg:w-56">
                <Switch
                  checked={d.enabled}
                  onChange={(v) => patch(d.weekday, { enabled: v })}
                  label={WEEKDAY_NAMES[d.weekday]}
                  description={d.enabled ? 'Atende' : 'Sem expediente'}
                  disabled={!canEdit}
                />
              </div>
              <fieldset
                disabled={!d.enabled || !canEdit}
                className={cn('grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4', !d.enabled && 'opacity-50')}
              >
                <legend className="sr-only">Horários de {WEEKDAY_NAMES[d.weekday]}</legend>
                {(
                  [
                    ['start', 'Início'],
                    ['end', 'Término'],
                    ['breakStart', 'Intervalo de'],
                    ['breakEnd', 'Intervalo até'],
                  ] as const
                ).map(([field, label]) => {
                  const isBreak = field === 'breakStart' || field === 'breakEnd';
                  return (
                    <label key={field} className="flex flex-col gap-1 text-xs font-semibold text-graphite-600">
                      {label}
                      <input
                        type="time"
                        step={900}
                        value={d[field]}
                        onChange={(e) => patch(d.weekday, { [field]: e.target.value })}
                        disabled={isBreak}
                        title={isBreak ? 'Intervalo padrão da clínica' : undefined}
                        aria-invalid={field === 'end' && Boolean(errors[i])}
                        className={cn(
                          'h-10 rounded-sm border bg-white px-3 text-sm font-medium tabular-nums text-graphite-900 focus-visible:border-gold-500 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed',
                          field === 'end' && errors[i] ? 'border-danger' : 'border-graphite-200',
                        )}
                      />
                    </label>
                  );
                })}
              </fieldset>
              {errors[i] && (
                <p role="alert" className="text-xs font-semibold text-danger lg:w-40">
                  {errors[i]}
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="text-caption text-graphite-500">
          Intervalo padrão da clínica ({DEFAULT_BREAK.start}–{DEFAULT_BREAK.end}) quando o expediente passa pelo almoço. Bloqueios pontuais são
          solicitados pelo profissional no Portal.
        </p>
      </Card>

      {canEdit && <EditProfessionalModal open={editOpen} professional={prof} onClose={() => setEditOpen(false)} />}
      {canManageUsers && <GrantAccessModal open={grantOpen} professional={prof} onClose={() => setGrantOpen(false)} />}

      <ConfirmDialog
        open={confirmActive}
        onClose={() => setConfirmActive(false)}
        onConfirm={changeActive}
        loading={toggleActive.loading}
        tone={situation === 'ativo' ? 'danger' : 'primary'}
        title={situation === 'ativo' ? `Desativar ${prof.name}?` : `Reativar ${prof.name}?`}
        description={
          situation === 'ativo'
            ? `O acesso ao Portal será bloqueado. Cadastro, histórico e agenda são mantidos${futureAppts.length ? ` — há ${futureAppts.length} consultas futuras que a recepção deve remarcar ou manter` : ''}.`
            : 'O profissional volta a entrar no Portal com o mesmo usuário e vê somente os próprios registros.'
        }
        confirmLabel={situation === 'ativo' ? 'Desativar' : 'Reativar'}
      />

      <RefuseRequestModal
        open={Boolean(refusing)}
        request={requests.find((r) => r.id === refusing) ?? null}
        loading={decide.loading}
        error={decide.error?.fields?.refusalReason}
        onClose={() => setRefusing(null)}
        onConfirm={refuse}
      />
    </div>
  );
}
