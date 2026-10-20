import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Download,
  DoorOpen,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Users,
  Wallet,
} from 'lucide-react';
import type { ActivityEvent, Appointment } from '@ds/mocks/types';
import {
  Avatar,
  BarChart,
  Button,
  Card,
  DataTable,
  DropdownMenu,
  HorizontalBarList,
  IconButton,
  KpiCard,
  PageHeader,
  SegmentedControl,
  SpecialtyTag,
  StatusBadge,
  useToast,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import {
  SPECIALTY_HEX,
  SPECIALTY_NAMES,
  activityEvents,
  consultationsBySpecialty,
  formatCurrency,
  formatTime,
  getRoomName,
  getTodayAppointments,
  relativeTime,
  yearlyRevenue,
} from '@ds/mocks/clinical';

export type DashboardRoute = 'agenda' | 'pacientes' | 'atendimentos' | 'whatsapp' | 'financeiro';

export interface DashboardScreenProps {
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

const compactBRL = (v: number) =>
  `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;

export function DashboardScreen({ onNavigate, onNewAppointment }: DashboardScreenProps) {
  const { toast } = useToast();
  const [range, setRange] = useState('6');

  const revenueData = useMemo(() => {
    const months = yearlyRevenue.slice(-Number(range));
    return months.map((m, i) => ({ label: m.month, value: m.value, highlight: i === months.length - 1 }));
  }, [range]);

  const specialtyData = consultationsBySpecialty.map((s) => ({
    label: SPECIALTY_NAMES[s.specialty],
    value: s.count,
    color: SPECIALTY_HEX[s.specialty],
  }));
  const totalConsultations = consultationsBySpecialty.reduce((acc, s) => acc + s.count, 0);

  const upcoming = useMemo(
    () => getTodayAppointments().filter((a) => a.status !== 'cancelada' && a.status !== 'concluida').slice(0, 6),
    [],
  );

  const columns = [
    {
      key: 'time',
      header: 'Horário',
      width: '96px',
      render: (a: Appointment) => (
        <div className="tabular-nums">
          <div className="font-semibold text-graphite-900">{formatTime(a.start)}</div>
          <div className="text-xs text-graphite-500">{a.durationMin} min</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Paciente',
      render: (a: Appointment) => (
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
      render: (a: Appointment) => <span className="text-graphite-700">{a.professionalName}</span>,
    },
    {
      key: 'room',
      header: 'Sala',
      hideBelow: 'lg' as const,
      render: (a: Appointment) => <span className="text-graphite-700">{getRoomName(a.roomId)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a: Appointment) => <StatusBadge status={a.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right' as const,
      width: '72px',
      render: (a: Appointment) => (
        <DropdownMenu
          label={`Ações para ${a.patientName}`}
          align="end"
          trigger={<IconButton icon={MoreHorizontal} label={`Ações para ${a.patientName}`} size="sm" />}
          items={[
            { label: 'Ver na agenda', icon: Eye, onSelect: () => onNavigate?.('agenda') },
            {
              label: 'Enviar lembrete',
              icon: MessageCircle,
              onSelect: () =>
                toast({ tone: 'success', title: 'Lembrete enviado', description: `WhatsApp para ${a.patientName} (simulação).` }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bom dia, Camila"
        subtitle="24 consultas na agenda de hoje · 7 aguardam confirmação · 2 salas livres às 14h"
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={Download}
              onClick={() =>
                toast({ tone: 'info', title: 'Resumo exportado', description: 'PDF do dia gerado (demonstração).' })
              }
            >
              Exportar resumo
            </Button>
            <Button leftIcon={CalendarPlus} onClick={() => (onNewAppointment ? onNewAppointment() : onNavigate?.('agenda'))}>
              Novo agendamento
            </Button>
          </>
        }
      />

      <section aria-label="Indicadores do dia" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Consultas hoje"
          value="24"
          icon={CalendarCheck}
          delta={{ value: '+3', trend: 'up', caption: 'vs. segunda passada' }}
        />
        <KpiCard
          label="Pacientes ativos"
          value="1.284"
          icon={Users}
          delta={{ value: '+38', trend: 'up', caption: 'novos em outubro' }}
        />
        <KpiCard
          label="Faturamento · out"
          value={formatCurrency(48920).replace(/,00$/, '')}
          icon={Wallet}
          delta={{ value: '+12,4%', trend: 'up', caption: 'vs. setembro' }}
        />
        <KpiCard label="Taxa de ocupação" value="82%" icon={DoorOpen} progress={82} footer="7 salas" />
        <KpiCard
          label="A confirmar"
          value="7"
          icon={Clock}
          tone="warning"
          footer={
            <Button variant="link" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('whatsapp')}>
              Confirmar via WhatsApp
            </Button>
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title="Faturamento"
          description={`Receita recebida por mês · últimos ${range} meses`}
          action={<SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} ariaLabel="Período do gráfico" size="sm" />}
        >
          <BarChart
            data={revenueData}
            formatValue={compactBRL}
            height={240}
            ariaLabel={`Faturamento mensal dos últimos ${range} meses; outubro: ${formatCurrency(48920)}`}
          />
        </Card>
        <Card
          className="lg:col-span-2"
          title="Consultas por especialidade"
          description={`Outubro · ${totalConsultations} consultas`}
        >
          <HorizontalBarList data={specialtyData} formatValue={(v) => String(v)} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          padding="none"
          title="Próximos atendimentos"
          action={
            <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => onNavigate?.('agenda')}>
              Abrir agenda
            </Button>
          }
        >
          <DataTable
            columns={columns}
            rows={upcoming}
            rowKey={(a) => a.id}
            caption="Próximos atendimentos de hoje"
          />
        </Card>

        <Card title="Atividades recentes">
          <ol className="flex flex-col">
            {activityEvents.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < activityEvents.length - 1 && (
                  <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-graphite-100" />
                )}
                <span aria-hidden="true" className={cn('mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white', TONE_DOT[e.tone])} />
                <div className="min-w-0">
                  <p className="text-sm text-graphite-700">
                    <span className="font-semibold text-graphite-900">{e.who}</span> {e.what}
                  </p>
                  <time dateTime={e.at} className="text-xs text-graphite-500">
                    {relativeTime(e.at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
