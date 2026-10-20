import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCheck,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FilterX,
  History,
  Hourglass,
  ListChecks,
  LogIn,
  Play,
  ShieldAlert,
  Stethoscope,
  Timer,
  UserX,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  KpiCard,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  SpecialtyTag,
  StatusBadge,
  Tabs,
  useToast,
} from '@ds/components';
import type { DataTableColumn } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { formatCurrency, formatDate, formatTime } from '@ds/mocks/clinical';
import { can, now, nowIso, todayKey, useAccessContext, useCan, useClinicSettings, useDb, usePatient, useProfessionals, useRooms, useSpecialties } from '@core';
import type { Specialty } from '@core';
import {
  SORT_LABEL,
  STAGE_GROUP_LABEL,
  STAGE_GROUP_ORDER,
  computeIndicators,
  filterAttendances,
  historyBetween,
  historyStats,
  matchesGroup,
  minutesBetween,
  shiftDateKey,
  sortAttendances,
  type AttendanceSort,
  type AttendanceView,
  type StageGroup,
} from '@modules/attendances/model';
import { useAttendanceAvailability, useAttendanceFlow, useAttendanceViews, useDemoRecord } from '@modules/attendances/hooks';
import type { DemoNote } from '@modules/attendances/clinicalNote';
import { DemoRecordPanel } from './components/DemoRecordPanel';
import { StatBlock, durationLabel, plural } from './components/Timeline';
import { AttendanceDetailsContent, AttendanceDetailsModal, AttendanceFooterActions, FinishAttendanceDialog } from './modals';

export interface AttendancesScreenProps {
  /** Abre a ficha do paciente (navegação controlada pelo App). */
  onOpenPatient?: (patientId: string) => void;
  /** Abre a agenda do dia. */
  onOpenAgenda?: () => void;
  /** Atendimento aberto no painel de detalhes (id do agendamento, vindo da URL). */
  selectedId?: string | null;
  /** Abre/fecha o painel de detalhes (o container sincroniza com a URL). */
  onSelect?: (appointmentId: string | null) => void;
}

const SORT_ORDER: AttendanceSort[] = ['horario', 'horario_desc', 'paciente', 'profissional', 'status'];

