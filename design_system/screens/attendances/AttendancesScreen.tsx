import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCheck,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DoorOpen,
  Download,
  ExternalLink,
  FilterX,
  History,
  Hourglass,
  Lock,
  LogIn,
  Play,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserX,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@ds/mocks/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  Drawer,
  EmptyState,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  SpecialtyTag,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from '@ds/components';
import type { DataTableColumn } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import {
  ALL_SPECIALTIES,
  CHANNEL_NAMES,
  DEMO_NOW,
  ROOM_USAGE,
  SPECIALTY_NAMES,
  addMinutes,
  ageFrom,
  appointments as allAppointments,
  formatCurrency,
  formatDate,
  formatTime,
  getPatientById,
  getProfessionalById,
  getRoomName,
  getTodayAppointments,
  professionals,
  rooms,
  toLocalIso,
} from '@ds/mocks/clinical';
import { AttendanceDetailsModal, AttendanceFooterActions } from './modals';

export interface AttendancesScreenProps {
  /** Abre a ficha do paciente (navegação controlada pelo App). */
  onOpenPatient?: (patientId: string) => void;
  /** Abre a agenda do dia. */
  onOpenAgenda?: () => void;
}

/* ------------------------------------------------------------------ */
/* Tipos e constantes                                                   */
/* ------------------------------------------------------------------ */

type StatusTab = 'todos' | 'aguardando' | 'em_atendimento' | 'finalizados' | 'cancelados';

const WAITING: AppointmentStatus[] = ['agendada', 'confirmada', 'reagendada'];

const TAB_MATCH: Record<StatusTab, (s: AppointmentStatus) => boolean> = {
  todos: () => true,
  aguardando: (s) => WAITING.includes(s),
  em_atendimento: (s) => s === 'em_atendimento',
  finalizados: (s) => s === 'concluida',
  cancelados: (s) => s === 'cancelada' || s === 'faltou',
};

const TAB_LABEL: Record<StatusTab, string> = {
  todos: 'Todos',
  aguardando: 'Aguardando',
  em_atendimento: 'Em atendimento',
  finalizados: 'Finalizados',
  cancelados: 'Cancelados/faltas',
};

const TAB_ORDER: StatusTab[] = ['todos', 'aguardando', 'em_atendimento', 'finalizados', 'cancelados'];

/** Marcos de horário (ISO local) por atendimento — estado em memória da demonstração. */
interface Milestones {
  checkIn?: string;
  startedAt?: string;
  finishedAt?: string;
}

/** Estado inicial coerente com "agora" = 19/10/2026 09:10. */
const INITIAL_MILESTONES: Record<string, Milestones> = {
  'ag-101': { checkIn: '2026-10-19T07:52:00', startedAt: '2026-10-19T08:02:00', finishedAt: '2026-10-19T08:41:00' },
  'ag-102': { checkIn: '2026-10-19T08:09:00', startedAt: '2026-10-19T08:15:00', finishedAt: '2026-10-19T08:58:00' },
  'ag-103': { checkIn: '2026-10-19T08:51:00', startedAt: '2026-10-19T09:01:00' },
  'ag-104': { checkIn: '2026-10-19T09:04:00' },
  'ag-105': { checkIn: '2026-10-19T09:07:00' },
};

type ChecklistKey = 'cadastro' | 'lgpd' | 'pagamento' | 'retorno';

const CHECKLIST: { key: ChecklistKey; label: string; description: string }[] = [
  { key: 'cadastro', label: 'Cadastro conferido', description: 'Telefone, endereço e contato de emergência atualizados.' },
  { key: 'lgpd', label: 'Termo de consentimento (LGPD) assinado', description: 'Autorização para tratamento de dados de saúde.' },
  { key: 'pagamento', label: 'Pagamento registrado', description: 'Lançamento no financeiro (valores fictícios).' },
  { key: 'retorno', label: 'Retorno agendado', description: 'Próxima sessão marcada na agenda, se indicada.' },
];

