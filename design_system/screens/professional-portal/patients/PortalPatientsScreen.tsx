import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CalendarDays, Eye, History, Phone, Play, SearchX, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, Badge, Button, Card, DataTable, Drawer, EmptyState, FilterChip, PageHeader, SearchInput, SegmentedControl, StatusBadge } from '@ds/components';
import type { DataTableColumn } from '@ds/components';
import { formatTime, toDateKey } from '@ds/mocks/clinical';
import type { PortalPatient } from '@ds/mocks/portal';
import {
  PORTAL_NOW,
  PORTAL_PROFESSIONAL_ID,
  PORTAL_TODAY,
  getMyAppointmentsWithPatient,
  getMyAttendanceHistory,
  getMyPatients,
} from '@ds/mocks/portal';
import { addDays } from '../../agenda/agendaUtils';
import { AttendanceHistoryList, ScopeBadge, ScopeInfoCard, isWaiting, normalize, plural, weekdayDate } from '../shared';

export interface PortalPatientsScreenProps {
  /** Profissional logado (padrão 'prof-lauren'). */
  professionalId?: string;
  /** Abre direto a ficha de um paciente vinculado (ignorado se não estiver no escopo). */
  initialPatientId?: string;
  /** "Iniciar atendimento" na ficha, quando há consulta hoje (App navega para Meus Atendimentos). */
  onStartAttendance?: (appointmentId: string) => void;
}

type QuickFilter = 'todos' | 'hoje' | 'semana' | 'alertas' | 'sem_retorno';
type ViewMode = 'cards' | 'lista';

const FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'hoje', label: 'Consulta hoje' },
  { id: 'semana', label: 'Próximos 7 dias' },
  { id: 'alertas', label: 'Com alertas' },
  { id: 'sem_retorno', label: 'Sem retorno marcado' },
];

const todayKey = toDateKey(PORTAL_TODAY);
const weekLimit = toDateKey(addDays(PORTAL_TODAY, 7));

const MATCH: Record<QuickFilter, (p: PortalPatient) => boolean> = {
  todos: () => true,
  hoje: (p) => Boolean(p.nextVisit?.startsWith(todayKey)),
  semana: (p) => Boolean(p.nextVisit && p.nextVisit.slice(0, 10) < weekLimit),
  alertas: (p) => p.alerts.length > 0,
  sem_retorno: (p) => !p.nextVisit,
};

function visitLabel(iso?: string): string {
  if (!iso) return '—';
  return iso.startsWith(todayKey) ? `Hoje, ${formatTime(iso)}` : `${weekdayDate(iso)}, ${formatTime(iso)}`;
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-graphite-500" />
      <dt className="w-32 shrink-0 text-body-sm text-graphite-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-body-sm font-semibold text-graphite-900">{children}</dd>
    </div>
  );
}