function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const label = formatDate(new Date(y, m - 1, d), { weekday: 'long', day: '2-digit', month: '2-digit' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

/* ------------------------------------------------------------------ */
/* Checklist administrativo (derivado dos cadastros — sem estado próprio) */
/* ------------------------------------------------------------------ */

function AdminChecklist({ view, views }: { view: AttendanceView; views: AttendanceView[] }) {
  const patient = usePatient(view.patient.id);
  const ctx = useAccessContext();
  const overrides = useDb((s) => s.clinicSettings.permissionOverrides);
  if (!patient) return null;
  const seesPatientFinance = can(ctx, 'pacientes_financeiro', 'ver', overrides);
  const items: { key: string; label: string; description: string; done: boolean }[] = [
    { key: 'cadastro', label: 'Cadastro conferido', description: 'Telefone e e-mail preenchidos no cadastro.', done: Boolean(patient.phone && patient.email) },
    {
      key: 'lgpd',
      label: 'Termo de consentimento (LGPD) assinado',
      description: 'Autorização para tratamento de dados de saúde.',
      done: !patient.tags.includes('Novo cadastro'),
    },
  ];
  if (view.billing !== undefined || seesPatientFinance) {
    items.push({
      key: 'pagamento',
      label: 'Pagamento registrado',
      description: 'Lançamento no financeiro (valores fictícios).',
      done: view.billing !== undefined ? view.billing?.status === 'pago' : view.stage === 'concluido' && patient.balance === 0,
    });
  }
  items.push({
    key: 'retorno',
    label: 'Retorno agendado',
    description: 'Próxima sessão marcada na agenda, se indicada.',
    done: views.some(
      (o) => o.patient.id === view.patient.id && o.id !== view.id && o.appointment.start > view.appointment.start && (o.stage === 'agendado' || o.stage === 'na_recepcao'),
    ),
  });
  const done = items.filter((i) => i.done).length;
  return (
    <section aria-labelledby="att-checklist">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 id="att-checklist" className="flex items-center gap-2 text-sm font-bold text-graphite-900">
          <ClipboardCheck size={16} strokeWidth={1.75} aria-hidden="true" />
          Checklist administrativo
        </h3>
        <Badge tone={done === items.length ? 'success' : 'neutral'} size="sm">
          {done} de {items.length} concluídos
        </Badge>
      </div>
      <p className="text-xs text-graphite-500">Atualizado automaticamente a partir do cadastro, da agenda e do financeiro.</p>
      <div className="flex flex-col">
        {items.map((c) => (
          <Checkbox key={c.key} id={`att-${view.id}-${c.key}`} label={c.label} description={c.description} checked={c.done} disabled readOnly />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export function AttendancesScreen({ onOpenPatient, onOpenAgenda, selectedId = null, onSelect }: AttendancesScreenProps) {
  const { toast } = useToast();
  const ctx = useAccessContext();
  const canSeeAttendances = useCan('atendimentos', 'proprio');
  const canOpenPatient = useCan('pacientes_cadastro', 'ver');
  const views = useAttendanceViews();
  const availability = useAttendanceAvailability(views);
  const flow = useAttendanceFlow();
  const professionals = useProfessionals();
  const specialties = useSpecialties();
  const rooms = useRooms();
  const clinicName = useClinicSettings().info.name;
  const today = todayKey();
  const nowDate = now();
  const isProfessional = ctx.role === 'profissional';

  const [tab, setTab] = useState<StageGroup>('todos');
  const [dateKey, setDateKey] = useState(today);
  const [professionalId, setProfessionalId] = useState('');
  const [specialty, setSpecialty] = useState<Specialty | ''>('');
  const [roomId, setRoomId] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<AttendanceSort>('horario');

  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const detailsId = onSelect ? selectedId : localSelected;
  const select = (id: string | null) => (onSelect ? onSelect(id) : setLocalSelected(id));
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [finishId, setFinishId] = useState<string | null>(null);
  const [noShowId, setNoShowId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  /* ---------- derivados ---------- */

  const dayViews = useMemo(() => views.filter((v) => !dateKey || v.dateKey === dateKey), [views, dateKey]);
  const baseFiltered = useMemo(
    () => filterAttendances(dayViews, { professionalId, specialty, roomId, query }),
    [dayViews, professionalId, specialty, roomId, query],
  );
  const counts = useMemo(() => {
    const c = {} as Record<StageGroup, number>;
    STAGE_GROUP_ORDER.forEach((g) => {
      c[g] = baseFiltered.filter((v) => matchesGroup(v, g)).length;
    });
    return c;
  }, [baseFiltered]);
  const rows = useMemo(() => sortAttendances(baseFiltered.filter((v) => matchesGroup(v, tab)), sort), [baseFiltered, tab, sort]);
  const indicators = useMemo(() => computeIndicators(dayViews), [dayViews]);

  const isToday = dateKey === today;
  const inProgress = useMemo(() => views.filter((v) => v.stage === 'em_andamento'), [views]);
  const queue = useMemo(
    () => views.filter((v) => v.stage === 'na_recepcao' && v.dateKey === today).sort((a, b) => (a.checkInAt ?? '').localeCompare(b.checkInAt ?? '')),
    [views, today],
  );
  const activeRooms = rooms.filter((r) => r.active);
  const occupiedRooms = new Set(inProgress.map((v) => v.roomId)).size;

  const historyTo = dateKey && dateKey < today ? dateKey : today;
  const historyFrom = shiftDateKey(historyTo, -6);
  const history = useMemo(() => historyBetween(views, historyFrom, historyTo), [views, historyFrom, historyTo]);
  const weekStats = useMemo(() => historyStats(views, historyFrom, historyTo), [views, historyFrom, historyTo]);

  const details = views.find((v) => v.id === detailsId) ?? null;
  const historyView = views.find((v) => v.id === historyId) ?? null;
  const finishView = views.find((v) => v.id === finishId) ?? null;
  const noShowView = views.find((v) => v.id === noShowId) ?? null;
  const detailsRecord = useDemoRecord(details?.id);
  const finishRecord = useDemoRecord(finishView?.id);
  const filtersActive = Boolean(professionalId || specialty || roomId || query || dateKey !== today);

  /* ---------- ações (serviços do core via fluxo do módulo) ---------- */

  async function runFor<T>(v: AttendanceView, fn: () => Promise<T | undefined>): Promise<T | undefined> {
    setPendingId(v.id);
    try {
      return await fn();
    } finally {
      setPendingId(null);
    }
  }

  const handleCheckIn = (v: AttendanceView) => runFor(v, () => flow.checkIn.run(v.id));
  const handleStart = (v: AttendanceView) => runFor(v, () => flow.start.run(v.id));
  const handleFinish = (v: AttendanceView) => {
    flow.finish.clearError();
    setFinishId(v.id);
  };
  const handleNoShow = (v: AttendanceView) => setNoShowId(v.id);

  async function confirmFinish(note: DemoNote, confirmed: boolean): Promise<boolean> {
    if (!finishView) return false;
    const result = await runFor(finishView, () => flow.finish.run(finishView.id, { note, fictitiousConfirmed: confirmed }));
    return Boolean(result);
  }

  async function confirmNoShow() {
    if (!noShowView) return;
    await runFor(noShowView, () => flow.noShow.run(noShowView.id));
    setNoShowId(null);
  }

  async function saveRecord(note: DemoNote, confirmed: boolean): Promise<boolean> {
    if (!details) return false;
    return Boolean(await flow.record.run(details.id, note, confirmed));
  }

  function clearFilters() {
    setDateKey(today);
    setProfessionalId('');
    setSpecialty('');
    setRoomId('');
    setQuery('');
  }

  function exportList() {
    if (!rows.length) {
      toast({ tone: 'warning', title: 'Nada para exportar', description: 'Ajuste os filtros para incluir atendimentos.' });
      return;
    }
    const header = ['Data', 'Horário', 'Paciente', 'Profissional', 'Especialidade', 'Serviço', 'Sala', 'Etapa', 'Check-in', 'Início', 'Conclusão'];
    const lines = rows.map((v) =>
      [
        v.dateKey,
        formatTime(v.appointment.start),
        v.patient.name,
        v.professionalName,
        v.specialtyName,
        v.service,
        v.roomName,
        STAGE_GROUP_LABEL[STAGE_GROUP_ORDER.find((g) => g !== 'todos' && matchesGroup(v, g)) ?? 'todos'],
        v.checkInAt ? formatTime(v.checkInAt) : '',
        v.startedAt ? formatTime(v.startedAt) : '',
        v.finishedAt ? formatTime(v.finishedAt) : '',
      ]
        .map(csvCell)
        .join(';'),
    );
    const csv = `﻿# ${clinicName} — atendimentos (dados fictícios de demonstração) · gerado em ${nowIso()}\n${[header.map(csvCell).join(';'), ...lines].join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `atendimentos-${dateKey || 'todas-as-datas'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ tone: 'success', title: 'Lista exportada', description: `${plural(rows.length, 'atendimento', 'atendimentos')} em planilha (demonstração).` });
  }

  /* ---------- tabela ---------- */

  function rowAction(v: AttendanceView) {
    const av = availability(v);
    const busy = pendingId === v.id;
    if (av.finish) {
      return (
        <Button size="sm" leftIcon={CircleCheckBig} onClick={() => handleFinish(v)} aria-label={`Concluir atendimento de ${v.patient.name}`}>
          Concluir
        </Button>
      );
    }
    if (av.start) {
      return (
        <Button size="sm" leftIcon={Play} loading={busy} onClick={() => handleStart(v)} aria-label={`Iniciar atendimento de ${v.patient.name}`}>
          Iniciar
        </Button>
      );
    }
    if (av.checkIn) {
      return (
        <Button size="sm" variant="secondary" leftIcon={LogIn} loading={busy} onClick={() => handleCheckIn(v)} aria-label={`Registrar chegada de ${v.patient.name}`}>
          Check-in
        </Button>
      );
    }
    return (
      <Button size="sm" variant="ghost" onClick={() => select(v.id)} aria-label={`Ver detalhes do atendimento de ${v.patient.name}`}>
        Detalhes
      </Button>
    );
  }

  const columns: DataTableColumn<AttendanceView>[] = [
    {
      key: 'time',
      header: 'Horário',
      width: '96px',
      render: (v) => (
        <div className="flex flex-col">
          <span className="font-extrabold tabular-nums text-graphite-900">{formatTime(v.appointment.start)}</span>
          <span className="text-xs text-graphite-500">{dateKey ? `${v.appointment.durationMin} min` : formatDate(v.appointment.start, { day: '2-digit', month: '2-digit' })}</span>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Paciente',
      render: (v) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={v.patient.name} size="sm" tone="neutral" />
          <div className="min-w-0">
            <div className={cn('truncate font-semibold text-graphite-900', v.stage === 'cancelado' && 'line-through')}>{v.patient.name}</div>
            <div className="flex min-w-0 items-center gap-2 text-xs text-graphite-500">
              <SpecialtyTag specialty={v.specialty} variant="dot" />
              <span className="truncate">{v.service}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'professional',
      header: 'Profissional',
      hideBelow: 'md',
      render: (v) => <span className="text-graphite-700">{v.professionalName}</span>,
    },
    {
      key: 'room',
      header: 'Sala',
      hideBelow: 'lg',
      render: (v) => <span className="text-graphite-700">{v.roomName}</span>,
    },
    {
      key: 'checkin',
      header: 'Check-in',
      hideBelow: 'lg',
      render: (v) => (v.checkInAt ? <span className="tabular-nums text-graphite-700">{formatTime(v.checkInAt)}</span> : <span className="text-graphite-400">—</span>),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={v.appointment.status} />
          {v.stage === 'na_recepcao' && (
            <Badge tone="gold" icon={LogIn} size="sm">
              Na recepção
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      srOnlyHeader: true,
      width: '132px',
      render: (v) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
          {rowAction(v)}
        </div>
      ),
    },
  ];

  const tabItems = STAGE_GROUP_ORDER.map((g) => ({ id: g, label: STAGE_GROUP_LABEL[g], count: counts[g] }));
  const professionalOptions = professionals.map((p) => ({ value: p.id, label: p.name }));
  const specialtyOptions = specialties.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));
  const roomOptions = rooms.map((r) => ({ value: r.id, label: `${r.name} · ${r.label}` }));

  if (!canSeeAttendances) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Atendimentos fora do seu perfil"
        description="Seu perfil de acesso não inclui o acompanhamento de atendimentos. Fale com a administração da clínica se precisar."
      />
    );
  }

  const detailsAvailability = details ? availability(details) : null;
  const dayTitle = isToday ? 'Atendimentos de hoje' : dateKey ? `Atendimentos de ${formatDate(`${dateKey}T12:00:00`, { day: '2-digit', month: '2-digit' })}` : 'Todos os atendimentos';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dayTitle}
        subtitle={`${dateKey ? dayLabel(dateKey) : 'Todas as datas'}${isToday ? ` · agora ${formatTime(nowDate)}` : ''} · ${plural(indicators.total, 'atendimento programado', 'atendimentos programados')} · ${indicators.inProgress} em curso · ${indicators.waiting} na fila`}
        breadcrumb={isProfessional ? ['Portal', 'Atendimentos'] : ['Operação', 'Atendimentos']}
        actions={
          <>
            <Button variant="secondary" leftIcon={Download} onClick={exportList}>
              Exportar lista
            </Button>
            {onOpenAgenda && (
              <Button variant="secondary" leftIcon={CalendarCheck} onClick={onOpenAgenda}>
                Ver na agenda
              </Button>
            )}
          </>
        }
      />

      {/* Indicadores do dia selecionado */}
      <section aria-label="Indicadores de atendimentos" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard label={isToday ? 'Atendimentos do dia' : 'Atendimentos na data'} value={String(indicators.total)} icon={ClipboardList} meta={dateKey ? undefined : 'todas as datas'} />
        <KpiCard
          label="Concluídos"
          value={String(indicators.done)}
          icon={CheckCheck}
          tone="success"
          progress={indicators.total ? Math.round((indicators.done / indicators.total) * 100) : 0}
        />
        <KpiCard label="Em andamento" value={String(indicators.inProgress)} icon={Stethoscope} />
        <KpiCard
          label="Pendentes"
          value={String(indicators.pending)}
          icon={Hourglass}
          tone="warning"
          footer={<span className="text-xs text-graphite-500">{plural(indicators.waiting, 'na recepção', 'na recepção')} · {plural(indicators.noShow, 'falta', 'faltas')}</span>}
        />
      </section>

      {/* Agora na clínica */}
      <Card
        as="section"
        aria-labelledby="now-title"
        title={<span id="now-title">{isProfessional ? 'Agora no consultório' : 'Agora na clínica'}</span>}
        description={`Atualizado às ${formatTime(nowDate)}${isProfessional ? '' : ` · ${occupiedRooms} de ${activeRooms.length} salas ocupadas`}`}
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-graphite-900">
              <Stethoscope size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
              Em atendimento · {inProgress.length}
            </h4>
            {inProgress.length === 0 ? (
              <p className="rounded-md border border-dashed border-graphite-200 p-4 text-sm text-graphite-500">Nenhum atendimento em curso no momento.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {inProgress.map((v) => {
                  const startedAt = v.startedAt ?? v.appointment.start;
                  const elapsed = minutesBetween(startedAt, nowIso());
                  const over = elapsed > v.appointment.durationMin;
                  const av = availability(v);
                  return (
                    <li key={v.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4 sm:flex-row sm:items-center">
                      <div
                        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border border-gold-300 bg-gold-50 text-gold-700"
                        aria-hidden="true"
                      >
                        <span className="font-display text-2xl leading-none tabular-nums">{elapsed}</span>
                        <span className="text-[11px] font-bold">min</span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => select(v.id)}
                          className="truncate rounded-xs text-left font-bold text-graphite-900 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          {v.patient.name}
                        </button>
                        <p className="truncate text-xs text-graphite-600">
                          {v.service} · {v.professionalName}
                        </p>
                        <p className="text-xs text-graphite-500">
                          {v.roomName} · início {formatTime(startedAt)}
                        </p>
                        <ProgressBar
                          value={(elapsed / v.appointment.durationMin) * 100}
                          tone={over ? 'warning' : 'gold'}
                          size="sm"
                          label={`Em andamento há ${elapsed} min · previsto ${v.appointment.durationMin} min`}
                        />
                      </div>
                      {av.finish ? (
                        <Button size="sm" leftIcon={CircleCheckBig} onClick={() => handleFinish(v)} aria-label={`Concluir atendimento de ${v.patient.name}`}>
                          Concluir atendimento
                        </Button>
                      ) : (
                        <Badge tone="gold" icon={Stethoscope} size="sm">
                          Com o profissional
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-graphite-900">
              <Hourglass size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
              Fila de espera · {queue.length}
            </h4>
            {queue.length === 0 ? (
              <p className="rounded-md border border-dashed border-graphite-200 p-4 text-sm text-graphite-500">
                {isProfessional ? 'Nenhum paciente aguardando por você.' : 'Ninguém aguardando. Registre o check-in quando o paciente chegar.'}
              </p>
            ) : (
              <ol className="flex flex-col gap-3" aria-label="Fila de espera">
                {queue.map((v, i) => {
                  const checkIn = v.checkInAt ?? v.appointment.start;
                  const wait = minutesBetween(checkIn, nowIso());
                  const av = availability(v);
                  return (
                    <li key={v.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4 sm:flex-row sm:items-center">
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-graphite-100 text-graphite-700">
                        <span className="sr-only">Posição na fila: </span>
                        <span className="text-sm font-extrabold tabular-nums">{i + 1}º</span>
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => select(v.id)}
                          className="truncate rounded-xs text-left font-bold text-graphite-900 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          {v.patient.name}
                        </button>
                        <p className="truncate text-xs text-graphite-600">
                          {v.service} · {v.professionalName} · {v.roomName}
                        </p>
                        <p className={cn('text-xs', wait >= 15 ? 'font-semibold text-warning' : 'text-graphite-500')}>
                          Check-in às {formatTime(checkIn)} · aguardando há {wait} min · horário {formatTime(v.appointment.start)}
                        </p>
                        {av.busyWith && <p className="text-xs text-graphite-500">Profissional em atendimento com {av.busyWith}.</p>}
                      </div>
                      {av.start ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Play}
                          loading={pendingId === v.id}
                          onClick={() => handleStart(v)}
                          aria-label={`Iniciar atendimento de ${v.patient.name}`}
                        >
                          Iniciar atendimento
                        </Button>
                      ) : (
                        <Badge tone="neutral" icon={Clock} size="sm">
                          Aguardando profissional
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </Card>

      {/* Atendimentos do dia */}
      <Card as="section" padding="none" aria-labelledby="day-title">
        <div className="flex flex-col gap-4 px-4 pt-5 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="day-title" className="text-[15px] font-bold leading-6 text-graphite-900">
                {isToday ? 'Atendimentos do dia' : 'Atendimentos'}
              </h3>
              <p className="text-body-sm text-graphite-500" aria-live="polite">
                {plural(rows.length, 'atendimento exibido', 'atendimentos exibidos')} de {dayViews.length}
                {filtersActive ? ' · filtros ativos' : ''}
              </p>
            </div>
          </div>

          <Tabs items={tabItems} value={tab} onChange={(id) => setTab(id as StageGroup)} ariaLabel="Filtrar por status" idPrefix="att" />

          <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_1.3fr_auto] xl:items-end">
            <Input id="att-date" label="Data" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} className="h-9" />
            {!isProfessional && (
              <Select
                label="Profissional"
                controlSize="sm"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                options={[{ value: '', label: 'Todos os profissionais' }, ...professionalOptions]}
              />
            )}
            <Select
              label="Especialidade"
              controlSize="sm"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value as Specialty | '')}
              options={[{ value: '', label: 'Todas as especialidades' }, ...specialtyOptions]}
            />
            <Select
              label="Sala"
              controlSize="sm"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              options={[{ value: '', label: 'Todas as salas' }, ...roomOptions]}
            />
            <Select
              label="Ordenar por"
              controlSize="sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as AttendanceSort)}
              options={SORT_ORDER.map((s) => ({ value: s, label: SORT_LABEL[s] }))}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="att-search" className="text-body-sm font-semibold text-graphite-800">
                Buscar
              </label>
              <SearchInput
                id="att-search"
                aria-label="Buscar paciente, serviço ou profissional"
                placeholder="Paciente, serviço ou profissional…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <Button variant="ghost" size="sm" leftIcon={FilterX} onClick={clearFilters} disabled={!filtersActive}>
              Limpar filtros
            </Button>
          </div>
        </div>

        {/* relative + overflow-hidden: contém o cabeçalho sr-only da DataTable (evita rolagem horizontal da página). */}
        <div role="tabpanel" id={`att-panel-${tab}`} aria-labelledby={`att-tab-${tab}`} className="relative overflow-hidden rounded-b-md">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(v) => v.id}
            onRowClick={(v) => select(v.id)}
            isRowSelected={(v) => v.id === detailsId}
            caption={`${dayTitle} — ${STAGE_GROUP_LABEL[tab]}`}
            minWidth={560}
            empty={
              <EmptyState
                compact
                icon={ClipboardList}
                title="Nenhum atendimento aqui"
                description={
                  filtersActive && baseFiltered.length !== dayViews.length
                    ? 'Nenhum resultado com os filtros atuais.'
                    : `Não há atendimentos em “${STAGE_GROUP_LABEL[tab]}” ${isToday ? 'hoje' : 'nesta data'}.`
                }
                action={
                  filtersActive ? (
                    <Button variant="secondary" leftIcon={FilterX} onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </div>
      </Card>

      {/* Histórico da semana */}
      <Card
        as="section"
        title={isProfessional ? 'Meu histórico da semana' : 'Histórico da semana'}
        description={`Últimos atendimentos concluídos${isProfessional ? '' : ' · valores fictícios'}`}
        action={
          <Badge tone="neutral" icon={History}>
            {formatDate(`${historyFrom}T12:00:00`, { day: '2-digit' })} a {formatDate(`${historyTo}T12:00:00`, { day: '2-digit', month: '2-digit' })}
          </Badge>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBlock icon={CheckCheck} label="Concluídos" value={String(weekStats.finished)} />
          <StatBlock icon={Timer} label="Tempo médio" value={`${weekStats.avgDuration} min`} />
          <StatBlock icon={Clock} label="Espera média" value={`${weekStats.avgWait} min`} />
          <StatBlock icon={UserX} label="Faltas" value={String(weekStats.noShows)} />
        </div>
        {history.length === 0 ? (
          <EmptyState compact icon={ListChecks} title="Nenhum atendimento concluído" description="Os atendimentos concluídos nos últimos 7 dias aparecem aqui." />
        ) : (
          <ul className="flex flex-col divide-y divide-graphite-100 rounded-md border border-graphite-200">
            {history.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setHistoryId(v.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-graphite-50 focus-visible:bg-gold-50 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_#B5832F]"
                >
                  <span className="flex w-20 shrink-0 flex-col">
                    <span className="text-sm font-bold tabular-nums text-graphite-900">{formatDate(v.appointment.start, { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-xs tabular-nums text-graphite-500">{formatTime(v.appointment.start)}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-graphite-900">{v.patient.name}</span>
                    <span className="truncate text-xs text-graphite-500">
                      {v.service} · {v.professionalName}
                    </span>
                  </span>
                  <span className="hidden text-xs tabular-nums text-graphite-600 sm:inline">
                    {v.realDurationMin !== undefined ? durationLabel(v.realDurationMin).replace(' minutos', ' min').replace(' minuto', ' min') : `${v.appointment.durationMin} min`}
                  </span>
                  {v.price !== null && <span className="hidden w-24 text-right text-sm font-semibold tabular-nums text-graphite-800 md:inline">{formatCurrency(v.price)}</span>}
                  <StatusBadge status="concluida" size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Drawer de detalhes */}
      <Drawer
        open={detailsId !== null}
        onClose={() => select(null)}
        title="Detalhes do atendimento"
        description={details ? `${details.service} · ${formatTime(details.appointment.start)} · ${details.roomName}` : undefined}
        width={520}
        footer={
          details && detailsAvailability ? (
            <>
              {onOpenPatient && canOpenPatient && (
                <Button variant="secondary" rightIcon={ExternalLink} onClick={() => onOpenPatient(details.patient.id)}>
                  Abrir ficha do paciente
                </Button>
              )}
              <AttendanceFooterActions
                view={details}
                available={detailsAvailability}
                loadingId={pendingId}
                onCheckIn={handleCheckIn}
                onStart={handleStart}
                onFinish={handleFinish}
                onNoShow={handleNoShow}
              />
            </>
          ) : undefined
        }
      >
        {details && detailsAvailability ? (
          <AttendanceDetailsContent view={details}>
            {!detailsAvailability.start && !detailsAvailability.finish && (details.stage === 'na_recepcao' || details.stage === 'agendado' || details.stage === 'em_andamento') && (
              <p className="flex items-start gap-2 rounded-md border border-graphite-200 bg-graphite-50 p-3 text-xs text-graphite-600">
                <Stethoscope size={14} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0 text-gold-600" />
                <span>
                  {detailsAvailability.busyWith
                    ? `O profissional está em atendimento com ${detailsAvailability.busyWith}. Conclua-o antes de iniciar o próximo.`
                    : details.dateKey !== today && details.stage !== 'em_andamento'
                      ? 'O início do atendimento só é possível no dia da consulta.'
                      : detailsAvailability.conductHint}
                </span>
              </p>
            )}
            {!isProfessional && <AdminChecklist view={details} views={views} />}
            <DemoRecordPanel
              view={details}
              role={ctx.role}
              canEdit={detailsAvailability.record}
              record={detailsRecord}
              saving={flow.record.loading}
              errors={flow.record.error?.fields}
              onSave={saveRecord}
            />
          </AttendanceDetailsContent>
        ) : (
          <EmptyState
            compact
            icon={ShieldAlert}
            title="Atendimento não encontrado"
            description="O atendimento não existe ou não está disponível para o seu perfil de acesso."
          />
        )}
      </Drawer>

      {/* Conclusão com confirmação */}
      <FinishAttendanceDialog
        view={finishView}
        open={finishView !== null}
        onClose={() => setFinishId(null)}
        existingSummary={finishRecord?.summary}
        loading={flow.finish.loading}
        errors={flow.finish.error?.fields}
        onConfirm={confirmFinish}
      />

      <ConfirmDialog
        open={noShowView !== null}
        onClose={() => setNoShowId(null)}
        onConfirm={confirmNoShow}
        tone="danger"
        loading={flow.noShow.loading}
        title="Registrar falta?"
        description={
          noShowView
            ? `${noShowView.patient.name} não compareceu à consulta de ${formatTime(noShowView.appointment.start)} com ${noShowView.professionalName}. A consulta passa a "Faltou" na agenda.`
            : ''
        }
        confirmLabel="Registrar falta"
      />

      {/* Consulta rápida de um atendimento do histórico */}
      <AttendanceDetailsModal
        view={historyView}
        open={historyView !== null}
        onClose={() => setHistoryId(null)}
        extraAction={
          historyView ? (
            <Button
              variant="ghost"
              onClick={() => {
                setHistoryId(null);
                select(historyView.id);
              }}
            >
              Ver detalhes completos
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
