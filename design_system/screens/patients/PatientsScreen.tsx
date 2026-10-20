import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  UserRoundSearch,
} from 'lucide-react';
import { todayKey, useAppointments, useCan, usePatient, useQuery, type ID, type Specialty } from '@core';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  DropdownMenu,
  EmptyState,
  FilterChip,
  IconButton,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  SpecialtyTag,
  StatusBadge,
  useToast,
  type DropdownMenuItem,
} from '@ds/components';
import { SPECIALTY_NAMES, formatCurrency, formatDate, formatTime } from '@ds/mocks/clinical';
import {
  SORT_LABEL,
  countQuickFilters,
  filterOptions,
  filterPatients,
  patientsToCsv,
  selectPatientRows,
  selectPatientScope,
  type PatientRow,
  type QuickFilter,
  type SortKey,
} from './data/patientData';
import { useInitialLoading } from './data/useInitialLoading';
import { DeletePatientDialog, EditPatientModal, NewPatientModal, type PatientStatusAction } from './modals';

export interface PatientsScreenProps {
  /** Abre o perfil individual (o container navega para `/pacientes/:id`). */
  onOpenPatient?: (patientId: string) => void;
  /** Abre a Central WhatsApp (exibido só a perfis com acesso ao WhatsApp). */
  onOpenWhatsApp?: () => void;
}

