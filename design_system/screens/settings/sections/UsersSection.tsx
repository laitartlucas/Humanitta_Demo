import { useState } from 'react';
import type { FormEvent } from 'react';
import { UserPlus, UserX } from 'lucide-react';
import { Avatar, Badge, Button, Card, DataTable, IconButton, Input, Modal, Select, useToast } from '@ds/components';
import { appUsers, USER_ROLE_LABEL } from '@ds/mocks/business';
import type { AppUser, UserRole } from '@ds/mocks/business';

const ROLE_OPTIONS = (Object.keys(USER_ROLE_LABEL) as UserRole[]).map((r) => ({ value: r, label: USER_ROLE_LABEL[r] }));

const STATUS_TONE: Record<AppUser['status'], 'success' | 'info' | 'neutral'> = {
  ativo: 'success',
  convidado: 'info',
  inativo: 'neutral',
};
const STATUS_LABEL: Record<AppUser['status'], string> = { ativo: 'Ativo', convidado: 'Convite enviado', inativo: 'Inativo' };

function formatAccess(iso?: string): string {
  if (!iso) return 'Nunca acessou';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y} às ${iso.slice(11, 16)}`;
}

export function UsersSection() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>(appUsers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'recepcao' as UserRole });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const invite = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: { name?: string; email?: string } = {};
    if (!form.name.trim()) next.name = 'Informe o nome.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
    setErrors(next);
    if (next.name || next.email) return;
    setUsers((l) => [...l, { id: `u-${Date.now()}`, name: form.name.trim(), email: form.email.trim(), role: form.role, status: 'convidado', isDemo: true }]);
    setOpen(false);
    setForm({ name: '', email: '', role: 'recepcao' });
    toast({ tone: 'success', title: 'Convite simulado', description: `Nenhum e-mail foi enviado para ${form.email}.` });
  };

  return (
    <Card
      title="Usuários"
      description="Pessoas com acesso ao Humanittá Gestão. Usuários fictícios de demonstração."
      padding="none"
      action={
        <Button size="sm" leftIcon={UserPlus} onClick={() => setOpen(true)}>
          Convidar usuário
        </Button>
      }
    >
      <DataTable<AppUser>
        caption="Usuários do sistema"
        rowKey={(r) => r.id}
        rows={users}
        columns={[
          {
            key: 'name',
            header: 'Usuário',
            render: (r) => (
              <div className="flex items-center gap-3">
                <Avatar name={r.name} size="sm" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-graphite-900">{r.name}</span>
                  <span className="truncate text-[12px] text-graphite-500">{r.email}</span>
                </div>
              </div>
            ),
          },
          { key: 'role', header: 'Perfil', hideBelow: 'md', render: (r) => <span className="text-graphite-700">{USER_ROLE_LABEL[r.role]}</span> },
          { key: 'status', header: 'Situação', render: (r) => <Badge tone={STATUS_TONE[r.status]} dot size="sm">{STATUS_LABEL[r.status]}</Badge> },
          { key: 'access', header: 'Último acesso', hideBelow: 'lg', render: (r) => <span className="text-[13px] text-graphite-600">{formatAccess(r.lastAccess)}</span> },
          {
            key: 'actions',
            header: 'Ações',
            align: 'right',
            render: (r) =>
              r.status !== 'inativo' && r.id !== 'u-01' ? (
                <IconButton
                  icon={UserX}
                  size="sm"
                  label={`Desativar ${r.name}`}
                  onClick={() => {
                    setUsers((l) => l.map((x) => (x.id === r.id ? { ...x, status: 'inativo' } : x)));
                    toast({ tone: 'info', title: 'Usuário desativado', description: r.name });
                  }}
                />
              ) : null,
          },
        ]}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Convidar usuário"
        description="O convite é simulado nesta demonstração."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="invite-user-form">
              Enviar convite
            </Button>
          </>
        }
      >
        <form id="invite-user-form" onSubmit={invite} className="flex flex-col gap-4" noValidate>
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
          <Select label="Perfil de acesso" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} />
        </form>
      </Modal>
    </Card>
  );
}
