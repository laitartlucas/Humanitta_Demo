import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Clock,
  Download,
  DoorOpen,
  Eye,
  MessageCircle,
  MoreHorizontal,
  PieChart,
  ShieldOff,
  Users,
  Wallet,
} from 'lucide-react';
import type { ActivityEvent } from '@ds/mocks/types';
import {
  Avatar,
  BarChart,
  Button,
  Card,
  DataTable,
  DropdownMenu,
  EmptyState,
  HorizontalBarList,
  IconButton,
  KpiCard,
  PageHeader,
  SegmentedControl,
  Skeleton,
  SpecialtyTag,
  StatusBadge,
  useToast,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { formatCurrency, formatDate, formatTime, relativeTime, toDateKey } from '@ds/mocks/clinical';
import type { DashboardData, DashboardPeriod, UpcomingAppointment } from '@modules/dashboard/dashboardData';
import { comparisonCaption } from '@core';

export type DashboardRoute = 'agenda' | 'pacientes' | 'atendimentos' | 'whatsapp' | 'financeiro';

export interface DashboardScreenProps {
  /** Indicadores já filtrados pelo perfil (container). `null` = perfil sem acesso ao Dashboard. */
  data: DashboardData | null;
  /** Período ativo dos indicadores. */
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  /** Nome exibido na saudação (primeiro nome do usuário da sessão). */
  userName: string;
  /** "Agora" da demonstração (saudação e tempos relativos). */
  now: Date;
  /** Rotas que o perfil pode abrir; atalhos para outras ficam ocultos. */
  allowedRoutes: DashboardRoute[];
  /** Perfil pode criar agendamentos (`agenda_clinica ≥ editar`). */
  canCreateAppointment?: boolean;
  loading?: boolean;
  onNavigate?: (route: DashboardRoute) => void;
  onNewAppointment?: () => void;
}

const TONE_DOT: Record<ActivityEvent['tone'], string> = {
  success: 'bg-success',
  info: 'bg-violet',
  warning: 'bg-warning',
  danger: 'bg-danger',
  ai: 'bg-ai',
  neutral: 'bg-graphite-600',
  gold: 'bg-gold-500',
};

const RANGE_OPTIONS = [
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
];

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'dia', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

const KPI_COLS: Record<number, string> = {
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
};

const compactBRL = (v: number) =>
  `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;

const greeting = (d: Date) => (d.getHours() < 12 ? 'Bom dia' : d.getHours() < 18 ? 'Boa tarde' : 'Boa noite');

const monthName = (key: string) => formatDate(`${key}T12:00:00`, { month: 'long' });

/** Rótulos do período ativo (KPI, cartões e comparação). */
function periodCopy(data: DashboardData) {
  const month = monthName(data.range.from);
  const prevMonth = monthName(data.previousRange.from);
  const weekday = formatDate(`${data.range.from}T12:00:00`, { weekday: 'long' }).split('-')[0];
  switch (data.period) {
    case 'dia':
      return {
        consultas: 'Consultas hoje',
        faturamento: 'Faturamento · hoje',
        scope: 'Hoje',
        inline: 'na agenda de hoje',
        vs: `vs. ${weekday} passada`,
      };
    case 'semana':
      return {
        consultas: 'Consultas na semana',
        faturamento: 'Faturamento · semana',
        scope: 'Esta semana',
        inline: 'na agenda desta semana',
        vs: 'vs. semana passada',
      };
    default:
      return {
        consultas: 'Consultas no mês',
        faturamento: `Faturamento · ${formatDate(`${data.range.from}T12:00:00`, { month: 'short' }).replace('.', '')}`,
        scope: month.charAt(0).toUpperCase() + month.slice(1),
        inline: `na agenda de ${month}`,
        // Mês em andamento: compara 1–hoje com os mesmos dias do mês anterior e diz isso na legenda.
        vs: data.comparison.partial ? comparisonCaption(data.comparison) : `vs. ${prevMonth}`,
      };
  }
}

function countDelta(current: number, previous: number) {
  const diff = current - previous;
  return { value: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)}`, trend: diff < 0 ? ('down' as const) : ('up' as const) };
}

