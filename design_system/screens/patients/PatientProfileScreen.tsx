import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  UserX,
  Wallet,
} from 'lucide-react';
import type { ActivityEvent, Appointment, Patient, PaymentStatus } from '@ds/mocks/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiCard,
  PaymentStatusBadge,
  SpecialtyTag,
  StatusBadge,
  Tabs,
  useToast,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import {
  CHANNEL_NAMES,
  DEMO_NOW,
  ageFrom,
  appointments,
  formatCurrency,
  formatDate,
  formatTime,
  getAppointmentsByPatient,
  getPatientById,
  getRoomName,
  patients,
} from '@ds/mocks/clinical';
import { DeletePatientDialog, EditPatientModal } from './modals';

export interface PatientProfileScreenProps {
  patientId?: string;
  onBack?: () => void;
  onNewAppointment?: (patientId: string) => void;
}

type TabId = 'visao' | 'agendamentos' | 'historico' | 'documentos' | 'financeiro' | 'dados';

interface FinanceRow {
  id: string;
  date: string;
  description: string;
  method: string;
  amount: number;
  status: PaymentStatus;
}

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

function financeFrom(appts: Appointment[], patient: Patient): FinanceRow[] {
  const methods = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];
  const rows: FinanceRow[] = appts
    .filter((a) => a.status === 'concluida' || a.status === 'em_atendimento')
    .map((a, i) => ({
      id: `fin-${a.id}`,
      date: a.start,
      description: a.service,
      method: methods[i % methods.length],
      amount: a.price,
      status: a.status === 'concluida' ? 'pago' : 'pendente',
    }));
  if (patient.balance > 0) {
    rows.push({
      id: 'fin-saldo',
      date: '2026-10-05T10:00:00',
      description: 'Parcela de pacote de sessões',
      method: 'Boleto',
      amount: patient.balance,
      status: 'atrasado',
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function historyFrom(appts: Appointment[], patient: Patient): ActivityEvent[] {
  const ev: ActivityEvent[] = [
    { id: 'h-cad', who: 'Recepção', what: 'cadastrou o paciente e registrou consentimento LGPD.', at: `${patient.createdAt}T09:00:00`, tone: 'gold' },
  ];
  appts.forEach((a) => {
    const when = `${formatDate(a.start)} às ${formatTime(a.start)}`;
    if (a.channel === 'assistente_ia')
      ev.push({ id: `h-ia-${a.id}`, who: 'Assistente IA', what: `agendou ${a.service} para ${when} via WhatsApp.`, at: a.start, tone: 'ai' });
    if (a.status === 'confirmada') ev.push({ id: `h-c-${a.id}`, who: 'Recepção', what: `confirmou presença em ${when}.`, at: a.start, tone: 'success' });
    if (a.status === 'reagendada') ev.push({ id: `h-r-${a.id}`, who: 'Recepção', what: `reagendou consulta para ${when}.`, at: a.start, tone: 'info' });
    if (a.status === 'cancelada') ev.push({ id: `h-x-${a.id}`, who: 'Paciente', what: `cancelou a consulta de ${when}.`, at: a.start, tone: 'danger' });
    if (a.status === 'faltou') ev.push({ id: `h-f-${a.id}`, who: 'Sistema', what: `registrou falta em ${when}.`, at: a.start, tone: 'warning' });
    if (a.status === 'concluida') ev.push({ id: `h-ok-${a.id}`, who: a.professionalName, what: `finalizou atendimento (${a.service}).`, at: a.start, tone: 'neutral' });
  });
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}

export function PatientProfileScreen({ patientId = 'pac-01', onBack, onNewAppointment }: PatientProfileScreenProps) {
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | undefined>(() => getPatientById(patientId) ?? patients[0]);
  const [tab, setTab] = useState<TabId>('visao');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    setPatient(getPatientById(patientId));
    setDeleted(false);
    setTab('visao');
  }, [patientId]);

  const appts = useMemo(() => (patient ? getAppointmentsByPatient(patient.id, appointments) : []), [patient]);
  const finance = useMemo(() => (patient ? financeFrom(appts, patient) : []), [appts, patient]);
  const history = useMemo(() => (patient ? historyFrom(appts, patient) : []), [appts, patient]);

  if (!patient || deleted) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title={deleted ? 'Paciente excluído' : 'Paciente não encontrado'}
          description={deleted ? 'O cadastro foi removido desta demonstração.' : 'Verifique o link ou volte para a lista.'}
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

  const upcoming = appts.filter((a) => new Date(a.start) >= DEMO_NOW && a.status !== 'cancelada').reverse();
  const past = appts.filter((a) => new Date(a.start) < DEMO_NOW);
  const totalPaid = finance.filter((f) => f.status === 'pago').reduce((s, f) => s + f.amount, 0);
  const attendance = past.length ? Math.round((past.filter((a) => a.status === 'concluida' || a.status === 'em_atendimento').length / past.length) * 100) : 100;

  const tabs = [
    { id: 'visao', label: 'Visão geral', icon: LayoutGrid },
    { id: 'agendamentos', label: 'Agendamentos', icon: CalendarClock, count: appts.length },
    { id: 'historico', label: 'Histórico administrativo', icon: History },
    { id: 'documentos', label: 'Documentos', icon: FileText, count: DOCS.length },
    { id: 'financeiro', label: 'Financeiro', icon: Wallet },
    { id: 'dados', label: 'Dados cadastrais', icon: IdCard },
  ];

  const apptColumns = [
    {
      key: 'date',
      header: 'Data',
      render: (a: Appointment) => (
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
      render: (a: Appointment) => (
        <div className="min-w-0">
          <div className="truncate text-graphite-900">{a.service}</div>
          <SpecialtyTag specialty={a.specialty} variant="dot" />
        </div>
      ),
    },
    { key: 'prof', header: 'Profissional', hideBelow: 'md' as const, render: (a: Appointment) => a.professionalName },
    { key: 'room', header: 'Sala', hideBelow: 'lg' as const, render: (a: Appointment) => getRoomName(a.roomId) },
    { key: 'status', header: 'Status', render: (a: Appointment) => <StatusBadge status={a.status} /> },
  ];

  const financeColumns = [
    { key: 'date', header: 'Data', render: (f: FinanceRow) => <span className="tabular-nums">{formatDate(f.date)}</span> },
    { key: 'desc', header: 'Descrição', render: (f: FinanceRow) => f.description },
    { key: 'method', header: 'Forma', hideBelow: 'md' as const, render: (f: FinanceRow) => f.method },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right' as const,
      render: (f: FinanceRow) => <span className="font-semibold tabular-nums">{formatCurrency(f.amount)}</span>,
    },
    { key: 'status', header: 'Situação', render: (f: FinanceRow) => <PaymentStatusBadge status={f.status} /> },
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
          dados administrativos (perfil: Administradora).
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
          <Avatar name={patient.name} size="xl" ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-display-md text-graphite-900">{patient.name}</h1>
              <Badge tone={patient.status === 'ativo' ? 'success' : 'neutral'} dot>
                {patient.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-graphite-500">
              {ageFrom(patient.birthDate)} anos · {patient.city} – RS · paciente desde {formatDate(patient.createdAt, { month: 'long', year: 'numeric' })}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {patient.tags.map((t) => (
                <Badge key={t} tone="neutral" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={MessageCircle}
              onClick={() => toast({ tone: 'success', title: 'Conversa aberta', description: `WhatsApp de ${patient.name} (simulação).` })}
            >
              WhatsApp
            </Button>
            <Button variant="secondary" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button
              leftIcon={CalendarPlus}
              onClick={() =>
                onNewAppointment
                  ? onNewAppointment(patient.id)
                  : toast({ tone: 'info', title: 'Abra a Agenda', description: 'Escolha um horário livre para agendar.' })
              }
            >
              Agendar
            </Button>
          </div>
        </div>
      </section>

      <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} ariaLabel="Seções do perfil do paciente" />

      {tab === 'visao' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Próxima consulta" value={upcoming[0] ? formatDate(upcoming[0].start, { day: '2-digit', month: '2-digit' }) : '—'} icon={CalendarClock} footer={upcoming[0] ? `${formatTime(upcoming[0].start)} · ${upcoming[0].professionalName}` : 'Sem agendamento futuro'} />
            <KpiCard label="Consultas registradas" value={String(appts.length)} icon={History} />
            <KpiCard label="Assiduidade" value={`${attendance}%`} icon={ShieldCheck} tone="success" progress={attendance} />
            <KpiCard label="Saldo em aberto" value={formatCurrency(patient.balance)} icon={CreditCard} tone={patient.balance > 0 ? 'warning' : 'gold'} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Próximos agendamentos" action={<Button variant="ghost" size="sm" onClick={() => setTab('agendamentos')}>Ver todos</Button>}>
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
                <InfoItem icon={Phone} label="WhatsApp">{patient.phone}</InfoItem>
                <InfoItem icon={Mail} label="E-mail">{patient.email ?? 'Não informado'}</InfoItem>
                <InfoItem icon={MapPin} label="Cidade">{patient.city} – RS</InfoItem>
              </dl>
            </Card>
          </div>
          {restrictedNotice}
        </div>
      )}

      {tab === 'agendamentos' && (
        <Card padding="none" title="Agendamentos" description="Histórico e próximos horários do paciente">
          <DataTable
            columns={apptColumns}
            rows={appts}
            rowKey={(a) => a.id}
            caption="Agendamentos do paciente"
            empty={<EmptyState icon={CalendarClock} title="Sem agendamentos" description="Este paciente ainda não tem consultas registradas." />}
          />
        </Card>
      )}

      {tab === 'historico' && (
        <div className="flex flex-col gap-4">
          <Card title="Histórico administrativo" description="Eventos de cadastro, agendamento e comunicação — sem conteúdo clínico">
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
          </Card>
          {restrictedNotice}
        </div>
      )}

      {tab === 'documentos' && (
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

      {tab === 'financeiro' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Total pago" value={formatCurrency(totalPaid)} icon={Wallet} tone="success" />
            <KpiCard label="Em aberto" value={formatCurrency(patient.balance)} icon={CreditCard} tone={patient.balance > 0 ? 'warning' : 'gold'} />
            <KpiCard label="Lançamentos" value={String(finance.length)} icon={FileText} />
          </div>
          <Card padding="none" title="Lançamentos" description="Valores fictícios de demonstração">
            <DataTable
              columns={financeColumns}
              rows={finance}
              rowKey={(f) => f.id}
              caption="Lançamentos financeiros do paciente"
              empty={<EmptyState icon={Wallet} title="Sem lançamentos" description="Nenhum pagamento registrado para este paciente." />}
            />
          </Card>
        </div>
      )}

      {tab === 'dados' && (
        <Card
          title="Dados cadastrais"
          action={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" leftIcon={Trash2} className="text-danger" onClick={() => setDeleteOpen(true)}>
                Excluir
              </Button>
              <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            </div>
          }
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={IdCard} label="Nome completo">{patient.name}</InfoItem>
            <InfoItem icon={CalendarClock} label="Data de nascimento">
              {formatDate(patient.birthDate)} ({ageFrom(patient.birthDate)} anos)
            </InfoItem>
            <InfoItem icon={Phone} label="WhatsApp / telefone">{patient.phone}</InfoItem>
            <InfoItem icon={Mail} label="E-mail">{patient.email ?? 'Não informado'}</InfoItem>
            <InfoItem icon={MapPin} label="Cidade">{patient.city} – RS</InfoItem>
            <InfoItem icon={History} label="Cadastrado em">{formatDate(patient.createdAt)}</InfoItem>
            <InfoItem icon={MessageCircle} label="Canal preferido">
              {appts[0]?.channel ? CHANNEL_NAMES[appts[0].channel] : 'WhatsApp'}
            </InfoItem>
            <InfoItem icon={ShieldCheck} label="Consentimento LGPD">Registrado</InfoItem>
          </dl>
        </Card>
      )}

      <EditPatientModal
        open={editOpen}
        patient={patient}
        onClose={() => setEditOpen(false)}
        onSave={(p) => {
          setPatient(p);
          setEditOpen(false);
          toast({ tone: 'success', title: 'Cadastro atualizado', description: p.name });
        }}
      />
      <DeletePatientDialog
        open={deleteOpen}
        patient={patient}
        onClose={() => setDeleteOpen(false)}
        onConfirm={(p) => {
          setDeleteOpen(false);
          setDeleted(true);
          toast({ tone: 'danger', title: 'Paciente excluído', description: p.name });
        }}
      />
    </div>
  );
}
