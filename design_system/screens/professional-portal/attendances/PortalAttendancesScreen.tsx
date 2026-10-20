import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleCheckBig,
  ClipboardList,
  Clock,
  DoorOpen,
  FileLock2,
  Fingerprint,
  Hourglass,
  Lock,
  Play,
  Save,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Badge, Button, Card, Drawer, EmptyState, PageHeader, ProgressBar, SearchInput, StatusBadge, Tabs, Textarea, useToast } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { attendanceService, now as clockNow, todayKey as clockTodayKey, useAction, useAttendances } from '@core';
import { formatDate, formatTime } from '@ds/mocks/clinical';
import type { PortalAppointment, PortalAttendanceRecord } from '@ds/mocks/portal';
import {
  AccessDenied,
  AttendanceHistoryList,
  ScopeBadge,
  attendanceHistory,
  isWaiting,
  minutesBetween,
  normalize,
  plural,
  timeRange,
  useMyAppointments,
  useMyClinicalRecords,
  useMyPatientsById,
  useMyProfessional,
  useRestrictedMarkers,
  useRoomName,
  weekdayDate,
} from '../shared';
import { finishAttendanceWithReturn } from '../shared/portalActions';
import { CLINICAL_FIELDS, EMPTY_DRAFT, composeClinicalSummary, parseClinicalSummary, type ClinicalDraft, type ClinicalField } from './clinicalDraft';
import { FinishAttendanceModal } from './modals';
import type { FinishAttendanceResult } from './modals';

export interface PortalAttendancesScreenProps {
  /** Abre direto num atendimento (ex.: vindo do "Iniciar" do dashboard/agenda). */
  initialAppointmentId?: string;
  /** Com initialAppointmentId: inicia automaticamente se estiver aguardando e não houver outro em andamento. */
  autoStart?: boolean;
  /** Abre o paciente em Meus Pacientes. */
  onOpenPatient?: (patientId: string) => void;
  /** Volta para a lista (container limpa o id da URL). */
  onBackToList?: () => void;
}

type TabId = 'hoje' | 'historico';

const DEMO_PLACEHOLDER = '[Registro demonstrativo — não usar dados reais]';