const PAGE_SIZE = 8;

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PatientsScreen({ onOpenPatient, onOpenWhatsApp }: PatientsScreenProps) {
  const { toast } = useToast();
  const loading = useInitialLoading();
  const scope = useQuery(selectPatientScope);
  const list = useQuery(selectPatientRows);
  const canEdit = useCan('pacientes_cadastro', 'editar');
  const canMessage = useCan('whatsapp', 'editar') && Boolean(onOpenWhatsApp);
  const showBalance = list.some((p) => p.balance !== undefined);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('todos');
  const [specialty, setSpecialty] = useState<Specialty | ''>('');
  const [professionalId, setProfessionalId] = useState<ID | ''>('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SortKey>('nome-asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ id: ID; action: PatientStatusAction } | null>(null);

  const today = todayKey();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthName = formatDate(`${monthStart}T12:00:00`, { month: 'long' });

  const counts = useMemo(() => countQuickFilters(list, monthStart), [list, monthStart]);
  const options = useMemo(() => filterOptions(list), [list]);
  const filtered = useMemo(
    () =>
      filterPatients(list, {
        query,
        quick: filter,
        specialty: specialty || undefined,
        professionalId: professionalId || undefined,
        tag: tag || undefined,
        sort,
        monthStart,
      }),
    [list, query, filter, specialty, professionalId, tag, sort, monthStart],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id));

  const preview = list.find((p) => p.id === previewId) ?? null;
  const editing = usePatient(editId ?? undefined) ?? null;
  const statusPatient = list.find((p) => p.id === statusTarget?.id) ?? null;
  const previewAppts = useAppointments({ patientId: previewId ?? '—' });

  const activeFilters = [
    specialty && { key: 'esp', label: `Especialidade: ${SPECIALTY_NAMES[specialty]}`, clear: () => setSpecialty('') },
    professionalId && {
      key: 'prof',
      label: `Profissional: ${options.professionals.find((p) => p.id === professionalId)?.name ?? '—'}`,
      clear: () => setProfessionalId(''),
    },
    tag && { key: 'tag', label: `Etiqueta: ${tag}`, clear: () => setTag('') },
  ].filter((f): f is { key: string; label: string; clear: () => void } => Boolean(f));

  function resetPage<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
    };
  }

  function clearAll() {
    setQuery('');
    setFilter('todos');
    setSpecialty('');
    setProfessionalId('');
    setTag('');
    setPage(1);
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function togglePage() {
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPageSelected) pageRows.forEach((p) => n.delete(p.id));
      else pageRows.forEach((p) => n.add(p.id));
      return n;
    });
  }

  function exportList() {
    if (filtered.length === 0) {
      toast({ tone: 'warning', title: 'Nada para exportar', description: 'Ajuste a busca ou os filtros.' });
      return;
    }
    downloadCsv(patientsToCsv(filtered), `pacientes-demonstracao-${today}.csv`);
    toast({ tone: 'success', title: 'Planilha gerada', description: `${filtered.length} paciente(s) · dados fictícios.` });
  }

  function rowActions(p: PatientRow): DropdownMenuItem[] {
    const items: DropdownMenuItem[] = [{ label: 'Abrir perfil', icon: ExternalLink, onSelect: () => onOpenPatient?.(p.id) }];
    if (canEdit && !p.minimal) items.push({ label: 'Editar cadastro', icon: Pencil, onSelect: () => setEditId(p.id) });
    if (canMessage) items.push({ label: 'Enviar mensagem', icon: MessageCircle, onSelect: () => onOpenWhatsApp?.() });
    if (canEdit && !p.minimal) {
      items.push(
        p.status === 'ativo'
          ? { label: 'Desativar cadastro', icon: UserMinus, danger: true, onSelect: () => setStatusTarget({ id: p.id, action: 'deactivate' }) }
          : { label: 'Reativar cadastro', icon: RotateCcw, onSelect: () => setStatusTarget({ id: p.id, action: 'reactivate' }) },
      );
      if (p.appointmentCount === 0)
        items.push({ label: 'Excluir', icon: Trash2, danger: true, onSelect: () => setStatusTarget({ id: p.id, action: 'delete' }) });
    }
    return items;
  }

  const columns = [
    {
      key: 'select',
      header: 'Seleção',
      width: '48px',
      render: (p: PatientRow) => (
        <input
          type="checkbox"
          checked={selected.has(p.id)}
          onChange={() => toggle(p.id)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Selecionar ${p.name}`}
          className="h-4 w-4 cursor-pointer rounded-xs border-graphite-300 accent-gold-600 focus-visible:shadow-focus"
        />
      ),
    },
    {
      key: 'name',
      header: 'Paciente',
      render: (p: PatientRow) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-graphite-900">{p.name}</div>
            <div className="truncate text-xs text-graphite-500">
              {p.age} anos{p.city ? ` · ${p.city}` : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contato',
      hideBelow: 'md' as const,
      render: (p: PatientRow) => <span className="tabular-nums text-graphite-700">{p.phone}</span>,
    },
    {
      key: 'last',
      header: 'Última visita',
      hideBelow: 'lg' as const,
      render: (p: PatientRow) => <span className="text-graphite-700">{p.lastVisit ? formatDate(p.lastVisit) : '—'}</span>,
    },
    {
      key: 'next',
      header: 'Próxima consulta',
      hideBelow: 'lg' as const,
      render: (p: PatientRow) =>
        p.nextVisit ? <span className="text-graphite-700">{formatDate(p.nextVisit)}</span> : <span className="text-graphite-400">Sem agendamento</span>,
    },
    ...(showBalance
      ? [
          {
            key: 'balance',
            header: 'Saldo',
            align: 'right' as const,
            hideBelow: 'md' as const,
            render: (p: PatientRow) =>
              (p.balance ?? 0) > 0 ? (
                <span className="font-semibold tabular-nums text-warning">{formatCurrency(p.balance ?? 0)}</span>
              ) : (
                <span className="tabular-nums text-graphite-500">{formatCurrency(0)}</span>
              ),
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Situação',
      render: (p: PatientRow) => (
        <Badge tone={p.status === 'ativo' ? 'success' : 'neutral'} dot>
          {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right' as const,
      width: '64px',
      render: (p: PatientRow) => (
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
          <DropdownMenu
            label={`Ações para ${p.name}`}
            align="end"
            trigger={<IconButton icon={MoreHorizontal} label={`Ações para ${p.name}`} size="sm" />}
            items={rowActions(p)}
          />
        </div>
      ),
    },
  ];

  if (scope === 'nenhum') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Pacientes" breadcrumb={['Início', 'Pacientes']} />
        <Card>
          <EmptyState
            icon={Lock}
            title="Acesso restrito"
            description="O seu perfil não inclui o cadastro de pacientes. Fale com a administração da clínica se precisar deste acesso."
          />
        </Card>
      </div>
    );
  }

  const hasCriteria = Boolean(query || filter !== 'todos' || activeFilters.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pacientes"
        subtitle={`${counts.todos} cadastrados · ${counts.ativos} ativos · ${counts.inativos} inativos · ${counts.novos} novos em ${monthName} · dados fictícios`}
        breadcrumb={['Início', 'Pacientes']}
        actions={
          <>
            <Button variant="secondary" leftIcon={Download} onClick={exportList}>
              Exportar
            </Button>
            {canEdit && (
              <Button leftIcon={UserPlus} onClick={() => setNewOpen(true)}>
                Novo paciente
              </Button>
            )}
          </>
        }
      />

      {scope === 'proprio' && (
        <div className="flex items-start gap-3 rounded-md border border-graphite-200 bg-graphite-50 p-4 text-sm" role="note">
          <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-gold-600" />
          <p className="text-graphite-700">
            Você vê apenas os pacientes vinculados aos seus agendamentos, em dados mínimos (sem saldo, e-mail, endereço ou telefone completo).
          </p>
        </div>
      )}

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-graphite-100 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <SearchInput
                aria-label="Buscar pacientes"
                placeholder={scope === 'clinica' ? 'Buscar por nome, telefone, cidade ou código…' : 'Buscar por nome…'}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros rápidos">
              <FilterChip label="Todos" count={counts.todos} active={filter === 'todos'} onClick={() => resetPage(setFilter)('todos')} />
              <FilterChip label="Ativos" count={counts.ativos} active={filter === 'ativos'} onClick={() => resetPage(setFilter)('ativos')} />
              <FilterChip label="Inativos" count={counts.inativos} active={filter === 'inativos'} onClick={() => resetPage(setFilter)('inativos')} />
              {showBalance && (
                <FilterChip label="Saldo em aberto" count={counts.saldo} active={filter === 'saldo'} onClick={() => resetPage(setFilter)('saldo')} />
              )}
              {scope === 'clinica' && (
                <FilterChip label="Novos" count={counts.novos} active={filter === 'novos'} onClick={() => resetPage(setFilter)('novos')} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              aria-label="Filtrar por especialidade"
              controlSize="sm"
              value={specialty}
              onChange={(e) => resetPage(setSpecialty)(e.target.value as Specialty | '')}
              options={[{ value: '', label: 'Todas as especialidades' }, ...options.specialties.map((s) => ({ value: s, label: SPECIALTY_NAMES[s] }))]}
            />
            <Select
              aria-label="Filtrar por profissional"
              controlSize="sm"
              value={professionalId}
              onChange={(e) => resetPage(setProfessionalId)(e.target.value)}
              options={[{ value: '', label: 'Todos os profissionais' }, ...options.professionals.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <Select
              aria-label="Filtrar por etiqueta"
              controlSize="sm"
              value={tag}
              disabled={options.tags.length === 0}
              onChange={(e) => resetPage(setTag)(e.target.value)}
              options={[{ value: '', label: 'Todas as etiquetas' }, ...options.tags.map((t) => ({ value: t, label: t }))]}
            />
            <Select
              aria-label="Ordenar pacientes"
              controlSize="sm"
              value={sort}
              onChange={(e) => resetPage(setSort)(e.target.value as SortKey)}
              options={(Object.keys(SORT_LABEL) as SortKey[])
                .filter((k) => scope === 'clinica' || !k.startsWith('cadastro'))
                .map((k) => ({ value: k, label: `Ordenar: ${SORT_LABEL[k]}` }))}
            />
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
              <span className="text-xs font-semibold text-graphite-500">Filtros ativos</span>
              {activeFilters.map((f) => (
                <FilterChip key={f.key} label={f.label} active onClick={f.clear} onRemove={f.clear} />
              ))}
              <Button variant="link" size="sm" onClick={clearAll}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        {pageRows.length > 0 && !loading && (
          <div className="flex flex-wrap items-center gap-3 border-b border-graphite-100 bg-graphite-50 px-4 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-graphite-700">
              <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} className="h-4 w-4 cursor-pointer accent-gold-600" />
              Selecionar página
            </label>
            <span className="text-graphite-500" aria-live="polite">
              {filtered.length} de {counts.todos} paciente{counts.todos === 1 ? '' : 's'} · {SORT_LABEL[sort]}
            </span>
            {selected.size > 0 && (
              <>
                <span className="font-semibold text-graphite-900" aria-live="polite">
                  {selected.size} selecionado{selected.size > 1 ? 's' : ''}
                </span>
                {canMessage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={MessageCircle}
                    onClick={() => {
                      toast({ tone: 'success', title: 'Lembretes enviados', description: `${selected.size} pacientes (simulação).` });
                      setSelected(new Set());
                    }}
                  >
                    Enviar lembrete
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Limpar seleção
                </Button>
              </>
            )}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(p) => p.id}
          loading={loading}
          onRowClick={(p) => setPreviewId(p.id)}
          isRowSelected={(p) => p.id === previewId}
          caption="Lista de pacientes"
          empty={
            hasCriteria ? (
              <EmptyState
                icon={UserRoundSearch}
                title="Nenhum paciente encontrado"
                description={
                  query
                    ? `Não há resultados para “${query}”. Confira a grafia, busque pelo telefone ou remova os filtros ativos.`
                    : 'Nenhum paciente corresponde aos filtros atuais.'
                }
                action={
                  <Button variant="secondary" onClick={clearAll}>
                    Limpar busca e filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={UserPlus}
                title="Nenhum paciente cadastrado"
                description={scope === 'proprio' ? 'Você ainda não tem pacientes vinculados aos seus agendamentos.' : 'Cadastre o primeiro paciente da clínica.'}
                action={
                  canEdit ? (
                    <Button leftIcon={UserPlus} onClick={() => setNewOpen(true)}>
                      Novo paciente
                    </Button>
                  ) : undefined
                }
              />
            )
          }
        />

        {filtered.length > 0 && !loading && (
          <div className="border-t border-graphite-100 p-4">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} />
          </div>
        )}
      </Card>

      <Drawer
        open={preview !== null}
        onClose={() => setPreviewId(null)}
        title={preview?.name ?? 'Paciente'}
        description={
          preview ? `${preview.age} anos${preview.createdAt ? ` · cliente desde ${formatDate(preview.createdAt)}` : ''}` : undefined
        }
        footer={
          preview ? (
            <>
              {canEdit && !preview.minimal && (
                <Button variant="secondary" leftIcon={Pencil} onClick={() => setEditId(preview.id)}>
                  Editar
                </Button>
              )}
              <Button rightIcon={ExternalLink} onClick={() => onOpenPatient?.(preview.id)}>
                Abrir perfil
              </Button>
            </>
          ) : undefined
        }
      >
        {preview && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar name={preview.name} size="xl" ring />
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={preview.status === 'ativo' ? 'success' : 'neutral'} dot>
                  {preview.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
                {preview.tags.map((t) => (
                  <Badge key={t} tone="neutral" size="sm">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                <dt className="sr-only">Telefone</dt>
                <dd className="tabular-nums text-graphite-800">{preview.phone}</dd>
              </div>
              {!preview.minimal && (
                <>
                  <div className="flex items-center gap-3">
                    <Mail size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                    <dt className="sr-only">E-mail</dt>
                    <dd className="text-graphite-800">{preview.email ?? 'Não informado'}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} strokeWidth={1.75} aria-hidden="true" className="text-graphite-500" />
                    <dt className="sr-only">Cidade</dt>
                    <dd className="text-graphite-800">{preview.city} – RS</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-graphite-200 p-3">
                <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">Próxima consulta</p>
                <p className="mt-1 font-display text-2xl text-graphite-900">{preview.nextVisit ? formatDate(preview.nextVisit) : '—'}</p>
              </div>
              {preview.balance !== undefined ? (
                <div className="rounded-md border border-graphite-200 p-3">
                  <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">Saldo em aberto</p>
                  <p className={preview.balance > 0 ? 'mt-1 font-display text-2xl text-warning' : 'mt-1 font-display text-2xl text-graphite-900'}>
                    {formatCurrency(preview.balance)}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-graphite-200 p-3">
                  <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">Última visita</p>
                  <p className="mt-1 font-display text-2xl text-graphite-900">{preview.lastVisit ? formatDate(preview.lastVisit) : '—'}</p>
                </div>
              )}
            </div>

            <section aria-labelledby="preview-appts">
              <h3 id="preview-appts" className="mb-3 flex items-center gap-2 text-sm font-bold text-graphite-900">
                <CalendarClock size={16} strokeWidth={1.75} aria-hidden="true" />
                Agendamentos recentes
              </h3>
              {previewAppts.length === 0 ? (
                <p className="text-sm text-graphite-500">Nenhum agendamento registrado.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-graphite-100 rounded-md border border-graphite-200">
                  {[...previewAppts]
                    .reverse()
                    .slice(0, 4)
                    .map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-graphite-900">{a.service}</p>
                          <p className="flex items-center gap-2 text-xs text-graphite-500">
                            {formatDate(a.start)} · {formatTime(a.start)} <SpecialtyTag specialty={a.specialty} variant="dot" />
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Drawer>

      <NewPatientModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => {
          setNewOpen(false);
          clearAll();
          setPreviewId(p.id);
        }}
      />
      <EditPatientModal open={editing !== null} patient={editing} onClose={() => setEditId(null)} onSaved={() => setEditId(null)} />
      <DeletePatientDialog
        open={statusPatient !== null}
        patient={statusPatient}
        action={statusTarget?.action ?? 'deactivate'}
        onClose={() => setStatusTarget(null)}
        onDone={(action, id) => {
          setStatusTarget(null);
          if (action === 'delete') {
            setSelected((s) => {
              const n = new Set(s);
              n.delete(id);
              return n;
            });
            if (previewId === id) setPreviewId(null);
          }
        }}
      />
    </div>
  );
}
