import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  UserPlus,
  UserRoundSearch,
} from 'lucide-react';
import type { Patient } from '@ds/mocks/types';
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
  SpecialtyTag,
  StatusBadge,
  useToast,
} from '@ds/components';
import {
  ageFrom,
  appointments,
  formatCurrency,
  formatDate,
  formatTime,
  getAppointmentsByPatient,
  patients as seedPatients,
} from '@ds/mocks/clinical';
import { DeletePatientDialog, EditPatientModal, NewPatientModal } from './modals';

export interface PatientsScreenProps {
  onOpenPatient?: (patientId: string) => void;
}

type QuickFilter = 'todos' | 'ativos' | 'inativos' | 'saldo' | 'novos';

const PAGE_SIZE = 8;

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function PatientsScreen({ onOpenPatient }: PatientsScreenProps) {
  const { toast } = useToast();
  const [list, setList] = useState<Patient[]>(seedPatients);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('todos');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      todos: list.length,
      ativos: list.filter((p) => p.status === 'ativo').length,
      inativos: list.filter((p) => p.status === 'inativo').length,
      saldo: list.filter((p) => p.balance > 0).length,
      novos: list.filter((p) => p.createdAt >= '2026-10-01').length,
    }),
    [list],
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return list.filter((p) => {
      const matchQ =
        !q || normalize(p.name).includes(q) || p.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§') || normalize(p.city).includes(q);
      const matchF =
        filter === 'todos' ||
        (filter === 'ativos' && p.status === 'ativo') ||
        (filter === 'inativos' && p.status === 'inativo') ||
        (filter === 'saldo' && p.balance > 0) ||
        (filter === 'novos' && p.createdAt >= '2026-10-01');
      return matchQ && matchF;
    });
  }, [list, query, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id));

  const preview = list.find((p) => p.id === previewId) ?? null;
  const editing = list.find((p) => p.id === editId) ?? null;
  const deleting = list.find((p) => p.id === deleteId) ?? null;

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

  function changeFilter(f: QuickFilter) {
    setFilter(f);
    setPage(1);
  }

  const columns = [
    {
      key: 'select',
      header: 'Seleção',
      width: '48px',
      render: (p: Patient) => (
        <input
          type="checkbox"
          checked={selected.has(p.id)}
          onChange={() => toggle(p.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Selecionar ${p.name}`}
          className="h-4 w-4 cursor-pointer rounded-xs border-graphite-300 accent-gold-600 focus-visible:shadow-focus"
        />
      ),
    },
    {
      key: 'name',
      header: 'Paciente',
      render: (p: Patient) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-graphite-900">{p.name}</div>
            <div className="truncate text-xs text-graphite-500">
              {ageFrom(p.birthDate)} anos · {p.city}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contato',
      hideBelow: 'md' as const,
      render: (p: Patient) => <span className="tabular-nums text-graphite-700">{p.phone}</span>,
    },
    {
      key: 'last',
      header: 'Última visita',
      hideBelow: 'lg' as const,
      render: (p: Patient) => <span className="text-graphite-700">{p.lastVisit ? formatDate(p.lastVisit) : '—'}</span>,
    },
    {
      key: 'next',
      header: 'Próxima consulta',
      hideBelow: 'lg' as const,
      render: (p: Patient) =>
        p.nextVisit ? <span className="text-graphite-700">{formatDate(p.nextVisit)}</span> : <span className="text-graphite-400">Sem agendamento</span>,
    },
    {
      key: 'balance',
      header: 'Saldo',
      align: 'right' as const,
      hideBelow: 'md' as const,
      render: (p: Patient) =>
        p.balance > 0 ? (
          <span className="font-semibold tabular-nums text-warning">{formatCurrency(p.balance)}</span>
        ) : (
          <span className="tabular-nums text-graphite-500">{formatCurrency(0)}</span>
        ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (p: Patient) => (
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
      render: (p: Patient) => (
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
          <DropdownMenu
            label={`Ações para ${p.name}`}
            align="end"
            trigger={<IconButton icon={MoreHorizontal} label={`Ações para ${p.name}`} size="sm" />}
            items={[
              { label: 'Abrir perfil', icon: ExternalLink, onSelect: () => onOpenPatient?.(p.id) },
              { label: 'Editar cadastro', icon: Pencil, onSelect: () => setEditId(p.id) },
              {
                label: 'Enviar mensagem',
                icon: MessageCircle,
                onSelect: () => toast({ tone: 'success', title: 'Conversa aberta', description: `WhatsApp de ${p.name} (simulação).` }),
              },
              { label: 'Excluir', icon: Trash2, danger: true, onSelect: () => setDeleteId(p.id) },
            ]}
          />
        </div>
      ),
    },
  ];

  const previewAppts = preview ? getAppointmentsByPatient(preview.id, appointments).slice(0, 4) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pacientes"
        subtitle={`${counts.ativos} ativos · ${counts.novos} novos em outubro · dados fictícios`}
        breadcrumb={['Início', 'Pacientes']}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={Download}
              onClick={() => toast({ tone: 'info', title: 'Exportação gerada', description: 'Planilha de pacientes (demonstração).' })}
            >
              Exportar
            </Button>
            <Button leftIcon={UserPlus} onClick={() => setNewOpen(true)}>
              Novo paciente
            </Button>
          </>
        }
      />

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-graphite-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <SearchInput
              aria-label="Buscar pacientes"
              placeholder="Buscar por nome, telefone ou cidade…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros rápidos">
            <FilterChip label="Todos" count={counts.todos} active={filter === 'todos'} onClick={() => changeFilter('todos')} />
            <FilterChip label="Ativos" count={counts.ativos} active={filter === 'ativos'} onClick={() => changeFilter('ativos')} />
            <FilterChip label="Inativos" count={counts.inativos} active={filter === 'inativos'} onClick={() => changeFilter('inativos')} />
            <FilterChip label="Saldo em aberto" count={counts.saldo} active={filter === 'saldo'} onClick={() => changeFilter('saldo')} />
            <FilterChip label="Novos" count={counts.novos} active={filter === 'novos'} onClick={() => changeFilter('novos')} />
          </div>
        </div>

        {pageRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-graphite-100 bg-graphite-50 px-4 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-graphite-700">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={togglePage}
                className="h-4 w-4 cursor-pointer accent-gold-600"
              />
              Selecionar página
            </label>
            {selected.size > 0 && (
              <>
                <span className="font-semibold text-graphite-900" aria-live="polite">
                  {selected.size} selecionado{selected.size > 1 ? 's' : ''}
                </span>
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
          onRowClick={(p) => setPreviewId(p.id)}
          caption="Lista de pacientes"
          empty={
            <EmptyState
              icon={UserRoundSearch}
              title="Nenhum paciente encontrado"
              description={query ? `Não há resultados para “${query}” com os filtros atuais.` : 'Ajuste os filtros para ver pacientes.'}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    changeFilter('todos');
                  }}
                >
                  Limpar busca e filtros
                </Button>
              }
            />
          }
        />

        {filtered.length > 0 && (
          <div className="border-t border-graphite-100 p-4">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} />
          </div>
        )}
      </Card>

      <Drawer
        open={preview !== null}
        onClose={() => setPreviewId(null)}
        title={preview?.name ?? 'Paciente'}
        description={preview ? `${ageFrom(preview.birthDate)} anos · cliente desde ${formatDate(preview.createdAt)}` : undefined}
        footer={
          preview ? (
            <>
              <Button variant="secondary" leftIcon={Pencil} onClick={() => setEditId(preview.id)}>
                Editar
              </Button>
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
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-graphite-200 p-3">
                <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">Próxima consulta</p>
                <p className="mt-1 font-display text-2xl text-graphite-900">{preview.nextVisit ? formatDate(preview.nextVisit) : '—'}</p>
              </div>
              <div className="rounded-md border border-graphite-200 p-3">
                <p className="text-overline uppercase tracking-[0.08em] text-graphite-500">Saldo em aberto</p>
                <p className={preview.balance > 0 ? 'mt-1 font-display text-2xl text-warning' : 'mt-1 font-display text-2xl text-graphite-900'}>
                  {formatCurrency(preview.balance)}
                </p>
              </div>
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
                  {previewAppts.map((a) => (
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
        onCreate={(p) => {
          setList((l) => [p, ...l]);
          setNewOpen(false);
          setFilter('todos');
          setPage(1);
          toast({ tone: 'success', title: 'Paciente cadastrado', description: p.name });
        }}
      />
      <EditPatientModal
        open={editing !== null}
        patient={editing}
        onClose={() => setEditId(null)}
        onSave={(p) => {
          setList((l) => l.map((x) => (x.id === p.id ? p : x)));
          setEditId(null);
          toast({ tone: 'success', title: 'Cadastro atualizado', description: p.name });
        }}
      />
      <DeletePatientDialog
        open={deleting !== null}
        patient={deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={(p) => {
          setList((l) => l.filter((x) => x.id !== p.id));
          setSelected((s) => {
            const n = new Set(s);
            n.delete(p.id);
            return n;
          });
          setDeleteId(null);
          if (previewId === p.id) setPreviewId(null);
          toast({ tone: 'danger', title: 'Paciente excluído', description: p.name });
        }}
      />
    </div>
  );
}