function percentDelta(current: number, previous: number) {
  if (previous <= 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  const text = Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return { value: `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${text}%`, trend: pct < 0 ? ('down' as const) : ('up' as const) };
}

export function DashboardScreen({
  data,
  period,
  onPeriodChange,
  userName,
  now,
  allowedRoutes,
  canCreateAppointment = false,
  loading = false,
  onNavigate,
  onNewAppointment,
}: DashboardScreenProps) {
  const { toast } = useToast();
  const [range, setRange] = useState('6');
  const canGo = (r: DashboardRoute) => allowedRoutes.includes(r) && Boolean(onNavigate);

  const revenueData = useMemo(() => {
    const months = (data?.revenueSeries ?? []).slice(-Number(range));
    return months.map((m, i) => ({ label: m.label, value: m.value, highlight: i === months.length - 1 }));
  }, [data?.revenueSeries, range]);

  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={ShieldOff}
          title="Dashboard indisponível para este perfil"
          description="Os indicadores da clínica são exibidos apenas para administração, recepção e financeiro."
        />
      </Card>
    );
  }

  const copy = periodCopy(data);
  const { appointments: ap } = data;
  const totalBySpecialty = data.bySpecialty.reduce((acc, s) => acc + s.value, 0);
  const lastRevenue = revenueData[revenueData.length - 1];
  const todayKey = toDateKey(now);

  const subtitle = [
    `${plural(ap.total, 'consulta', 'consultas')} ${copy.inline}`,
    `${ap.pending} ${ap.pending === 1 ? 'aguarda' : 'aguardam'} confirmação`,
    data.freeRooms
      ? `${plural(data.freeRooms.free, 'sala livre', 'salas livres')} às ${data.freeRooms.hour}h`
      : plural(ap.cancelled, 'cancelada', 'canceladas'),
  ].join(' · ');

  const columns = [
    {
      key: 'time',
      header: 'Horário',
      width: '96px',
      render: (a: UpcomingAppointment) => (
        <div className="tabular-nums">
          <div className="font-semibold text-graphite-900">{formatTime(a.start)}</div>
          <div className="text-xs text-graphite-500">
            {todayKey === a.start.slice(0, 10)
              ? `${a.durationMin} min`
              : formatDate(a.start, { day: '2-digit', month: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Paciente',
      render: (a: UpcomingAppointment) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={a.patientName} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-graphite-900">{a.patientName}</div>
            <SpecialtyTag specialty={a.specialty} variant="dot" />
          </div>
        </div>
      ),
    },
    {
      key: 'professional',
      header: 'Profissional',
      hideBelow: 'md' as const,
      render: (a: UpcomingAppointment) => <span className="text-graphite-700">{a.professionalName}</span>,
    },
    {
      key: 'room',
      header: 'Sala',
      hideBelow: 'lg' as const,
      render: (a: UpcomingAppointment) => <span className="text-graphite-700">{a.roomName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a: UpcomingAppointment) => <StatusBadge status={a.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right' as const,
      width: '72px',
      render: (a: UpcomingAppointment) => {
        const items = [
          ...(canGo('agenda') ? [{ label: 'Ver na agenda', icon: Eye, onSelect: () => onNavigate?.('agenda') }] : []),
          ...(canGo('whatsapp')
            ? [
                {
                  label: 'Enviar lembrete',
                  icon: MessageCircle,
                  onSelect: () =>
                    toast({ tone: 'success', title: 'Lembrete enviado', description: `WhatsApp para ${a.patientName} (simulação).` }),
                },
              ]
            : []),
        ];
        if (!items.length) return null;
        return (
          <DropdownMenu
            label={`Ações para ${a.patientName}`}
            align="end"
            trigger={<IconButton icon={MoreHorizontal} label={`Ações para ${a.patientName}`} size="sm" />}
            items={items}
          />
        );
      },
    },
  ];

  const kpis = [
    <KpiCard
      key="consultas"
      label={copy.consultas}
      value={ap.total.toLocaleString('pt-BR')}
      icon={CalendarCheck}
      loading={loading}
      delta={{ ...countDelta(data.comparedTotal, data.previousTotal), caption: copy.vs }}
      footer={
        <span className="text-graphite-600">
          {plural(ap.confirmed, 'confirmada', 'confirmadas')} · {plural(ap.cancelled, 'cancelada', 'canceladas')}
        </span>
      }
    />,
    data.patients && (
      <KpiCard
        key="pacientes"
        label="Pacientes cadastrados"
        value={data.patients.total.toLocaleString('pt-BR')}
        icon={Users}
        loading={loading}
        delta={{
          value: `+${data.patients.newInPeriod}`,
          trend: 'up',
          caption: data.period === 'mes' ? `novos em ${monthName(data.range.from)}` : 'novos no período',
        }}
      />
    ),
    data.revenue && (
      <KpiCard
        key="faturamento"
        label={copy.faturamento}
        value={formatCurrency(data.revenue.value).replace(/,00$/, '')}
        icon={Wallet}
        loading={loading}
        delta={(() => {
          const d = percentDelta(data.revenue.compared, data.revenue.previous);
          return d ? { ...d, caption: copy.vs } : undefined;
        })()}
        footer={
          <span className="text-graphite-600">
            {formatCurrency(data.revenue.receivable)} a receber · demonstração
          </span>
        }
      />
    ),
    <KpiCard
      key="ocupacao"
      label="Taxa de ocupação"
      value={`${data.occupancy.rate}%`}
      icon={DoorOpen}
      loading={loading}
      progress={data.occupancy.rate}
      footer={plural(data.occupancy.rooms, 'sala', 'salas')}
    />,
    <KpiCard
      key="confirmar"
      label="A confirmar"
      value={String(ap.pending)}
      icon={Clock}
      tone="warning"
      loading={loading}
      footer={
        canGo('whatsapp') ? (
          <Button variant="link" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('whatsapp')}>
            Confirmar via WhatsApp
          </Button>
        ) : (
          <span className="text-graphite-600">{plural(ap.noShow, 'falta', 'faltas')} no período</span>
        )
      }
    />,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting(now)}, ${userName}`}
        subtitle={subtitle}
        actions={
          <>
            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(v) => onPeriodChange(v as DashboardPeriod)}
              ariaLabel="Período dos indicadores"
            />
            <Button
              variant="secondary"
              leftIcon={Download}
              onClick={() =>
                toast({ tone: 'info', title: 'Resumo exportado', description: 'PDF do período gerado (demonstração).' })
              }
            >
              Exportar resumo
            </Button>
            {canCreateAppointment && (
              <Button leftIcon={CalendarPlus} onClick={() => (onNewAppointment ? onNewAppointment() : onNavigate?.('agenda'))}>
                Novo agendamento
              </Button>
            )}
          </>
        }
      />

      <section aria-label="Indicadores do período" className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', KPI_COLS[kpis.length])}>
        {kpis}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {data.revenueSeries && (
          <Card
            className="lg:col-span-3"
            title="Faturamento"
            description={`Receita recebida por mês · últimos ${range} meses`}
            action={<SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} ariaLabel="Período do gráfico" size="sm" />}
          >
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <BarChart
                data={revenueData}
                formatValue={compactBRL}
                height={240}
                ariaLabel={`Faturamento mensal dos últimos ${range} meses; ${lastRevenue?.label ?? ''}: ${formatCurrency(lastRevenue?.value ?? 0)}`}
              />
            )}
          </Card>
        )}
        <Card
          className={data.revenueSeries ? 'lg:col-span-2' : 'lg:col-span-5'}
          title="Consultas por especialidade"
          description={`${copy.scope} · ${plural(totalBySpecialty, 'consulta', 'consultas')}`}
        >
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : data.bySpecialty.length ? (
            <HorizontalBarList data={data.bySpecialty} formatValue={(v) => String(v)} />
          ) : (
            <EmptyState compact icon={PieChart} title="Sem consultas no período" description="Os agendamentos do período aparecem aqui por especialidade." />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          padding="none"
          title="Próximos atendimentos"
          action={
            canGo('agenda') ? (
              <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('agenda')}>
                Abrir agenda
              </Button>
            ) : undefined
          }
        >
          <DataTable
            columns={columns}
            rows={data.upcoming}
            rowKey={(a) => a.id}
            loading={loading}
            caption={`Próximos atendimentos · ${copy.scope.toLowerCase()}`}
            empty={
              <EmptyState
                compact
                icon={CalendarX}
                title="Nenhum atendimento por vir"
                description="Não há consultas agendadas ou confirmadas no restante do período."
              />
            }
          />
        </Card>

        <Card title="Atividades recentes">
          {data.activity.length ? (
            <ol className="flex flex-col">
              {data.activity.map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < data.activity.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-graphite-100" />
                  )}
                  <span aria-hidden="true" className={cn('mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white', TONE_DOT[e.tone])} />
                  <div className="min-w-0">
                    <p className="text-sm text-graphite-700">
                      <span className="font-semibold text-graphite-900">{e.who}</span> {e.what}
                    </p>
                    <time dateTime={e.at} className="text-xs text-graphite-500">
                      {relativeTime(e.at, now)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState compact icon={Activity} title="Sem atividades" description="As ações da equipe aparecem aqui assim que acontecerem." />
          )}
        </Card>
      </div>
    </div>
  );
}