function initialChecklist(a: Appointment): Record<ChecklistKey, boolean> {
  const done = a.status === 'concluida';
  const patient = getPatientById(a.patientId);
  return {
    cadastro: Boolean(patient?.email) || done,
    lgpd: patient ? !patient.tags.includes('Novo cadastro') : false,
    pagamento: done && (patient?.balance ?? 0) === 0,
    retorno: done && Boolean(patient?.nextVisit && patient.nextVisit > '2026-10-19'),
  };
}

/* ------------------------------------------------------------------ */
/* Histórico fictício da semana                                         */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  appointment: Appointment;
  finishedAt: string;
  realMin: number;
  waitMin: number;
}

function histEntry(
  id: string,
  date: string,
  time: string,
  patientId: string,
  professionalId: string,
  service: string,
  realMin: number,
  waitMin: number,
  price: number,
): HistoryEntry[] {
  const patient = getPatientById(patientId);
  const prof = getProfessionalById(professionalId);
  if (!patient || !prof) return [];
  const start = `${date}T${time}:00`;
  return [
    {
      appointment: {
        id,
        patientId,
        patientName: patient.name,
        professionalId,
        professionalName: prof.name,
        specialty: prof.specialty,
        service,
        roomId: prof.roomId ?? 'sala-7',
        start,
        durationMin: realMin,
        status: 'concluida',
        price,
        channel: 'whatsapp',
      },
      finishedAt: toLocalIso(addMinutes(start, realMin)),
      realMin,
      waitMin,
    },
  ];
}

/** Atendimentos finalizados nos últimos dias (fictícios). */
const WEEK_HISTORY: HistoryEntry[] = [
  ...histEntry('hist-01', '2026-10-17', '10:00', 'pac-09', 'prof-lauren', 'Profilaxia (limpeza)', 48, 4, 200),
  ...histEntry('hist-02', '2026-10-17', '08:30', 'pac-05', 'prof-bianca', 'Drenagem linfática', 62, 7, 180),
  ...histEntry('hist-03', '2026-10-16', '16:00', 'pac-04', 'prof-marina', 'Psicoterapia individual', 55, 3, 200),
  ...histEntry('hist-04', '2026-10-16', '14:30', 'pac-11', 'prof-julia', 'Consulta nutricional', 58, 9, 230),
  ...histEntry('hist-05', '2026-10-15', '10:00', 'pac-03', 'prof-rafael', 'Ajuste quiropráxico', 28, 5, 150),
  ...histEntry('hist-06', '2026-10-15', '09:00', 'pac-06', 'prof-ana', 'Atendimento podológico', 41, 6, 140),
  ...histEntry('hist-07', '2026-10-14', '15:30', 'pac-12', 'prof-gustavo', 'Sessão de fisioterapia', 50, 8, 160),
  ...histEntry('hist-08', '2026-10-13', '09:30', 'pac-02', 'prof-helena', 'Terapia fonoaudiológica', 44, 2, 180),
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function minutesBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - new Date(fromIso).getTime()) / 60000));
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                       */
/* ------------------------------------------------------------------ */

