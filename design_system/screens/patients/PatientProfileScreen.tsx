import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  CreditCard,
  Download,
  FileText,
  History,
  IdCard,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserMinus,
  UserX,
  Wallet,
} from 'lucide-react';
import { ROLE_LABEL } from '@ds/access';
import {
  DEMO_NOW,
  useAccessContext,
  useActivity,
  useCan,
  useConversations,
  useQuery,
  useRooms,
  type ActivityEvent,
  type AppointmentRecord,
  type Attendance,
  type AttendanceStatus,
  type FinancialEntryRecord,
} from '@core';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiCard,
  PaymentStatusBadge,
  SegmentedControl,
  SpecialtyTag,
  StatusBadge,
  Tabs,
  useToast,
  type BadgeTone,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { PAYMENT_METHOD_LABEL } from '@ds/mocks/business';
import { CHANNEL_NAMES, formatCurrency, formatDate, formatTime } from '@ds/mocks/clinical';
import {
  buildPatientHistory,
  selectPatientAttendances,
  selectPatientDetail,
  selectPatientFinance,
} from './data/patientData';
import { useInitialLoading } from './data/useInitialLoading';
import { DeletePatientDialog, EditPatientModal, type PatientStatusAction } from './modals';

export interface PatientProfileScreenProps {
  patientId?: string;
  onBack?: () => void;
  /** Leva à Agenda para marcar consulta (exibido só a quem edita a agenda). */
  onNewAppointment?: (patientId: string) => void;
  /** Abre a Central WhatsApp (exibido só a perfis com acesso ao WhatsApp). */
  onOpenWhatsApp?: () => void;
}

type TabId = 'visao' | 'agendamentos' | 'historico' | 'atendimentos' | 'documentos' | 'financeiro' | 'dados';
type ApptView = 'proximas' | 'anteriores' | 'todas';

const DOCS = [
  { id: 'd1', name: 'Termo de consentimento (LGPD)', kind: 'PDF · 120 KB', date: '2024-02-10' },
  { id: 'd2', name: 'Orçamento de tratamento — demonstrativo', kind: 'PDF · 86 KB', date: '2026-09-02' },
  { id: 'd3', name: 'Recibo de pagamento — outubro', kind: 'PDF · 54 KB', date: '2026-10-19' },
  { id: 'd4', name: 'Declaração de comparecimento', kind: 'PDF · 48 KB', date: '2026-10-12' },
];

const DOT: Record<ActivityEvent['tone'], string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
  ai: 'bg-ai',
  neutral: 'bg-graphite-500',
  gold: 'bg-gold-500',
};

