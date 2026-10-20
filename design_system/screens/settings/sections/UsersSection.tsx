import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, Pencil, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import { ROLE_LABEL, ROLES, type Role } from '@ds/access';
import { Avatar, Badge, Button, Card, DataTable, Drawer, EmptyState, IconButton, Input, Modal, SearchInput, Select, useToast } from '@ds/components';
import { initials as initialsOf } from '@ds/mocks/clinical';
import { settingsService, useAccessContext, useAction, useCan, useProfessionals, useUsers, type UserRecord } from '@core';
import { ReadOnlyNote } from './shared';

const STATUS_TONE: Record<UserRecord['status'], 'success' | 'info' | 'neutral'> = {
  ativo: 'success',
  convidado: 'info',
  inativo: 'neutral',
};
const STATUS_LABEL: Record<UserRecord['status'], string> = { ativo: 'Ativo', convidado: 'Convite pendente', inativo: 'Inativo' };
const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));
const DEFAULT_TITLE: Record<Role, string> = { admin: 'Administrador(a)', recepcao: 'Recepcionista', financeiro: 'Financeiro', profissional: '' };

function formatAccess(iso?: string): string {
  if (!iso) return 'Nunca acessou';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y} às ${iso.slice(11, 16)}`;
}

interface UserForm {
  id?: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  professionalId: string;
  status: UserRecord['status'];
}

const EMPTY_FORM: UserForm = { name: '', email: '', role: 'recepcao', title: '', professionalId: '', status: 'convidado' };

/** Validação local do formulário (o serviço revalida o vínculo do profissional). */
export function validateUserForm(f: UserForm, users: UserRecord[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = 'Informe o nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Informe um e-mail válido.';
  else if (users.some((u) => u.id !== f.id && u.email.toLowerCase() === f.email.trim().toLowerCase())) e.email = 'Já existe um usuário com este e-mail.';
  if (f.role === 'profissional') {
    if (!f.professionalId) e.professionalId = 'Vincule o usuário a um cadastro de profissional.';
    else if (users.some((u) => u.id !== f.id && u.professionalId === f.professionalId && u.status !== 'inativo'))
      e.professionalId = 'Este profissional já tem um usuário ativo.';
  }
  return e;
}

/**
 * Configurações › Usuários — `settingsService.upsertUser`.
 * Convites são demonstrativos (nenhum e-mail é enviado; não há senha armazenada).
 * O próprio usuário não pode se desativar nem mudar o próprio perfil.
 */
export function UsersSection() {
  const { toast } = useToast();
  const ctx = useAccessContext();
  const users = useUsers();
  const professionals = useProfessionals();
  const canEdit = useCan('usuarios_permissoes', 'editar');
  const upsert = useAction(settingsService.upsertUser);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<UserForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<UserRecord | null>(null);

  const profName = (id?: string) => professionals.find((p) => p.id === id)?.name;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .filter((u) => !roleFilter || u.role === roleFilter)
      .filter((u) => !statusFilter || u.status === statusFilter)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [users, query, roleFilter, statusFilter]);

  function openNew() {
    setErrors({});
    setForm({ ...EMPTY_FORM });
  }
  function openEdit(u: UserRecord) {
    setErrors({});
    setDetail(null);
    setForm({ id: u.id, name: u.name, email: u.email, role: u.role, title: u.title, professionalId: u.professionalId ?? '', status: u.status });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const errs = validateUserForm(form, users);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const existing = form.id ? users.find((u) => u.id === form.id) : undefined;
    const isProf = form.role === 'profissional';
    const prof = isProf ? professionals.find((p) => p.id === form.professionalId) : undefined;
    const saved = await upsert.run({
      id: form.id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      title: form.title.trim() || (prof ? prof.title.split(' · ')[0] : DEFAULT_TITLE[form.role]),
      initials: initialsOf(form.name.trim()),
      status: form.status,
      professionalId: isProf ? form.professionalId : undefined,
      lastAccess: existing?.lastAccess,
      isDemo: existing?.isDemo ?? true,
    });
    if (saved) {
      setForm(null);
      toast({
        tone: 'success',
        title: form.id ? 'Usuário atualizado' : 'Convite registrado',
        description: form.id ? saved.name : `Demonstração: nenhum e-mail foi enviado para ${saved.email}.`,
      });
    } else if (upsert.error?.fields) setErrors(upsert.error.fields);
  }

  async function setStatus(u: UserRecord, status: UserRecord['status']) {
    const saved = await upsert.run({ ...u, status });
    if (saved) toast({ tone: status === 'inativo' ? 'info' : 'success', title: status === 'inativo' ? 'Usuário desativado' : 'Usuário ativado', description: u.name });
    setDetail((d) => (d && saved && d.id === saved.id ? saved : d));
  }

  const isSelf = (u: UserRecord) => u.id === ctx.userId;
  const editingSelf = Boolean(form?.id && form.id === ctx.userId);

  return (
    <div className="flex flex-col gap-4">
      {!canEdit && <ReadOnlyNote />}
      <Card
        title="Usuários"
        description="Pessoas com acesso ao Humanittá Gestão. Usuários fictícios de demonstração."
        padding="none"
        action={
          canEdit ? (
            <Button size="sm" leftIcon={UserPlus} onClick={openNew}>
              Convidar usuário
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-[minmax(0,1fr)_200px_180px] sm:items-end md:px-6">
          <SearchInput aria-label="Buscar usuário" placeholder="Buscar por nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select label="Perfil" controlSize="sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={[{ value: '', label: 'Todos os perfis' }, ...ROLE_OPTIONS]} />
          <Select
            label="Situação"
            controlSize="sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'Todas' }, ...(Object.keys(STATUS_LABEL) as UserRecord['status'][]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
          />
        </div>
        <DataTable<UserRecord>
          caption="Usuários do sistema"
          rowKey={(r) => r.id}
          rows={rows}
          onRowClick={setDetail}
          empty={<EmptyState compact icon={Users} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />}
          columns={[
            {
              key: 'name',
              header: 'Usuário',
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} size="sm" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-graphite-900">
                      {r.name}
                      {isSelf(r) && <span className="ml-2 text-[11px] font-semibold text-gold-600">(você)</span>}
                    </span>
                    <span className="truncate text-[12px] text-graphite-500">{r.email}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Perfil',
              hideBelow: 'md',
              render: (r) => (
                <div className="flex flex-col">
                  <span className="text-graphite-700">{ROLE_LABEL[r.role]}</span>
                  {r.role === 'profissional' && <span className="text-[12px] text-graphite-500">{profName(r.professionalId) ?? 'Sem vínculo'}</span>}
                </div>
              ),
            },
            { key: 'status', header: 'Situação', render: (r) => <Badge tone={STATUS_TONE[r.status]} dot size="sm">{STATUS_LABEL[r.status]}</Badge> },
            { key: 'access', header: 'Último acesso', hideBelow: 'lg', render: (r) => <span className="text-[13px] text-graphite-600">{formatAccess(r.lastAccess)}</span> },
            {
              key: 'actions',
              header: 'Ações',
              align: 'right',
              render: (r) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <IconButton icon={Eye} size="sm" label={`Ver detalhes de ${r.name}`} onClick={() => setDetail(r)} />
                  {canEdit && <IconButton icon={Pencil} size="sm" label={`Editar ${r.name}`} onClick={() => openEdit(r)} />}
                  {canEdit &&
                    !isSelf(r) &&
                    (r.status === 'inativo' ? (
                      <IconButton icon={UserCheck} size="sm" label={`Reativar ${r.name}`} disabled={upsert.loading} onClick={() => void setStatus(r, 'ativo')} />
                    ) : (
                      <IconButton icon={UserX} size="sm" label={`Desativar ${r.name}`} disabled={upsert.loading} onClick={() => void setStatus(r, 'inativo')} />
                    ))}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        description={detail ? ROLE_LABEL[detail.role] : undefined}
        footer={
          detail && canEdit ? (
            <div className="flex flex-wrap justify-end gap-2">
              {!isSelf(detail) && (
                <Button variant="secondary" onClick={() => void setStatus(detail, detail.status === 'inativo' ? 'ativo' : 'inativo')} loading={upsert.loading}>
                  {detail.status === 'inativo' ? 'Reativar' : 'Desativar'}
                </Button>
              )}
              <Button leftIcon={Pencil} onClick={() => openEdit(detail)}>
                Editar
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail && (
          <dl className="grid grid-cols-1 gap-4 text-body-sm">
            {[
              ['E-mail', detail.email],
              ['Perfil de acesso', ROLE_LABEL[detail.role]],
              ['Cargo exibido', detail.title || '—'],
              ['Profissional vinculado', detail.role === 'profissional' ? profName(detail.professionalId) ?? 'Sem vínculo' : 'Não se aplica'],
              ['Situação', STATUS_LABEL[detail.status]],
              ['Último acesso', formatAccess(detail.lastAccess)],
              ['Origem', detail.isDemo ? 'Usuário fictício de demonstração' : 'Pessoa real (informação pública)'],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-[12px] font-semibold uppercase tracking-[.06em] text-graphite-500">{k}</dt>
                <dd className="text-graphite-900">{v}</dd>
              </div>
            ))}
            <p className="text-[12px] text-graphite-500">Autenticação de demonstração: não há senha cadastrada nem envio de convite real.</p>
          </dl>
        )}
      </Drawer>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar usuário' : 'Convidar usuário'}
        description={form?.id ? undefined : 'O convite é simulado nesta demonstração: nenhum e-mail é enviado.'}
        size="sm"
        dismissible={!upsert.loading}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={upsert.loading}>
              Cancelar
            </Button>
            <Button type="submit" form="user-form" loading={upsert.loading}>
              {form?.id ? 'Salvar' : 'Registrar convite'}
            </Button>
          </>
        }
      >
        {form && (
          <form id="user-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
            <Select
              label="Perfil de acesso"
              options={ROLE_OPTIONS}
              value={form.role}
              disabled={editingSelf}
              hint={editingSelf ? 'Você não pode alterar o seu próprio perfil de acesso.' : undefined}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role, professionalId: e.target.value === 'profissional' ? form.professionalId : '' })}
            />
            {form.role === 'profissional' && (
              <Select
                label="Profissional vinculado"
                placeholder="Selecione o cadastro"
                options={professionals.map((p) => ({ value: p.id, label: p.name }))}
                value={form.professionalId}
                error={errors.professionalId}
                onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
                hint="O Portal do Profissional mostra apenas a agenda e os pacientes deste cadastro."
              />
            )}
            <Input label="Cargo exibido" value={form.title} placeholder={DEFAULT_TITLE[form.role] || 'Usa o título do profissional'} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {form.id && !editingSelf && (
              <Select
                label="Situação"
                options={(Object.keys(STATUS_LABEL) as UserRecord['status'][]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as UserRecord['status'] })}
              />
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