interface TimelineStep {
  id: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  done: boolean;
  tone?: 'danger' | 'warning';
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const last = i === steps.length - 1;
        return (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-graphite-200" />}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                s.tone === 'danger' && 'border-danger/30 bg-danger-bg text-danger',
                s.tone === 'warning' && 'border-warning/30 bg-warning-bg text-warning',
                !s.tone && s.done && 'border-gold-300 bg-gold-50 text-gold-600',
                !s.tone && !s.done && 'border-dashed border-graphite-300 bg-white text-graphite-400',
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn('text-sm font-semibold', s.done || s.tone ? 'text-graphite-900' : 'text-graphite-500')}>
                {s.label}
                {!s.done && !s.tone && <span className="sr-only"> (pendente)</span>}
              </p>
              <p className="text-xs text-graphite-500">{s.meta}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StatBlock({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-graphite-200 p-3">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gold-50 text-gold-600">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">{label}</p>
        <p className="font-display text-2xl leading-tight tabular-nums text-graphite-900">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export function AttendancesScreen({ onOpenPatient, onOpenAgenda }: AttendancesScreenProps) {
  const { toast } = useToast();
  const [list, setList] = useState<Appointment[]>(() => getTodayAppointments().map((a) => ({ ...a })));
  const [milestones, setMilestones] = useState<Record<string, Milestones>>(INITIAL_MILESTONES);
  const [checklists, setChecklists] = useState<Record<string, Record<ChecklistKey, boolean>>>({});
  const [now, setNow] = useState<Date>(DEMO_NOW);

  const [tab, setTab] = useState<StatusTab>('todos');
  const [professionalId, setProfessionalId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [roomId, setRoomId] = useState('');
  const [query, setQuery] = useState('');

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  /** Relógio da demonstração: avança 1 minuto a cada minuto real. */
  useEffect(() => {
    const t = window.setInterval(() => setNow((d) => new Date(d.getTime() + 60000)), 60000);
    return () => window.clearInterval(t);
  }, []);

  /* ---------- derivados ---------- */

  const baseFiltered = useMemo(() => {
    const q = normalize(query.trim());
    return list.filter(
      (a) =>
        (!professionalId || a.professionalId === professionalId) &&
        (!specialty || a.specialty === specialty) &&
        (!roomId || a.roomId === roomId) &&
        (!q || normalize(`${a.patientName} ${a.service} ${a.professionalName}`).includes(q)),
    );
  }, [list, professionalId, specialty, roomId, query]);

  const counts = useMemo(() => {
    const c = {} as Record<StatusTab, number>;
    TAB_ORDER.forEach((t) => {
      c[t] = baseFiltered.filter((a) => TAB_MATCH[t](a.status)).length;
    });
    return c;
  }, [baseFiltered]);

  const rows = useMemo(() => baseFiltered.filter((a) => TAB_MATCH[tab](a.status)), [baseFiltered, tab]);

  const inProgress = useMemo(() => list.filter((a) => a.status === 'em_atendimento'), [list]);
  const queue = useMemo(
    () =>
      list
        .filter((a) => WAITING.includes(a.status) && milestones[a.id]?.checkIn)
        .sort((a, b) => (milestones[a.id]?.checkIn ?? '').localeCompare(milestones[b.id]?.checkIn ?? '')),
    [list, milestones],
  );
  const occupiedRooms = new Set(inProgress.map((a) => a.roomId)).size;

  const history = useMemo<HistoryEntry[]>(() => {
    const today = list
      .filter((a) => a.status === 'concluida')
      .flatMap((a) => {
        const m = milestones[a.id];
        if (!m?.startedAt || !m.finishedAt) return [];
        return [
          {
            appointment: a,
            finishedAt: m.finishedAt,
            realMin: minutesBetween(m.startedAt, new Date(m.finishedAt)),
            waitMin: m.checkIn ? minutesBetween(m.checkIn, new Date(m.startedAt)) : 0,
          },
        ];
      });
    return [...today, ...WEEK_HISTORY].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  }, [list, milestones]);

  const weekStats = useMemo(() => {
    const n = history.length;
    const avg = (f: (h: HistoryEntry) => number) => (n ? Math.round(history.reduce((s, h) => s + f(h), 0) / n) : 0);
    const pastNoShows = allAppointments.filter((a) => a.status === 'faltou' && a.start >= '2026-10-13' && a.start < '2026-10-19').length;
    const noShows = pastNoShows + list.filter((a) => a.status === 'faltou').length;
    return { finished: n, avgDuration: avg((h) => h.realMin), avgWait: avg((h) => h.waitMin), noShows };
  }, [history, list]);

  const details = list.find((a) => a.id === detailsId) ?? null;
  const historyEntry = history.find((h) => h.appointment.id === historyId) ?? null;
  const filtersActive = Boolean(professionalId || specialty || roomId || query);

  /* ---------- ações (em memória) ---------- */

  function setMilestone(id: string, patch: Milestones) {
    setMilestones((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  }

  function setStatus(id: string, status: AppointmentStatus) {
    setList((l) => l.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function handleCheckIn(a: Appointment) {
    setMilestone(a.id, { checkIn: toLocalIso(now) });
    toast({ tone: 'info', title: 'Chegada registrada', description: `${a.patientName} está na recepção (${formatTime(now)}).` });
  }

  function handleStart(a: Appointment) {
    const busy = list.find((x) => x.status === 'em_atendimento' && x.professionalId === a.professionalId && x.id !== a.id);
    if (busy) {
      toast({
        tone: 'warning',
        title: 'Profissional em atendimento',
        description: `${a.professionalName} está atendendo ${busy.patientName}. Finalize antes de iniciar o próximo.`,
      });
      return;
    }
    const iso = toLocalIso(now);
    setMilestone(a.id, { checkIn: milestones[a.id]?.checkIn ?? iso, startedAt: iso });
    setStatus(a.id, 'em_atendimento');
    toast({ tone: 'success', title: 'Atendimento iniciado', description: `${a.patientName} · ${getRoomName(a.roomId)} · ${formatTime(now)}` });
  }

  function handleFinish(a: Appointment) {
    const started = milestones[a.id]?.startedAt;
    setMilestone(a.id, { finishedAt: toLocalIso(now) });
    setStatus(a.id, 'concluida');
    toast({
      tone: 'success',
      title: 'Atendimento finalizado',
      description: `${a.patientName}${started ? ` · duração ${plural(minutesBetween(started, now), 'minuto', 'minutos')}` : ''}.`,
    });
  }

  function checklistFor(a: Appointment): Record<ChecklistKey, boolean> {
    return checklists[a.id] ?? initialChecklist(a);
  }

  function toggleChecklist(a: Appointment, key: ChecklistKey) {
    const current = checklistFor(a);
    setChecklists((c) => ({ ...c, [a.id]: { ...current, [key]: !current[key] } }));
  }

  function clearFilters() {
    setProfessionalId('');
    setSpecialty('');
    setRoomId('');
    setQuery('');
  }

  /* ---------- linha do tempo ---------- */

  function timelineFor(a: Appointment): TimelineStep[] {
    const m = milestones[a.id] ?? {};
    const steps: TimelineStep[] = [
      {
        id: 'agendado',
        label: 'Consulta agendada',
        meta: a.channel ? `Origem: ${CHANNEL_NAMES[a.channel]} · ${formatTime(a.start)} reservado` : 'Origem não informada',
        icon: CalendarCheck,
        done: true,
      },
    ];
    if (a.status === 'cancelada') {
      steps.push({ id: 'cancelada', label: 'Consulta cancelada', meta: a.notes ?? 'Cancelamento registrado.', icon: XCircle, done: true, tone: 'danger' });
      return steps;
    }
    if (a.status === 'faltou') {
      steps.push({ id: 'faltou', label: 'Paciente não compareceu', meta: 'Falta registrada pela recepção.', icon: UserX, done: true, tone: 'warning' });
      return steps;
    }
    steps.push(
      {
        id: 'confirmada',
        label: 'Presença confirmada',
        meta:
          a.status === 'agendada'
            ? 'Aguardando confirmação do paciente'
            : a.channel === 'assistente_ia'
              ? 'Confirmada pelo Assistente IA'
              : 'Confirmada pela recepção',
        icon: CheckCheck,
        done: a.status !== 'agendada',
      },
      {
        id: 'checkin',
        label: 'Chegada na recepção',
        meta: m.checkIn ? `Check-in às ${formatTime(m.checkIn)}` : 'Pendente',
        icon: LogIn,
        done: Boolean(m.checkIn),
      },
      {
        id: 'inicio',
        label: 'Atendimento iniciado',
        meta: m.startedAt
          ? `${formatTime(m.startedAt)} · ${getRoomName(a.roomId)}${m.checkIn ? ` · espera de ${plural(minutesBetween(m.checkIn, new Date(m.startedAt)), 'minuto', 'minutos')}` : ''}`
          : 'Pendente',
        icon: Play,
        done: Boolean(m.startedAt),
      },
      {
        id: 'fim',
        label: 'Atendimento finalizado',
        meta:
          m.finishedAt && m.startedAt
            ? `${formatTime(m.finishedAt)} · duração de ${plural(minutesBetween(m.startedAt, new Date(m.finishedAt)), 'minuto', 'minutos')}`
            : 'Pendente',
        icon: CircleCheckBig,
        done: Boolean(m.finishedAt),
      },
    );
    return steps;
  }

  /* ---------- tabela ---------- */

  function rowAction(a: Appointment) {
    const m = milestones[a.id];
    if (a.status === 'em_atendimento') {
      return (
        <Button size="sm" leftIcon={CircleCheckBig} onClick={() => handleFinish(a)} aria-label={`Finalizar atendimento de ${a.patientName}`}>
          Finalizar
        </Button>
      );
    }
    if (WAITING.includes(a.status)) {
      return m?.checkIn ? (
        <Button size="sm" leftIcon={Play} onClick={() => handleStart(a)} aria-label={`Iniciar atendimento de ${a.patientName}`}>
          Iniciar
        </Button>
      ) : (
        <Button size="sm" variant="secondary" leftIcon={LogIn} onClick={() => handleCheckIn(a)} aria-label={`Registrar chegada de ${a.patientName}`}>
          Check-in
        </Button>
      );
    }
    return (
      <Button size="sm" variant="ghost" onClick={() => setDetailsId(a.id)} aria-label={`Ver detalhes do atendimento de ${a.patientName}`}>
        Detalhes
      </Button>
    );
  }

  const columns: DataTableColumn<Appointment>[] = [
    {
      key: 'time',
      header: 'Horário',
      width: '96px',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-extrabold tabular-nums text-graphite-900">{formatTime(a.start)}</span>
          <span className="text-xs text-graphite-500">{a.durationMin} min</span>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Paciente',
      render: (a) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={a.patientName} size="sm" tone="neutral" />
          <div className="min-w-0">
            <div className={cn('truncate font-semibold text-graphite-900', a.status === 'cancelada' && 'line-through')}>{a.patientName}</div>
            <div className="flex min-w-0 items-center gap-2 text-xs text-graphite-500">
              <SpecialtyTag specialty={a.specialty} variant="dot" />
              <span className="truncate">{a.service}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'professional',
      header: 'Profissional',
      hideBelow: 'md',
      render: (a) => <span className="text-graphite-700">{a.professionalName}</span>,
    },
    {
      key: 'room',
      header: 'Sala',
      hideBelow: 'lg',
      render: (a) => <span className="text-graphite-700">{getRoomName(a.roomId)}</span>,
    },
    {
      key: 'checkin',
      header: 'Check-in',
      hideBelow: 'lg',
      render: (a) => {
        const c = milestones[a.id]?.checkIn;
        return c ? <span className="tabular-nums text-graphite-700">{formatTime(c)}</span> : <span className="text-graphite-400">—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={a.status} />
          {WAITING.includes(a.status) && milestones[a.id]?.checkIn && (
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
      render: (a) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
          {rowAction(a)}
        </div>
      ),
    },
  ];

  const tabItems = TAB_ORDER.map((t) => ({ id: t, label: TAB_LABEL[t], count: counts[t] }));

  const professionalOptions = professionals.map((p) => ({ value: p.id, label: p.name }));
  const specialtyOptions = ALL_SPECIALTIES.map((s) => ({ value: s, label: SPECIALTY_NAMES[s] }));
  const roomOptions = rooms.map((r) => ({ value: r.id, label: `${r.name} · ${ROOM_USAGE[r.id] ?? ''}` }));

  /* ---------- detalhes (drawer) ---------- */

  const detailsPatient = details ? getPatientById(details.patientId) : undefined;
  const detailsChecklist = details ? checklistFor(details) : null;
  const checklistDone = detailsChecklist ? CHECKLIST.filter((c) => detailsChecklist[c.key]).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atendimentos de hoje"
        subtitle={`Segunda, 19/10 · agora ${formatTime(now)} · ${plural(list.length, 'atendimento programado', 'atendimentos programados')} · ${inProgress.length} em curso · ${queue.length} na fila`}
        breadcrumb={['Operação', 'Atendimentos']}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={Download}
              onClick={() => toast({ tone: 'info', title: 'Lista exportada', description: 'Atendimentos do dia em planilha (demonstração).' })}
            >
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

      {/* Agora na clínica */}
      <Card
        as="section"
        aria-labelledby="now-title"
        title={<span id="now-title">Agora na clínica</span>}
        description={`Atualizado às ${formatTime(now)} · ${occupiedRooms} de ${rooms.length} salas ocupadas`}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-graphite-900">
              <Stethoscope size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
              Em atendimento · {inProgress.length}
            </h4>
            {inProgress.length === 0 ? (
              <p className="rounded-md border border-dashed border-graphite-200 p-4 text-sm text-graphite-500">Nenhum atendimento em curso no momento.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {inProgress.map((a) => {
                  const startedAt = milestones[a.id]?.startedAt ?? a.start;
                  const elapsed = minutesBetween(startedAt, now);
                  const over = elapsed > a.durationMin;
                  return (
                    <li key={a.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4 sm:flex-row sm:items-center">
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
                          onClick={() => setDetailsId(a.id)}
                          className="truncate rounded-xs text-left font-bold text-graphite-900 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          {a.patientName}
                        </button>
                        <p className="truncate text-xs text-graphite-600">
                          {a.service} · {a.professionalName}
                        </p>
                        <p className="text-xs text-graphite-500">
                          {getRoomName(a.roomId)} · início {formatTime(startedAt)}
                        </p>
                        <ProgressBar
                          value={(elapsed / a.durationMin) * 100}
                          tone={over ? 'warning' : 'gold'}
                          size="sm"
                          label={`Em andamento há ${elapsed} min · previsto ${a.durationMin} min`}
                        />
                      </div>
                      <Button size="sm" leftIcon={CircleCheckBig} onClick={() => handleFinish(a)} aria-label={`Finalizar atendimento de ${a.patientName}`}>
                        Finalizar atendimento
                      </Button>
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
                Ninguém aguardando. Registre o check-in quando o paciente chegar.
              </p>
            ) : (
              <ol className="flex flex-col gap-3" aria-label="Fila de espera">
                {queue.map((a, i) => {
                  const checkIn = milestones[a.id]?.checkIn ?? a.start;
                  const wait = minutesBetween(checkIn, now);
                  return (
                    <li key={a.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4 sm:flex-row sm:items-center">
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-graphite-100 text-graphite-700">
                        <span className="sr-only">Posição na fila: </span>
                        <span className="text-sm font-extrabold tabular-nums">{i + 1}º</span>
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => setDetailsId(a.id)}
                          className="truncate rounded-xs text-left font-bold text-graphite-900 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          {a.patientName}
                        </button>
                        <p className="truncate text-xs text-graphite-600">
                          {a.service} · {a.professionalName} · {getRoomName(a.roomId)}
                        </p>
                        <p className={cn('text-xs', wait >= 15 ? 'font-semibold text-warning' : 'text-graphite-500')}>
                          Check-in às {formatTime(checkIn)} · aguardando há {wait} min · horário {formatTime(a.start)}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" leftIcon={Play} onClick={() => handleStart(a)} aria-label={`Iniciar atendimento de ${a.patientName}`}>
                        Iniciar atendimento
                      </Button>
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
                Atendimentos do dia
              </h3>
              <p className="text-body-sm text-graphite-500" aria-live="polite">
                {plural(rows.length, 'atendimento exibido', 'atendimentos exibidos')} de {list.length}
                {filtersActive ? ' · filtros ativos' : ''}
              </p>
            </div>
          </div>

          <Tabs items={tabItems} value={tab} onChange={(id) => setTab(id as StatusTab)} ariaLabel="Filtrar por status" idPrefix="att" />

          <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto] xl:items-end">
            <Select
              label="Profissional"
              controlSize="sm"
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              options={[{ value: '', label: 'Todos os profissionais' }, ...professionalOptions]}
            />
            <Select
              label="Especialidade"
              controlSize="sm"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              options={[{ value: '', label: 'Todas as especialidades' }, ...specialtyOptions]}
            />
            <Select
              label="Sala"
              controlSize="sm"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              options={[{ value: '', label: 'Todas as salas' }, ...roomOptions]}
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

        <div role="tabpanel" id={`att-panel-${tab}`} aria-labelledby={`att-tab-${tab}`}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(a) => a.id}
            onRowClick={(a) => setDetailsId(a.id)}
            isRowSelected={(a) => a.id === detailsId}
            caption={`Atendimentos do dia — ${TAB_LABEL[tab]}`}
            minWidth={560}
            empty={
              <EmptyState
                compact
                icon={ClipboardList}
                title="Nenhum atendimento aqui"
                description={filtersActive ? 'Nenhum resultado com os filtros atuais.' : `Não há atendimentos em “${TAB_LABEL[tab]}” hoje.`}
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
        title="Histórico da semana"
        description="Últimos atendimentos finalizados · valores fictícios"
        action={
          <Badge tone="neutral" icon={History}>
            13 a 19/10
          </Badge>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBlock icon={CheckCheck} label="Finalizados" value={String(weekStats.finished)} />
          <StatBlock icon={Timer} label="Tempo médio" value={`${weekStats.avgDuration} min`} />
          <StatBlock icon={Clock} label="Espera média" value={`${weekStats.avgWait} min`} />
          <StatBlock icon={UserX} label="Faltas" value={String(weekStats.noShows)} />
        </div>
        <ul className="flex flex-col divide-y divide-graphite-100 rounded-md border border-graphite-200">
          {history.map((h) => {
            const a = h.appointment;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setHistoryId(a.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-graphite-50 focus-visible:bg-gold-50 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_#B5832F]"
                >
                  <span className="flex w-20 shrink-0 flex-col">
                    <span className="text-sm font-bold tabular-nums text-graphite-900">{formatDate(a.start, { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-xs tabular-nums text-graphite-500">{formatTime(a.start)}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-graphite-900">{a.patientName}</span>
                    <span className="truncate text-xs text-graphite-500">
                      {a.service} · {a.professionalName}
                    </span>
                  </span>
                  <span className="hidden text-xs tabular-nums text-graphite-600 sm:inline">{h.realMin} min</span>
                  <span className="hidden w-24 text-right text-sm font-semibold tabular-nums text-graphite-800 md:inline">{formatCurrency(a.price)}</span>
                  <StatusBadge status="concluida" size="sm" />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Drawer de detalhes */}
      <Drawer
        open={details !== null}
        onClose={() => setDetailsId(null)}
        title="Detalhes do atendimento"
        description={details ? `${details.service} · ${formatTime(details.start)} · ${getRoomName(details.roomId)}` : undefined}
        width={520}
        footer={
          details ? (
            <>
              {onOpenPatient && (
                <Button variant="secondary" rightIcon={ExternalLink} onClick={() => onOpenPatient(details.patientId)}>
                  Abrir ficha do paciente
                </Button>
              )}
              <AttendanceFooterActions
                appointment={details}
                checkedIn={Boolean(milestones[details.id]?.checkIn)}
                onCheckIn={handleCheckIn}
                onStart={handleStart}
                onFinish={handleFinish}
              />
            </>
          ) : undefined
        }
      >
        {details && detailsChecklist && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar name={details.patientName} size="lg" ring />
              <div className="min-w-0">
                <p className="font-display text-2xl leading-tight text-graphite-900">{details.patientName}</p>
                <p className="text-sm text-graphite-500">
                  {detailsPatient ? `${ageFrom(detailsPatient.birthDate)} anos · ${detailsPatient.city}` : 'Paciente'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <StatusBadge status={details.status} />
                  <SpecialtyTag specialty={details.specialty} variant="chip" />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  { icon: Clock, k: 'Horário', v: `${formatTime(details.start)}–${formatTime(addMinutes(details.start, details.durationMin))} · ${details.durationMin} min` },
                  { icon: Stethoscope, k: 'Profissional', v: details.professionalName },
                  { icon: DoorOpen, k: 'Sala', v: `${getRoomName(details.roomId)} · ${ROOM_USAGE[details.roomId] ?? ''}` },
                  { icon: Wallet, k: 'Valor (demonstração)', v: formatCurrency(details.price) },
                ] as { icon: LucideIcon; k: string; v: string }[]
              ).map(({ icon: Icon, k, v }) => (
                <div key={k} className="flex items-start gap-3">
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-graphite-500">{k}</dt>
                    <dd className="text-sm text-graphite-900">{v}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <section aria-labelledby="att-timeline">
              <h3 id="att-timeline" className="mb-3 text-sm font-bold text-graphite-900">
                Linha do tempo
              </h3>
              <Timeline steps={timelineFor(details)} />
            </section>

            <section aria-labelledby="att-checklist">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h3 id="att-checklist" className="flex items-center gap-2 text-sm font-bold text-graphite-900">
                  <ClipboardCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                  Checklist administrativo
                </h3>
                <Badge tone={checklistDone === CHECKLIST.length ? 'success' : 'neutral'} size="sm">
                  {checklistDone} de {CHECKLIST.length} concluídos
                </Badge>
              </div>
              <div className="flex flex-col">
                {CHECKLIST.map((c) => (
                  <Checkbox
                    key={c.key}
                    id={`att-${details.id}-${c.key}`}
                    label={c.label}
                    description={c.description}
                    checked={detailsChecklist[c.key]}
                    onChange={() => toggleChecklist(details, c.key)}
                  />
                ))}
              </div>
            </section>

            <section aria-labelledby="att-clinical" aria-describedby="att-clinical-desc att-clinical-lgpd" className="rounded-md border border-graphite-200 bg-graphite-50 p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-white text-gold-600">
                  <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 id="att-clinical" className="text-sm font-bold text-graphite-900">
                    Registro clínico — acesso restrito a profissionais (demonstração)
                  </h3>
                  <p id="att-clinical-desc" className="text-xs text-graphite-500">
                    Visível e editável somente por {details.professionalName}. A recepção não tem acesso ao conteúdo.
                  </p>
                </div>
              </div>
              <fieldset disabled className="flex flex-col gap-3">
                <legend className="sr-only">Campos clínicos bloqueados para o seu perfil</legend>
                <Textarea id={`att-${details.id}-complaint`} label="Queixa principal" rows={2} placeholder="Acesso restrito ao profissional responsável" disabled />
                <Textarea id={`att-${details.id}-evolution`} label="Evolução do atendimento" rows={3} placeholder="Acesso restrito ao profissional responsável" disabled />
                <Textarea id={`att-${details.id}-plan`} label="Conduta / plano terapêutico" rows={2} placeholder="Acesso restrito ao profissional responsável" disabled />
              </fieldset>
              <p id="att-clinical-lgpd" className="mt-3 flex items-start gap-2 text-xs text-graphite-600">
                <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0 text-gold-600" />
                <span>
                  Dados de saúde são dados pessoais sensíveis (LGPD, Lei 13.709/2018, art. 11). O acesso é restrito ao profissional responsável e cada
                  visualização fica registrada em log de auditoria. Nesta demonstração nenhum dado clínico real é exibido.
                </span>
              </p>
            </section>
          </div>
        )}
      </Drawer>

      {/* Consulta rápida de um atendimento do histórico */}
      <AttendanceDetailsModal
        appointment={historyEntry?.appointment ?? null}
        open={historyEntry !== null}
        onClose={() => setHistoryId(null)}
        checkedIn
        startedAt={historyEntry ? toLocalIso(addMinutes(historyEntry.finishedAt, -historyEntry.realMin)) : undefined}
        onCheckIn={() => undefined}
        onStart={() => undefined}
        onFinish={() => undefined}
      />
    </div>
  );
}