const ATTENDANCE_STATUS: Record<AttendanceStatus, { label: string; tone: BadgeTone }> = {
  aguardando: { label: 'Aguardando', tone: 'info' },
  em_andamento: { label: 'Em andamento', tone: 'warning' },
  finalizado: { label: 'Finalizado', tone: 'success' },
  faltou: { label: 'Faltou', tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};

function InfoItem({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-graphite-500">{label}</dt>
        <dd className="break-words text-sm text-graphite-900">{children}</dd>
      </div>
    </div>
  );
}

export function PatientProfileScreen({ patientId, onBack, onNewAppointment, onOpenWhatsApp }: PatientProfileScreenProps) {
  const { toast } = useToast();
  const ctx = useAccessContext();
  const loading = useInitialLoading();
  const lookup = useQuery((s, c) => selectPatientDetail(s, c, patientId), [patientId]);
  const attendances = useQuery((s, c) => (patientId ? selectPatientAttendances(s, c, patientId) : []), [patientId]);
  const finance = useQuery((s, c) => (patientId ? selectPatientFinance(s, c, patientId) : null), [patientId]);
  const activity = useActivity();
  const rooms = useRooms();
  const conversations = useConversations();
  const canEdit = useCan('pacientes_cadastro', 'editar');
  const canSchedule = useCan('agenda_clinica', 'editar') && Boolean(onNewAppointment);
  const canMessage = useCan('whatsapp', 'editar') && Boolean(onOpenWhatsApp);
  const canSeeAttendances = useCan('atendimentos', 'proprio');

  const [tab, setTab] = useState<TabId>('visao');
  const [apptView, setApptView] = useState<ApptView>('proximas');
  const [editOpen, setEditOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<PatientStatusAction | null>(null);
  const [deleted, setDeleted] = useState(false);

  const detail = lookup.status === 'ok' ? lookup.detail : null;
  const appts = useMemo(() => detail?.appointments ?? [], [detail]);
  const history = useMemo(
    () => (detail ? buildPatientHistory(detail.row, appts, attendances, detail.record ? activity : []) : []),
    [detail, appts, attendances, activity],
  );

  if (deleted || lookup.status !== 'ok' || !detail) {
    const forbidden = !deleted && lookup.status === 'forbidden';
    return (
      <Card>
        <EmptyState
          icon={forbidden ? Lock : UserX}
          title={deleted ? 'Paciente excluído' : forbidden ? 'Acesso não autorizado' : 'Paciente não encontrado'}
          description={
            deleted
              ? 'O cadastro foi removido desta demonstração.'
              : forbidden
                ? 'Este cadastro não faz parte do seu perfil de acesso. Somente pacientes vinculados aos seus atendimentos podem ser consultados.'
                : 'Verifique o link ou volte para a lista.'
          }
          action={
            onBack ? (
              <Button variant="secondary" leftIcon={ArrowLeft} onClick={onBack}>
                Voltar para pacientes
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  const { row, record } = detail;
  const nowMs = DEMO_NOW.getTime();
  const upcoming = appts.filter((a) => new Date(a.start).getTime() >= nowMs && !['cancelada', 'reagendada', 'faltou', 'concluida'].includes(a.status));
  const past = appts.filter((a) => new Date(a.start).getTime() < nowMs).reverse();
  const listed = apptView === 'proximas' ? upcoming : apptView === 'anteriores' ? past : [...appts].reverse();
  const counted = past.filter((a) => a.status !== 'cancelada' && a.status !== 'reagendada');
  const attendanceRate = counted.length
    ? Math.round((counted.filter((a) => a.status === 'concluida' || a.status === 'em_atendimento').length / counted.length) * 100)
    : 100;
  const cancellations = appts.filter((a) => a.status === 'cancelada').length;
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? '—';
  const conversation = conversations.find((c) => c.patientId === row.id);
  const preferredChannel = conversation ? 'WhatsApp' : appts[appts.length - 1]?.channel ? CHANNEL_NAMES[appts[appts.length - 1].channel!] : 'WhatsApp';
  const byAppointment = new Map(appts.map((a) => [a.id, a]));

  const tabs = [
    { id: 'visao', label: 'Visão geral', icon: LayoutGrid },
    { id: 'agendamentos', label: 'Agendamentos', icon: CalendarClock, count: appts.length },
    { id: 'historico', label: 'Histórico administrativo', icon: History },
    ...(canSeeAttendances ? [{ id: 'atendimentos', label: 'Atendimentos', icon: Stethoscope, count: attendances.length }] : []),
    ...(record ? [{ id: 'documentos', label: 'Documentos', icon: FileText, count: DOCS.length }] : []),
    ...(finance ? [{ id: 'financeiro', label: 'Financeiro', icon: Wallet }] : []),
    ...(record ? [{ id: 'dados', label: 'Dados cadastrais', icon: IdCard }] : []),
  ];
  const activeTab: TabId = tabs.some((t) => t.id === tab) ? tab : 'visao';

  const apptColumns = [
    {
      key: 'date',
      header: 'Data',
      render: (a: AppointmentRecord) => (
        <div className="tabular-nums">
          <div className="font-semibold text-graphite-900">{formatDate(a.start)}</div>
          <div className="text-xs text-graphite-500">
            {formatTime(a.start)} · {a.durationMin} min
          </div>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Serviço',
      render: (a: AppointmentRecord) => (
        <div className="min-w-0">
          <div className="truncate text-graphite-900">{a.service}</div>
          <SpecialtyTag specialty={a.specialty} variant="dot" />
        </div>
      ),
    },
    { key: 'prof', header: 'Profissional', hideBelow: 'md' as const, render: (a: AppointmentRecord) => a.professionalName },
    { key: 'room', header: 'Sala', hideBelow: 'lg' as const, render: (a: AppointmentRecord) => roomName(a.roomId) },
    {
      key: 'status',
      header: 'Status',
      render: (a: AppointmentRecord) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={a.status} />
          {a.status === 'cancelada' && a.cancelReason && <span className="text-xs text-graphite-500">{a.cancelReason}</span>}
        </div>
      ),
    },
  ];

  const attendanceColumns = [
    {
      key: 'date',
      header: 'Consulta',
      render: (at: Attendance) => {
        const a = byAppointment.get(at.appointmentId);
        return (
          <div className="min-w-0">
            <div className="font-semibold tabular-nums text-graphite-900">{a ? `${formatDate(a.start)} · ${formatTime(a.start)}` : '—'}</div>
            <div className="truncate text-xs text-graphite-500">{a?.service ?? 'Atendimento'}</div>
          </div>
        );
      },
    },
    { key: 'prof', header: 'Profissional', hideBelow: 'md' as const, render: (at: Attendance) => byAppointment.get(at.appointmentId)?.professionalName ?? '—' },
    {
      key: 'times',
      header: 'Chegada · início · fim',
      hideBelow: 'lg' as const,
      render: (at: Attendance) => (
        <span className="tabular-nums text-graphite-700">
          {[at.checkInAt, at.startedAt, at.finishedAt].map((t) => (t ? formatTime(t) : '—')).join(' · ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (at: Attendance) => (
        <Badge tone={ATTENDANCE_STATUS[at.status].tone} dot>
          {ATTENDANCE_STATUS[at.status].label}
        </Badge>
      ),
    },
  ];

  const financeColumns = [
    { key: 'date', header: 'Data', render: (f: FinancialEntryRecord) => <span className="tabular-nums">{formatDate(f.date)}</span> },
    { key: 'desc', header: 'Descrição', render: (f: FinancialEntryRecord) => f.description },
    { key: 'method', header: 'Forma', hideBelow: 'md' as const, render: (f: FinancialEntryRecord) => (f.method ? PAYMENT_METHOD_LABEL[f.method] : '—') },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right' as const,
      render: (f: FinancialEntryRecord) => <span className="font-semibold tabular-nums">{formatCurrency(f.amount)}</span>,
    },
    { key: 'status', header: 'Situação', render: (f: FinancialEntryRecord) => <PaymentStatusBadge status={f.status} /> },
  ];

  const restrictedNotice = (
    <div className="flex items-start gap-3 rounded-md border border-graphite-200 bg-graphite-50 p-4" role="note">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-white text-gold-600">
        <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="text-sm">
        <p className="font-bold text-graphite-900">Prontuário clínico restrito</p>
        <p className="text-graphite-600">
          Evoluções, diagnósticos e anexos clínicos são visíveis apenas ao profissional responsável. Este perfil exibe somente
          dados administrativos (perfil: {ROLE_LABEL[ctx.role]}).
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <div>
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={onBack}>
            Pacientes
          </Button>
        </div>
      )}

      {/* Cabeçalho do perfil */}
      <section className="relative overflow-hidden rounded-lg border border-graphite-200 bg-white p-5 shadow-sm md:p-6" aria-label="Resumo do paciente">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[1.5px] border-gold-300"
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={row.name} size="xl" ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-display-md text-graphite-900">{row.name}</h1>
              <Badge tone={row.status === 'ativo' ? 'success' : 'neutral'} dot>
                {row.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-graphite-500">
              {row.age} anos
              {row.city ? ` · ${row.city} – RS` : ''}
              {row.createdAt ? ` · paciente desde ${formatDate(row.createdAt, { month: 'long', year: 'numeric' })}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.tags.map((t) => (
                <Badge key={t} tone="neutral" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canMessage && (
              <Button variant="secondary" leftIcon={MessageCircle} onClick={() => onOpenWhatsApp?.()}>
                WhatsApp
              </Button>
            )}
            {canEdit && record && (
              <Button variant="secondary" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )}
            {canSchedule && (
              <Button
                leftIcon={CalendarPlus}
                disabled={row.status === 'inativo'}
                title={row.status === 'inativo' ? 'Reative o cadastro para agendar.' : undefined}
                onClick={() => onNewAppointment?.(row.id)}
              >
                Agendar
              </Button>
            )}
          </div>
        </div>
      </section>

      {row.status === 'inativo' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-graphite-200 bg-graphite-50 p-4 text-sm" role="status">
          <p className="text-graphite-700">
            <span className="font-bold text-graphite-900">Cadastro inativo.</span> O histórico foi preservado; o paciente não aparece entre os ativos.
          </p>
          {canEdit && record && (
            <Button variant="secondary" size="sm" leftIcon={RotateCcw} onClick={() => setStatusAction('reactivate')}>
              Reativar
            </Button>
          )}
        </div>
      )}

      <Tabs items={tabs} value={activeTab} onChange={(id) => setTab(id as TabId)} ariaLabel="Seções do perfil do paciente" />

      {activeTab === 'visao' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              loading={loading}
              label="Próxima consulta"
              value={upcoming[0] ? formatDate(upcoming[0].start, { day: '2-digit', month: '2-digit' }) : '—'}
              icon={CalendarClock}
              footer={upcoming[0] ? `${formatTime(upcoming[0].start)} · ${upcoming[0].professionalName}` : 'Sem agendamento futuro'}
            />
            <KpiCard loading={loading} label="Consultas registradas" value={String(appts.length)} icon={History} footer={`${cancellations} cancelada(s)`} />
            <KpiCard loading={loading} label="Assiduidade" value={`${attendanceRate}%`} icon={ShieldCheck} tone="success" progress={attendanceRate} />
            {row.balance !== undefined ? (
              <KpiCard
                loading={loading}
                label="Saldo em aberto"
                value={formatCurrency(row.balance)}
                icon={CreditCard}
                tone={row.balance > 0 ? 'warning' : 'gold'}
              />
            ) : (
              <KpiCard loading={loading} label="Última visita" value={row.lastVisit ? formatDate(row.lastVisit, { day: '2-digit', month: '2-digit' }) : '—'} icon={CalendarClock} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card
              className="lg:col-span-2"
              title="Próximos agendamentos"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setApptView('proximas');
                    setTab('agendamentos');
                  }}
                >
                  Ver todos
                </Button>
              }
            >
              {upcoming.length === 0 ? (
                <p className="text-sm text-graphite-500">Nenhum agendamento futuro.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-graphite-100">
                  {upcoming.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-graphite-900">{a.service}</p>
                        <p className="text-sm text-graphite-500">
                          {formatDate(a.start, { weekday: 'short', day: '2-digit', month: '2-digit' })} · {formatTime(a.start)} · {a.professionalName}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Contato">
              <dl className="flex flex-col gap-3">
                <InfoItem icon={Phone} label="WhatsApp">{row.phone}</InfoItem>
                {!row.minimal && <InfoItem icon={Mail} label="E-mail">{row.email ?? 'Não informado'}</InfoItem>}
                {!row.minimal && <InfoItem icon={MapPin} label="Cidade">{row.city} – RS</InfoItem>}
                {record?.adminNote && <InfoItem icon={NotebookPen} label="Observação administrativa">{record.adminNote}</InfoItem>}
              </dl>
            </Card>
          </div>
          {restrictedNotice}
        </div>
      )}

      {activeTab === 'agendamentos' && (
        <Card
          padding="none"
          title="Agendamentos"
          description="Histórico e próximos horários do paciente"
          action={
            <SegmentedControl
              ariaLabel="Período dos agendamentos"
              size="sm"
              value={apptView}
              onChange={(v) => setApptView(v as ApptView)}
              options={[
                { value: 'proximas', label: `Próximas (${upcoming.length})` },
                { value: 'anteriores', label: `Anteriores (${past.length})` },
                { value: 'todas', label: 'Todas' },
              ]}
            />
          }
        >
          <DataTable
            columns={apptColumns}
            rows={listed}
            rowKey={(a) => a.id}
            loading={loading}
            caption="Agendamentos do paciente"
            empty={
              <EmptyState
                icon={CalendarClock}
                title={apptView === 'proximas' ? 'Sem consultas futuras' : 'Sem agendamentos'}
                description={
                  apptView === 'proximas' ? 'Nenhuma consulta marcada a partir de hoje.' : 'Nenhuma consulta registrada neste período.'
                }
                action={
                  canSchedule && row.status === 'ativo' ? (
                    <Button variant="secondary" leftIcon={CalendarPlus} onClick={() => onNewAppointment?.(row.id)}>
                      Agendar consulta
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </Card>
      )}

      {activeTab === 'historico' && (
        <div className="flex flex-col gap-4">
          <Card title="Histórico administrativo" description="Eventos de cadastro, agendamento e comunicação — sem conteúdo clínico">
            {history.length === 0 ? (
              <p className="text-sm text-graphite-500">Nenhum evento registrado.</p>
            ) : (
              <ol className="flex flex-col">
                {history.map((e, i) => (
                  <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < history.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-graphite-100" />}
                    <span aria-hidden="true" className={cn('mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white', DOT[e.tone])} />
                    <div className="min-w-0">
                      <p className="text-sm text-graphite-700">
                        <span className="font-semibold text-graphite-900">{e.who}</span> {e.what}
                      </p>
                      <time dateTime={e.at} className="text-xs text-graphite-500">
                        {formatDate(e.at)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          {restrictedNotice}
        </div>
      )}

      {activeTab === 'atendimentos' && (
        <div className="flex flex-col gap-4">
          <Card padding="none" title="Atendimentos" description="Chegada, início e fim de cada atendimento — o conteúdo clínico fica no prontuário restrito">
            <DataTable
              columns={attendanceColumns}
              rows={attendances}
              rowKey={(at) => at.id}
              loading={loading}
              caption="Atendimentos do paciente"
              empty={<EmptyState icon={Stethoscope} title="Sem atendimentos" description="Nenhum atendimento registrado para este paciente." />}
            />
          </Card>
          {restrictedNotice}
        </div>
      )}

      {activeTab === 'documentos' && (
        <Card title="Documentos demonstrativos" description="Arquivos fictícios para fins de demonstração">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {DOCS.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-md border border-graphite-200 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-gold-50 text-gold-600">
                  <FileText size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-graphite-900">{d.name}</p>
                  <p className="text-xs text-graphite-500">
                    {d.kind} · {formatDate(d.date)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Download}
                  aria-label={`Baixar ${d.name}`}
                  onClick={() => toast({ tone: 'info', title: 'Download simulado', description: d.name })}
                >
                  <span className="hidden sm:inline">Baixar</span>
                </Button>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-md border border-dashed border-graphite-300 p-3 text-sm text-graphite-500">
              <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
              Laudos e anexos clínicos ficam no prontuário restrito.
            </li>
          </ul>
        </Card>
      )}

      {activeTab === 'financeiro' && finance && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard loading={loading} label="Total pago" value={formatCurrency(finance.totalPaid)} icon={Wallet} tone="success" />
            <KpiCard
              loading={loading}
              label="Em aberto"
              value={formatCurrency(row.balance ?? finance.open)}
              icon={CreditCard}
              tone={(row.balance ?? finance.open) > 0 ? 'warning' : 'gold'}
            />
            <KpiCard loading={loading} label="Lançamentos" value={String(finance.entries.length)} icon={FileText} />
          </div>
          <Card padding="none" title="Lançamentos" description="Valores fictícios de demonstração">
            <DataTable
              columns={financeColumns}
              rows={finance.entries}
              rowKey={(f) => f.id}
              loading={loading}
              caption="Lançamentos financeiros do paciente"
              empty={<EmptyState icon={Wallet} title="Sem lançamentos" description="Nenhum pagamento registrado para este paciente." />}
            />
          </Card>
        </div>
      )}

      {activeTab === 'dados' && record && (
        <Card
          title="Dados cadastrais"
          action={
            canEdit ? (
              <div className="flex gap-2">
                {row.status === 'ativo' ? (
                  <Button variant="ghost" size="sm" leftIcon={UserMinus} className="text-danger" onClick={() => setStatusAction('deactivate')}>
                    Desativar
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={() => setStatusAction('reactivate')}>
                    Reativar
                  </Button>
                )}
                {appts.length === 0 && (
                  <Button variant="ghost" size="sm" leftIcon={Trash2} className="text-danger" onClick={() => setStatusAction('delete')}>
                    Excluir
                  </Button>
                )}
                <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
                  Editar
                </Button>
              </div>
            ) : undefined
          }
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={IdCard} label="Nome completo">{record.name}</InfoItem>
            <InfoItem icon={CalendarClock} label="Data de nascimento">
              {formatDate(`${record.birthDate}T12:00:00`)} ({row.age} anos)
            </InfoItem>
            <InfoItem icon={Phone} label="WhatsApp / telefone">{record.phone}</InfoItem>
            <InfoItem icon={Mail} label="E-mail">{record.email ?? 'Não informado'}</InfoItem>
            <InfoItem icon={MapPin} label="Cidade">{record.city} – RS</InfoItem>
            <InfoItem icon={History} label="Cadastrado em">{formatDate(`${record.createdAt}T12:00:00`)}</InfoItem>
            <InfoItem icon={MessageCircle} label="Canal preferido">{preferredChannel}</InfoItem>
            <InfoItem icon={ShieldCheck} label="Consentimento LGPD">Registrado</InfoItem>
            <InfoItem icon={IdCard} label="Código do paciente">{record.id}</InfoItem>
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoItem icon={NotebookPen} label="Observação administrativa">{record.adminNote ?? 'Nenhuma'}</InfoItem>
            </div>
          </dl>
        </Card>
      )}

      {record && (
        <>
          <EditPatientModal open={editOpen} patient={record} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />
          <DeletePatientDialog
            open={statusAction !== null}
            patient={record}
            action={statusAction ?? 'deactivate'}
            onClose={() => setStatusAction(null)}
            onDone={(action) => {
              setStatusAction(null);
              if (action === 'delete') {
                if (onBack) onBack();
                else setDeleted(true);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