function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function QueueSection({ title, icon: Icon, items, selectedId, onSelect, empty }: {
  title: string;
  icon: LucideIcon;
  items: PortalAppointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  empty?: string;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="flex items-center gap-2 text-overline uppercase text-graphite-500">
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
        {title} · {items.length}
      </h3>
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-graphite-200 px-3 py-2.5 text-body-sm text-graphite-500">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => {
            const sel = a.id === selectedId;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a.id)}
                  aria-current={sel ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus',
                    sel ? 'border-gold-500 bg-gold-50' : 'border-graphite-200 bg-white hover:bg-graphite-50',
                  )}
                >
                  <span className="w-11 shrink-0 text-body-sm font-extrabold tabular-nums text-graphite-900">{formatTime(a.start)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-bold text-graphite-900', a.status === 'cancelada' && 'line-through')}>{a.patientName}</span>
                    <span className="block truncate text-caption text-graphite-600">{a.service}</span>
                  </span>
                  <StatusBadge status={a.status} size="sm" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Meus Atendimentos — fila do dia (iniciar/finalizar via `attendanceService`), registro clínico
 * restrito e histórico autorizado. Somente atendimentos do profissional logado; o serviço recusa
 * (403) qualquer atendimento de outro profissional. Registro clínico DEMONSTRATIVO.
 */
export function PortalAttendancesScreen({ initialAppointmentId, autoStart = false, onOpenPatient, onBackToList }: PortalAttendancesScreenProps) {
  const { toast } = useToast();
  const { professional: prof } = useMyProfessional();
  const { byId: patientsById } = useMyPatientsById();
  const roomName = useRoomName();
  const mine = useMyAppointments();
  const attendances = useAttendances();
  const records = useMyClinicalRecords();
  const restricted = useRestrictedMarkers();
  const startAction = useAction(attendanceService.startAttendance);
  const finishAction = useAction(finishAttendanceWithReturn);
  const draftAction = useAction(attendanceService.saveClinicalRecord, { success: 'Rascunho salvo' });
  const noShowAction = useAction(attendanceService.markNoShow, { success: 'Falta registrada' });

  const todayKeyValue = clockTodayKey();
  const list = useMemo(() => mine.filter((a) => a.start.startsWith(todayKeyValue)), [mine, todayKeyValue]);
  const attendanceByAppt = useMemo(() => new Map(attendances.map((at) => [at.appointmentId, at])), [attendances]);
  const recordByAppt = useMemo(() => new Map(records.map((r) => [r.appointmentId, r])), [records]);
  const [drafts, setDrafts] = useState<Record<string, ClinicalDraft>>({});
  const [tab, setTab] = useState<TabId>('hoje');
  const [denied, setDenied] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState<PortalAttendanceRecord | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /** Relógio da demo: parte do "agora" do core (10:24) e avança em tempo real (cronômetro em segundos). */
  const clockAtMount = useRef(clockNow());
  const mountedAt = useRef(Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` força o recálculo a cada segundo
  const now = useMemo(() => new Date(clockAtMount.current.getTime() + (Date.now() - mountedAt.current)), [tick]);

  const inProgress = list.find((a) => a.status === 'em_atendimento');
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialAppointmentId && list.some((a) => a.id === initialAppointmentId)) return initialAppointmentId;
    return inProgress?.id ?? list.find((a) => isWaiting(a.status))?.id ?? list[0]?.id ?? null;
  });

  // Atendimento fora do escopo (URL/ID de outro profissional) → 403.
  useEffect(() => {
    if (!initialAppointmentId) return;
    const own = mine.find((a) => a.id === initialAppointmentId);
    if (!own) {
      setDenied(true);
      return;
    }
    if (!list.some((a) => a.id === initialAppointmentId)) {
      setTab('historico');
      return;
    }
    setSelectedId(initialAppointmentId);
    if (autoStart) {
      const target = list.find((a) => a.id === initialAppointmentId);
      if (target && isWaiting(target.status) && !list.some((a) => a.status === 'em_atendimento')) start(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAppointmentId]);

  const selected = list.find((a) => a.id === selectedId) ?? null;
  const selectedPatient = selected ? patientsById.get(selected.patientId) : undefined;

  const groups = useMemo(
    () => ({
      andamento: list.filter((a) => a.status === 'em_atendimento'),
      aguardando: list.filter((a) => isWaiting(a.status)),
      concluidos: list.filter((a) => a.status === 'concluida'),
      outros: list.filter((a) => a.status === 'cancelada' || a.status === 'faltou'),
    }),
    [list],
  );

  const history = useMemo(() => attendanceHistory(mine, records, clockAtMount.current, { restricted }), [mine, records, restricted]);
  const historyRows = useMemo(() => {
    const q = normalize(historyQuery.trim());
    return history.filter((r) => !q || normalize(`${r.patientName} ${r.service ?? ''}`).includes(q));
  }, [history, historyQuery]);
  const ownHistoryCount = history.filter((r) => !r.restricted).length;

  function select(id: string) {
    setSelectedId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  async function start(a: PortalAppointment) {
    const busy = list.find((x) => x.status === 'em_atendimento' && x.id !== a.id);
    if (busy) {
      toast({ tone: 'warning', title: 'Já existe um atendimento em andamento', description: `Finalize ${busy.patientName} antes de iniciar o próximo.` });
      return;
    }
    const at = await startAction.run(a.id);
    if (!at) return; // 403/409 já viraram toast
    setSelectedId(a.id);
    toast({
      tone: 'success',
      title: 'Atendimento iniciado',
      description: `${a.patientName} · ${roomName(a.roomId)} · ${at.startedAt ? formatTime(at.startedAt) : formatTime(now)}`,
    });
  }

  async function finish(result: FinishAttendanceResult) {
    const a = list.find((x) => x.id === result.appointmentId);
    if (!a) return;
    const draft = drafts[a.id] ?? parseClinicalSummary(recordByAppt.get(a.id)?.summary);
    const done = await finishAction.run(a.id, {
      summary: composeClinicalSummary(draft),
      patientName: a.patientName,
      suggestedDate: result.suggestedDate,
      hasNoteToReception: Boolean(result.noteToReception),
    });
    if (!done) return;
    setFinishOpen(false);
    toast({
      tone: 'success',
      title: 'Atendimento finalizado',
      description: result.suggestedDate
        ? `Retorno sugerido para ${weekdayDate(result.suggestedDate)} enviado à recepção.`
        : `${a.patientName} · sem retorno sugerido.`,
    });
    const nextWaiting = list.find((x) => x.id !== a.id && isWaiting(x.status));
    if (nextWaiting) setSelectedId(nextWaiting.id);
  }

  function setField(id: string, key: ClinicalField, value: string) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? parseClinicalSummary(recordByAppt.get(id)?.summary)), [key]: value } }));
  }

  async function saveDraft(id: string, draft: ClinicalDraft) {
    const summary = composeClinicalSummary(draft);
    if (!summary) {
      toast({ tone: 'warning', title: 'Nada para salvar', description: 'Preencha ao menos um campo do registro.' });
      return;
    }
    await draftAction.run(id, summary);
  }

  if (denied) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Meus atendimentos" breadcrumb={['Portal do Profissional', 'Meus atendimentos']} />
        <AccessDenied
          description="Este atendimento não está vinculado ao seu cadastro. Você só pode abrir os seus próprios atendimentos."
          backLabel="Voltar aos meus atendimentos"
          onBack={() => {
            setDenied(false);
            onBackToList?.();
          }}
        />
      </div>
    );
  }

  const selAttendance = selected ? attendanceByAppt.get(selected.id) : undefined;
  const selStarted = selAttendance?.startedAt;
  const selFinished = selAttendance?.finishedAt;
  const elapsedSec = selStarted ? Math.max(0, Math.floor((now.getTime() - new Date(selStarted).getTime()) / 1000)) : 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const editable = selected?.status === 'em_atendimento';
  const draft = selected ? (drafts[selected.id] ?? parseClinicalSummary(recordByAppt.get(selected.id)?.summary)) : EMPTY_DRAFT;
  const auditAt = `${formatDate(now, { day: '2-digit', month: '2-digit', year: 'numeric' })} ${formatTime(now)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meus atendimentos"
        breadcrumb={['Portal do Profissional', 'Meus atendimentos']}
        subtitle={`Hoje · agora ${formatTime(now)} · ${plural(list.length, 'atendimento', 'atendimentos')} · ${groups.aguardando.length} aguardando · ${groups.concluidos.length} concluídos`}
        actions={<ScopeBadge />}
      />

      <Tabs
        ariaLabel="Atendimentos"
        idPrefix="portal-att"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        items={[
          { id: 'hoje', label: 'Hoje', count: list.length, icon: ClipboardList },
          { id: 'historico', label: 'Histórico autorizado', count: ownHistoryCount, icon: FileLock2 },
        ]}
      />

      {tab === 'hoje' ? (
        <div role="tabpanel" id="portal-att-panel-hoje" aria-labelledby="portal-att-tab-hoje" className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Fila do dia */}
          <Card as="section" aria-label="Fila do dia" className="self-start" padding="md">
            <QueueSection title="Em andamento" icon={Timer} items={groups.andamento} selectedId={selectedId} onSelect={select} empty="Nenhum atendimento em curso." />
            <QueueSection title="Aguardando" icon={Hourglass} items={groups.aguardando} selectedId={selectedId} onSelect={select} empty="Ninguém aguardando." />
            <QueueSection title="Concluídos" icon={CircleCheckBig} items={groups.concluidos} selectedId={selectedId} onSelect={select} />
            <QueueSection title="Cancelados / faltas" icon={Clock} items={groups.outros} selectedId={selectedId} onSelect={select} />
          </Card>

          {/* Atendimento selecionado */}
          <div ref={panelRef} className="flex min-w-0 scroll-mt-24 flex-col gap-6">
            {!selected ? (
              <Card>
                <EmptyState icon={ClipboardList} title="Selecione um atendimento" description="Escolha um paciente da fila para ver os detalhes e o registro." />
              </Card>
            ) : (
              <>
                <Card as="section" aria-labelledby="att-title">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <Avatar name={selected.patientName} size="lg" tone="neutral" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 id="att-title" className="font-display text-[26px] font-semibold leading-8 text-graphite-900">
                          {selected.patientName}
                        </h2>
                        <StatusBadge status={selected.status} />
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-graphite-600">
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope size={14} strokeWidth={1.75} aria-hidden="true" />
                          {selected.service}
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                          {timeRange(selected)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DoorOpen size={14} strokeWidth={1.75} aria-hidden="true" />
                          {roomName(selected.roomId)}
                        </span>
                        {selectedPatient && <span>{selectedPatient.age} anos</span>}
                      </p>
                      {selectedPatient && selectedPatient.alerts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5" aria-label="Alertas de atendimento">
                          {selectedPatient.alerts.map((al) => (
                            <Badge key={al.id} tone={al.tone} dot size="sm">
                              {al.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {selected.notes && <p className="text-body-sm text-graphite-700">Recepção: {selected.notes}</p>}
                    </div>
                    {onOpenPatient && (
                      <Button variant="ghost" size="sm" onClick={() => onOpenPatient(selected.patientId)}>
                        Ver paciente
                      </Button>
                    )}
                  </div>

                  {selected.status === 'em_atendimento' && (
                    <div className="flex flex-col gap-4 rounded-md border border-gold-300 bg-gold-50 p-4 sm:flex-row sm:items-center">
                      <div className="flex flex-col">
                        <span className="text-overline uppercase text-gold-700">Em andamento</span>
                        <span className="font-display text-[40px] leading-none tabular-nums text-graphite-900" role="timer" aria-live="off" aria-label={`Tempo decorrido: ${elapsedMin} minutos`}>
                          {mmss(elapsedSec)}
                        </span>
                        <span className="text-caption text-graphite-600">desde {selStarted ? formatTime(selStarted) : '—'}</span>
                      </div>
                      <ProgressBar
                        className="min-w-0 flex-1"
                        value={(elapsedMin / selected.durationMin) * 100}
                        tone={elapsedMin > selected.durationMin ? 'warning' : 'gold'}
                        label={`${elapsedMin} de ${selected.durationMin} min previstos`}
                      />
                      <Button leftIcon={CircleCheckBig} onClick={() => setFinishOpen(true)}>
                        Finalizar atendimento
                      </Button>
                    </div>
                  )}

                  {isWaiting(selected.status) && (
                    <div className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-graphite-50 p-4 sm:flex-row sm:items-center">
                      <p className="min-w-0 flex-1 text-body-sm text-graphite-700">
                        {inProgress
                          ? `Finalize o atendimento de ${inProgress.patientName} para iniciar este.`
                          : selAttendance?.checkInAt
                            ? `Paciente na recepção desde ${formatTime(selAttendance.checkInAt)}. Inicie quando ele entrar na sala.`
                            : 'Quando o paciente entrar na sala, inicie o atendimento para liberar o registro.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          leftIcon={UserX}
                          onClick={() => noShowAction.run(selected.id)}
                          loading={noShowAction.loading}
                          disabled={Boolean(selAttendance?.checkInAt)}
                        >
                          Registrar falta
                        </Button>
                        <Button leftIcon={Play} onClick={() => start(selected)} disabled={Boolean(inProgress)} loading={startAction.loading}>
                          Iniciar atendimento
                        </Button>
                      </div>
                    </div>
                  )}

                  {selected.status === 'concluida' && (
                    <p className="rounded-md bg-graphite-50 px-4 py-3 text-body-sm text-graphite-700">
                      Finalizado às {selFinished ? formatTime(selFinished) : '—'}
                      {selStarted && selFinished ? ` · duração de ${minutesBetween(selStarted, new Date(selFinished))} min` : ''}.
                    </p>
                  )}
                </Card>

                {/* Registro clínico restrito */}
                <Card
                  as="section"
                  aria-labelledby="clinical-title"
                  title={
                    <span id="clinical-title" className="inline-flex items-center gap-2">
                      <Lock size={16} strokeWidth={2} aria-hidden="true" className="text-gold-600" />
                      Registro clínico — área restrita
                    </span>
                  }
                  description="Visível somente para você, profissional responsável por este atendimento."
                  action={<Badge tone="gold">Demonstrativo</Badge>}
                >
                  <p className="flex items-start gap-2 rounded-md border border-ai/20 bg-ai-bg px-4 py-3 text-body-sm text-ai">
                    <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <span>
                      <strong>LGPD — dado pessoal sensível.</strong> Registre apenas o necessário ao atendimento. Esta é uma demonstração:
                      não digite dados reais de pacientes.
                    </span>
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {CLINICAL_FIELDS.map((f) => (
                      <Textarea
                        key={f.key}
                        label={f.label}
                        rows={f.rows}
                        value={draft[f.key]}
                        onChange={(e) => setField(selected.id, f.key, e.target.value)}
                        placeholder={DEMO_PLACEHOLDER}
                        readOnly={!editable}
                        aria-readonly={!editable || undefined}
                        className={cn(!editable && 'bg-graphite-50')}
                      />
                    ))}
                  </div>
                  {!editable && (
                    <p className="text-caption text-graphite-500">
                      {isWaiting(selected.status)
                        ? 'A edição é liberada ao iniciar o atendimento.'
                        : 'Atendimento encerrado: registro somente leitura (correções geram nova versão auditada).'}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 border-t border-graphite-100 pt-4 sm:flex-row sm:items-center">
                    <p className="flex min-w-0 flex-1 items-start gap-2 text-caption text-graphite-500">
                      <Fingerprint size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
                      Auditoria: acesso de {prof?.name ?? 'profissional'} em {auditAt} · Chrome/Windows · registrado no log da clínica.
                    </p>
                    {editable && (
                      <Button variant="secondary" size="sm" leftIcon={Save} loading={draftAction.loading} onClick={() => saveDraft(selected.id, draft)}>
                        Salvar rascunho
                      </Button>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="portal-att-panel-historico" aria-labelledby="portal-att-tab-historico" className="flex flex-col gap-4">
          <Card as="section" aria-labelledby="hist-title">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <h2 id="hist-title" className="text-[15px] font-bold text-graphite-900">
                  Histórico autorizado
                </h2>
                <p className="text-body-sm text-graphite-500">
                  Seus atendimentos realizados. Atendimentos de outros profissionais com os mesmos pacientes aparecem bloqueados.
                </p>
              </div>
              <SearchInput
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Buscar paciente ou serviço…"
                aria-label="Buscar no histórico"
                className="md:w-[320px]"
              />
            </div>
            {historyRows.length === 0 ? (
              <EmptyState compact icon={ClipboardList} title="Nada encontrado" description="Nenhum atendimento corresponde à busca." />
            ) : (
              <AttendanceHistoryList records={historyRows} onSelect={setHistoryOpen} />
            )}
          </Card>
        </div>
      )}

      <FinishAttendanceModal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        appointment={selected}
        elapsedMin={elapsedMin}
        onConfirm={finish}
        loading={finishAction.loading}
      />

      <Drawer
        open={Boolean(historyOpen)}
        onClose={() => setHistoryOpen(null)}
        title={historyOpen?.patientName ?? ''}
        description={historyOpen ? `${weekdayDate(historyOpen.date)} · ${formatTime(historyOpen.date)} · ${historyOpen.service ?? ''}` : undefined}
      >
        {historyOpen && (
          <div className="flex flex-col gap-5">
            <ScopeBadge size="sm" />
            <dl className="grid grid-cols-2 gap-3 rounded-md bg-graphite-50 p-4 text-body-sm">
              <div>
                <dt className="text-caption text-graphite-500">Resultado</dt>
                <dd className="font-bold text-graphite-900">{historyOpen.outcome === 'faltou' ? 'Paciente faltou' : 'Concluído'}</dd>
              </div>
              <div>
                <dt className="text-caption text-graphite-500">Duração prevista</dt>
                <dd className="font-bold tabular-nums text-graphite-900">{historyOpen.durationMin} min</dd>
              </div>
            </dl>
            <section aria-labelledby="hist-record" className="flex flex-col gap-2">
              <h3 id="hist-record" className="flex items-center gap-2 text-body font-bold text-graphite-900">
                <Lock size={16} strokeWidth={2} aria-hidden="true" className="text-gold-600" />
                Registro clínico (somente leitura)
              </h3>
              <p className="rounded-md border border-dashed border-graphite-300 px-4 py-3 text-body-sm text-graphite-700">
                {historyOpen.summary ?? DEMO_PLACEHOLDER}
              </p>
              <p className="text-caption text-graphite-500">Conteúdo fictício para demonstração. Abertura registrada no log de auditoria.</p>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