/** Meus Pacientes — somente pacientes vinculados às consultas da profissional, com dados mínimos. */
export function PortalPatientsScreen({ professionalId = PORTAL_PROFESSIONAL_ID, initialPatientId, onStartAttendance }: PortalPatientsScreenProps) {
  const patients = useMemo(() => getMyPatients(professionalId), [professionalId]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('todos');
  const [mode, setMode] = useState<ViewMode>('cards');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPatientId && patients.some((p) => p.id === initialPatientId)) setOpenId(initialPatientId);
  }, [initialPatientId, patients]);

  const counts = useMemo(() => {
    const c = {} as Record<QuickFilter, number>;
    FILTERS.forEach((f) => {
      c[f.id] = patients.filter(MATCH[f.id]).length;
    });
    return c;
  }, [patients]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return patients.filter((p) => MATCH[filter](p) && (!q || normalize(`${p.name} ${p.treatment}`).includes(q)));
  }, [patients, filter, query]);

  const open = patients.find((p) => p.id === openId) ?? null;
  const openAppts = useMemo(() => (open ? getMyAppointmentsWithPatient(professionalId, open.id) : []), [open, professionalId]);
  const openHistory = useMemo(
    () => (open ? getMyAttendanceHistory(professionalId, { includeRestricted: true, patientId: open.id }) : []),
    [open, professionalId],
  );
  const upcoming = openAppts.filter((a) => (isWaiting(a.status) || a.status === 'em_atendimento') && new Date(a.start).getTime() + a.durationMin * 60000 > PORTAL_NOW.getTime()).reverse();
  const todayAppt = upcoming.find((a) => a.start.startsWith(todayKey));

  const columns: DataTableColumn<PortalPatient>[] = [
    {
      key: 'name',
      header: 'Paciente',
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} size="sm" tone="neutral" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-graphite-900">{p.name}</div>
            <div className="text-caption font-medium tabular-nums text-graphite-500">
              {p.age} anos · {p.phoneMasked}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'treatment', header: 'Tratamento', hideBelow: 'lg', render: (p) => <span className="text-body-sm text-graphite-700">{p.treatment}</span> },
    { key: 'next', header: 'Próxima consulta', render: (p) => <span className="whitespace-nowrap text-body-sm tabular-nums text-graphite-800">{visitLabel(p.nextVisit)}</span> },
    { key: 'last', header: 'Última', hideBelow: 'lg', render: (p) => <span className="whitespace-nowrap text-body-sm tabular-nums text-graphite-600">{visitLabel(p.lastVisit)}</span> },
    { key: 'visits', header: 'Com você', hideBelow: 'md', align: 'right', render: (p) => <span className="tabular-nums">{p.visitsWithMe}</span> },
    {
      key: 'alerts',
      header: 'Alertas',
      hideBelow: 'md',
      render: (p) =>
        p.alerts.length ? (
          <Badge tone={p.alerts.some((a) => a.tone === 'danger') ? 'danger' : 'warning'} icon={AlertTriangle} size="sm">
            {plural(p.alerts.length, 'alerta', 'alertas')}
          </Badge>
        ) : (
          <span className="text-graphite-400">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meus pacientes"
        breadcrumb={['Portal do Profissional', 'Meus pacientes']}
        subtitle={`${plural(patients.length, 'paciente vinculado', 'pacientes vinculados')} às suas consultas`}
        actions={<ScopeBadge />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="patients-list-title" className="flex min-w-0 flex-col gap-4">
          <h2 id="patients-list-title" className="sr-only">
            Lista de pacientes
          </h2>
          <div className="flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-3 shadow-sm md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou tratamento…"
                aria-label="Buscar entre meus pacientes"
                className="flex-1"
              />
              <SegmentedControl
                ariaLabel="Modo de exibição"
                value={mode}
                onChange={(v) => setMode(v as ViewMode)}
                options={[
                  { value: 'cards', label: 'Cartões' },
                  { value: 'lista', label: 'Lista' },
                ]}
              />
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtros rápidos">
              {FILTERS.map((f) => (
                <FilterChip key={f.id} label={f.label} count={counts[f.id]} active={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0" />
              ))}
            </div>
            <p className="text-caption text-graphite-500" aria-live="polite">
              {plural(rows.length, 'paciente exibido', 'pacientes exibidos')}
            </p>
          </div>

          {rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="Nenhum paciente encontrado"
                description="Ajuste a busca ou os filtros. Só aparecem pacientes com consultas suas."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setFilter('todos');
                    }}
                  >
                    Limpar busca e filtros
                  </Button>
                }
              />
            </Card>
          ) : mode === 'cards' ? (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {rows.map((p) => (
                <li key={p.id} className="flex min-w-0 flex-col gap-4 rounded-md border border-graphite-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} size="lg" tone="neutral" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-h4 text-graphite-900">{p.name}</h3>
                      <p className="text-body-sm tabular-nums text-graphite-600">
                        {p.age} anos · {p.phoneMasked}
                      </p>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-body-sm text-graphite-700">{p.treatment}</p>
                  <dl className="grid grid-cols-2 gap-3 rounded-sm bg-graphite-50 p-3 text-body-sm">
                    <div>
                      <dt className="text-caption text-graphite-500">Próxima</dt>
                      <dd className="font-bold tabular-nums text-graphite-900">{visitLabel(p.nextVisit)}</dd>
                    </div>
                    <div>
                      <dt className="text-caption text-graphite-500">Última</dt>
                      <dd className="font-bold tabular-nums text-graphite-900">{visitLabel(p.lastVisit)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="sr-only">Atendimentos com você</dt>
                      <dd className="text-caption text-graphite-600">{plural(p.visitsWithMe, 'atendimento com você', 'atendimentos com você')}</dd>
                    </div>
                  </dl>
                  {p.alerts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" aria-label="Alertas de atendimento">
                      {p.alerts.map((a) => (
                        <Badge key={a.id} tone={a.tone} dot size="sm">
                          {a.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button variant="secondary" leftIcon={Eye} onClick={() => setOpenId(p.id)} className="mt-auto" aria-label={`Ver ficha de ${p.name}`}>
                    Ver ficha
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Card padding="none">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(p) => p.id}
                onRowClick={(p) => setOpenId(p.id)}
                isRowSelected={(p) => p.id === openId}
                caption="Meus pacientes — somente vinculados às suas consultas"
                minWidth={520}
              />
            </Card>
          )}
        </section>

        <ScopeInfoCard className="self-start" />
      </div>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ''}
        description={open ? `${open.age} anos · ${plural(open.visitsWithMe, 'atendimento com você', 'atendimentos com você')}` : undefined}
        footer={
          todayAppt && onStartAttendance ? (
            <Button leftIcon={Play} onClick={() => onStartAttendance(todayAppt.id)}>
              {todayAppt.status === 'em_atendimento' ? 'Continuar atendimento' : `Iniciar atendimento (${formatTime(todayAppt.start)})`}
            </Button>
          ) : undefined
        }
      >
        {open && (
          <div className="flex flex-col gap-6">
            <ScopeBadge label="Dados mínimos · somente seus registros" size="sm" />
            <dl className="flex flex-col divide-y divide-graphite-100">
              <InfoRow icon={UserRound} label="Idade">
                {open.age} anos
              </InfoRow>
              <InfoRow icon={Phone} label="Contato">
                <span className="tabular-nums">{open.phoneMasked}</span>
                <span className="block text-caption font-normal text-graphite-500">Número completo com a recepção.</span>
              </InfoRow>
              <InfoRow icon={Stethoscope} label="Tratamento">
                {open.treatment}
              </InfoRow>
              <InfoRow icon={CalendarClock} label="Próxima consulta">
                {visitLabel(open.nextVisit)}
              </InfoRow>
              <InfoRow icon={CalendarDays} label="Última consulta">
                {visitLabel(open.lastVisit)}
              </InfoRow>
            </dl>

            {(open.alerts.length > 0 || open.adminNote) && (
              <section aria-labelledby="pp-alerts" className="flex flex-col gap-2">
                <h3 id="pp-alerts" className="text-body font-bold text-graphite-900">
                  Alertas e observações
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {open.alerts.map((a) => (
                    <Badge key={a.id} tone={a.tone} dot>
                      {a.label}
                    </Badge>
                  ))}
                </div>
                {open.adminNote && <p className="text-body-sm text-graphite-700">Recepção: {open.adminNote}</p>}
              </section>
            )}

            <section aria-labelledby="pp-upcoming" className="flex flex-col gap-2">
              <h3 id="pp-upcoming" className="text-body font-bold text-graphite-900">
                Próximas consultas com você
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-body-sm text-graphite-500">Nenhuma consulta futura. Retornos são agendados pela recepção.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {upcoming.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-graphite-200 px-3 py-2.5">
                      <span className="text-body-sm font-extrabold tabular-nums text-graphite-900">{visitLabel(a.start)}</span>
                      <span className="min-w-0 flex-1 truncate text-body-sm text-graphite-700">{a.service}</span>
                      <StatusBadge status={a.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="pp-history" className="flex flex-col gap-2">
              <h3 id="pp-history" className="flex items-center gap-2 text-body font-bold text-graphite-900">
                <History size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
                Histórico
              </h3>
              {openHistory.length === 0 ? (
                <p className="text-body-sm text-graphite-500">Ainda não há atendimentos concluídos.</p>
              ) : (
                <AttendanceHistoryList records={openHistory} hidePatient />
              )}
            </section>

            <p className="flex items-start gap-2 rounded-md bg-ai-bg px-4 py-3 text-body-sm text-ai">
              <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
              Saldo, CPF, e-mail e endereço não são exibidos no Portal do Profissional.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
