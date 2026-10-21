import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  CalendarOff,
  Clock3,
  DoorOpen,
  KeyRound,
  Laptop,
  Lock,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { blockRequestService, now as clockNow, settingsService, useAction, useCan, useMyPayouts, useSpecialties } from '@core';
import { Avatar, Badge, Button, Card, Input, PageHeader, Select, SpecialtyTag, Switch, Tabs, Textarea, useToast } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import { WEEKDAY_NAMES, formatCurrency, formatDate, formatTime } from '@ds/mocks/clinical';
import { RequestBlockModal } from '../calendar/modals';
import {
  BlockRequestList,
  RequestChangeButton,
  ScopeBadge,
  availabilityOf,
  payoutSummary,
  useMyAppointments,
  useMyBlockRequests,
  useMyProfessional,
  useRoomName,
  weekdayDate,
} from '../shared';

export type PortalProfileTab = 'dados' | 'disponibilidade' | 'preferencias' | 'seguranca';

export interface PortalProfileScreenProps {
  /** Permissão de solicitar alteração de disponibilidade (padrão: `useCan` da sessão). */
  canRequestChanges?: boolean;
  initialTab?: PortalProfileTab;
}

/**
 * Campos editáveis pelo PRÓPRIO profissional. O core (`settingsService.updateOwnProfile`) só aceita
 * título de apresentação e foto; nome, registro, especialidade, sala, papel e permissões ficam com
 * a administração. As preferências não têm armazenamento no core (ver CR 04) e valem para a sessão.
 */
interface ProfileForm {
  title: string;
  avatarUrl: string;
  remindDay: boolean;
  dailySummary: boolean;
  checkinAlert: boolean;
  defaultView: string;
  defaultReturn: string;
  twoFactor: boolean;
}

const DEFAULT_PREFS: Omit<ProfileForm, 'title' | 'avatarUrl'> = {
  remindDay: true,
  dailySummary: true,
  checkinAlert: true,
  defaultView: 'dia',
  defaultReturn: '30',
  twoFactor: false,
};

const AVATAR_URL = /^https:\/\/\S+$/i;

/** Meu Perfil — dados profissionais, disponibilidade (leitura), preferências e segurança. */
export function PortalProfileScreen({ canRequestChanges, initialTab = 'dados' }: PortalProfileScreenProps) {
  const { toast } = useToast();
  const { professional: prof, user } = useMyProfessional();
  const canRequestBySession = useCan('bloqueio_horario', 'solicitar');
  const canRequest = canRequestChanges ?? canRequestBySession;
  const roomName = useRoomName();
  const specialties = useSpecialties();
  const availability = useMemo(() => availabilityOf(prof), [prof]);
  const requests = useMyBlockRequests();
  const myAppointments = useMyAppointments();
  const payouts = useMyPayouts();
  const payout = useMemo(() => payoutSummary(payouts, myAppointments, clockNow()), [payouts, myAppointments]);
  const updateProfile = useAction(settingsService.updateOwnProfile);
  const withdraw = useAction(blockRequestService.withdrawBlockRequest, { success: 'Solicitação retirada' });

  const fromProfessional = useMemo<ProfileForm>(
    () => ({ title: prof?.title ?? '', avatarUrl: prof?.avatarUrl ?? '', ...DEFAULT_PREFS }),
    // Só ao trocar de profissional: salvar não deve apagar as preferências da sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prof?.id],
  );
  const [tab, setTab] = useState<PortalProfileTab>(initialTab);
  const [saved, setSaved] = useState<ProfileForm>(fromProfessional);
  const [form, setForm] = useState<ProfileForm>(fromProfessional);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  useEffect(() => {
    setSaved(fromProfessional);
    setForm(fromProfessional);
  }, [fromProfessional]);

  const dirty = (Object.keys(form) as (keyof ProfileForm)[]).some((k) => form[k] !== saved[k]);
  const titleError = !form.title.trim() ? 'Informe como você quer ser apresentado(a).' : updateProfile.error?.fields?.title;
  const avatarError = form.avatarUrl && !AVATAR_URL.test(form.avatarUrl) ? 'Use um endereço https:// de imagem.' : undefined;
  const specialtyName = prof ? (specialties.find((s) => s.id === prof.specialty)?.name ?? prof.specialty) : '';

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (titleError || avatarError) {
      setTab('dados');
      toast({ tone: 'danger', title: 'Revise os campos destacados', description: 'Há informações inválidas em Dados profissionais.' });
      return;
    }
    const profileChanged = form.title !== saved.title || form.avatarUrl !== saved.avatarUrl;
    if (profileChanged) {
      // O serviço grava no cadastro do profissional DA SESSÃO; papel e permissões não são aceitos.
      const updated = await updateProfile.run({ title: form.title.trim(), avatarUrl: form.avatarUrl.trim() || undefined });
      if (!updated) return;
    }
    setSaved(form);
    toast({
      tone: 'success',
      title: 'Perfil atualizado',
      description: profileChanged ? 'Título e foto salvos no seu cadastro.' : 'Preferências aplicadas nesta sessão (demonstração).',
    });
  }

  function discard() {
    setForm(saved);
    toast({ tone: 'info', title: 'Alterações descartadas' });
  }

  function changePassword() {
    const e: typeof pwdErrors = {};
    if (!pwd.current) e.current = 'Informe a senha atual.';
    if (pwd.next.length < 8) e.next = 'Use pelo menos 8 caracteres.';
    else if (!/\d/.test(pwd.next) || !/[A-Za-z]/.test(pwd.next)) e.next = 'Combine letras e números.';
    if (pwd.confirm !== pwd.next) e.confirm = 'As senhas não conferem.';
    setPwdErrors(e);
    if (Object.keys(e).length) return;
    setPwd({ current: '', next: '', confirm: '' });
    toast({ tone: 'success', title: 'Senha alterada', description: 'As outras sessões serão encerradas no próximo acesso.' });
  }

  if (!prof) return null;

  const saving = updateProfile.loading;
  const pendingAvail = requests.filter((r) => r.status === 'enviada').length;
  const approvedBlocks = requests.filter((r) => r.kind === 'bloqueio' && r.status === 'aprovada');

  return (
    <div className={cn('flex flex-col gap-6', dirty && 'pb-24')}>
      <PageHeader title="Meu perfil" breadcrumb={['Portal do Profissional', 'Meu perfil']} />

      {/* Cabeçalho do perfil */}
      <section aria-labelledby="profile-name" className="relative overflow-hidden rounded-md border border-graphite-200 bg-white p-5 shadow-sm md:p-6">
        <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120" className="pointer-events-none absolute -right-1 -top-1 hidden sm:block">
          <path d="M120 0v120A120 120 0 0 1 0 0z" fill="#F5E9D0" />
        </svg>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={prof.name} src={prof.avatarUrl} size="xl" ring />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="profile-name" className="font-display text-[28px] font-semibold leading-[34px] text-graphite-900">
              {prof.name}
            </h2>
            <p className="text-body text-graphite-600">{prof.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {prof.registry && (
                <Badge tone="gold" icon={BadgeCheck}>
                  {prof.registry}
                </Badge>
              )}
              <SpecialtyTag specialty={prof.specialty} variant="chip" />
              {prof.roomId && (
                <Badge tone="neutral" icon={DoorOpen}>
                  {roomName(prof.roomId)}
                </Badge>
              )}
              <ScopeBadge label="Perfil: Profissional de saúde" />
            </div>
          </div>
        </div>
      </section>

      <Tabs
        ariaLabel="Seções do perfil"
        idPrefix="portal-profile"
        value={tab}
        onChange={(id) => setTab(id as PortalProfileTab)}
        items={[
          { id: 'dados', label: 'Dados profissionais', icon: UserRound },
          { id: 'disponibilidade', label: 'Disponibilidade', icon: CalendarClock, count: pendingAvail || undefined },
          { id: 'preferencias', label: 'Preferências', icon: SlidersHorizontal },
          { id: 'seguranca', label: 'Segurança', icon: ShieldCheck },
        ]}
      />

      <div role="tabpanel" id={`portal-profile-panel-${tab}`} aria-labelledby={`portal-profile-tab-${tab}`} className="flex flex-col gap-6">
        {tab === 'dados' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card title="Dados profissionais" description="Informações exibidas para a equipe e nos lembretes aos pacientes.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Nome de exibição" value={prof.name} readOnly hint="Alterado somente pela administração." leftIcon={Lock} />
                <Input label="Registro profissional" value={prof.registry ?? '—'} readOnly hint="Alterado somente pela administração." leftIcon={Lock} />
                <Input
                  label="Título / apresentação"
                  required
                  maxLength={80}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  error={titleError}
                  hint="Ex.: Ortodontista · Clínica geral"
                />
                <Input
                  label="Foto (endereço da imagem)"
                  type="url"
                  value={form.avatarUrl}
                  onChange={(e) => set('avatarUrl', e.target.value)}
                  error={avatarError}
                  hint="Opcional · https://… Sem foto, usamos suas iniciais."
                  autoComplete="photo"
                />
                <Input label="E-mail de acesso" type="email" value={user?.email ?? '—'} readOnly leftIcon={Lock} hint="Usuário de demonstração · alterado pela administração." />
                <Input label="Telefone profissional" type="tel" value="" disabled placeholder="Não cadastrado" hint="Campo previsto — ainda sem suporte no cadastro (demonstração)." />
                <Textarea
                  label="Apresentação curta"
                  rows={3}
                  value=""
                  disabled
                  placeholder="Em breve: texto usado em lembretes e no site da clínica."
                  hint="Campo previsto — ainda sem suporte no cadastro (demonstração)."
                  wrapperClassName="md:col-span-2"
                />
              </div>
            </Card>
            <Card title="Vínculo com a clínica" description="Somente leitura" className="self-start">
              <dl className="flex flex-col gap-3 text-body-sm">
                <div>
                  <dt className="text-caption text-graphite-500">Nome completo</dt>
                  <dd className="font-semibold text-graphite-900">{prof.name}</dd>
                </div>
                <div>
                  <dt className="text-caption text-graphite-500">Atuação</dt>
                  <dd className="font-semibold text-graphite-900">{prof.title}</dd>
                </div>
                <div>
                  <dt className="text-caption text-graphite-500">Especialidade</dt>
                  <dd className="font-semibold text-graphite-900">{specialtyName}</dd>
                </div>
                <div>
                  <dt className="text-caption text-graphite-500">Sala</dt>
                  <dd className="font-semibold text-graphite-900">{prof.roomId ? `${roomName(prof.roomId)} · ${specialtyName}` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-caption text-graphite-500">Perfil de acesso</dt>
                  <dd className="font-semibold text-graphite-900">Profissional de saúde · somente os próprios registros</dd>
                </div>
              </dl>
              <p className="text-caption text-graphite-500">
                Para alterar nome, registro, especialidades, sala ou permissões, fale com a administração.
              </p>
            </Card>
          </div>
        )}

        {tab === 'disponibilidade' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card
              title="Horário de atendimento"
              description="Somente leitura. Alterações passam pela aprovação da administração."
              action={<RequestChangeButton enabled={canRequest} onClick={() => setModalOpen(true)} label="Solicitar alteração" icon={Clock3} size="sm" />}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-body-sm">
                  <caption className="sr-only">Grade semanal de atendimento</caption>
                  <thead>
                    <tr className="bg-graphite-50 text-left text-[11px] font-bold uppercase tracking-[.06em] text-graphite-600">
                      <th scope="col" className="px-4 py-2.5">Dia</th>
                      <th scope="col" className="px-4 py-2.5">Horário</th>
                      <th scope="col" className="px-4 py-2.5">Intervalo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.map((d) => (
                      <tr key={d.weekday} className="border-t border-graphite-100">
                        <th scope="row" className="px-4 py-3 text-left font-semibold text-graphite-900">
                          {WEEKDAY_NAMES[d.weekday]}
                        </th>
                        <td className="px-4 py-3 tabular-nums text-graphite-800">
                          {d.enabled ? `${d.start}–${d.end}` : <span className="text-graphite-500">Sem atendimento</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-graphite-600">{d.breakStart ? `${d.breakStart}–${d.breakEnd}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="flex items-center gap-2 text-body font-bold text-graphite-900">
                  <CalendarOff size={16} strokeWidth={1.75} aria-hidden="true" className="text-gold-600" />
                  Bloqueios aprovados
                </h4>
                {approvedBlocks.length === 0 ? (
                  <p className="text-body-sm text-graphite-500">Nenhum bloqueio aprovado.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {approvedBlocks.map((b) => (
                      <li key={b.id} className="hm-striped flex flex-wrap items-center gap-2 rounded-sm border border-graphite-200 px-3 py-2 text-body-sm text-graphite-800">
                        <Lock size={14} strokeWidth={2} aria-hidden="true" />
                        <span className="font-semibold tabular-nums">{weekdayDate(b.date)} · {b.allDay ? 'dia inteiro' : `${b.start}–${b.end}`}</span>
                        <span className="text-graphite-600">— {b.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!canRequest && <p className="text-caption text-graphite-500">Solicitações desativadas pela administração para o seu perfil.</p>}
            </Card>
            <Card title="Minhas solicitações" description="Andamento dos seus pedidos" className="self-start">
              <BlockRequestList
                requests={requests}
                renderActions={(r) =>
                  r.status === 'enviada' ? (
                    <Button variant="ghost" size="sm" leftIcon={Undo2} loading={withdraw.loading} onClick={() => withdraw.run(r.id)} className="self-start">
                      Retirar solicitação
                    </Button>
                  ) : null
                }
              />
            </Card>
          </div>
        )}

        {tab === 'preferencias' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Notificações" description="Como o portal avisa você. Preferências valem para esta sessão (demonstração).">
              <div className="flex flex-col divide-y divide-graphite-100">
                <Switch className="py-3" label="Lembrete da agenda do dia" description="Resumo às 07:30 com suas consultas." checked={form.remindDay} onChange={(v) => set('remindDay', v)} />
                <Switch className="py-3" label="Resumo semanal por e-mail" description="Toda sexta, com a agenda da próxima semana." checked={form.dailySummary} onChange={(v) => set('dailySummary', v)} />
                <Switch className="py-3" label="Aviso de chegada do paciente" description="Quando a recepção registra o check-in." checked={form.checkinAlert} onChange={(v) => set('checkinAlert', v)} />
              </div>
            </Card>
            <Card title="Trabalho" description="Padrões usados no portal.">
              <div className="grid grid-cols-1 gap-4">
                <Select
                  label="Visão padrão da agenda"
                  value={form.defaultView}
                  onChange={(e) => set('defaultView', e.target.value)}
                  options={[
                    { value: 'dia', label: 'Dia' },
                    { value: 'semana', label: 'Semana' },
                    { value: 'mes', label: 'Mês' },
                  ]}
                />
                <Select
                  label="Retorno sugerido padrão"
                  value={form.defaultReturn}
                  onChange={(e) => set('defaultReturn', e.target.value)}
                  hint="Pré-seleciona o retorno ao finalizar um atendimento."
                  options={[
                    { value: '15', label: '15 dias' },
                    { value: '30', label: '30 dias' },
                    { value: '60', label: '60 dias' },
                    { value: '180', label: '6 meses' },
                  ]}
                />
              </div>
            </Card>
          </div>
        )}

        {tab === 'seguranca' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="Alterar senha" description="Demonstração: o acesso é por perfil fictício, sem senha real. O formulário mostra apenas as regras.">
              <form
                className="grid grid-cols-1 gap-4"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  changePassword();
                }}
              >
                <Input label="Senha atual" type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} error={pwdErrors.current} />
                <Input label="Nova senha" type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} error={pwdErrors.next} hint="Mínimo de 8 caracteres, com letras e números." />
                <Input label="Confirmar nova senha" type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} error={pwdErrors.confirm} />
                <Button type="submit" variant="secondary" leftIcon={KeyRound} className="justify-self-start">
                  Alterar senha
                </Button>
              </form>
            </Card>

            <div className="flex flex-col gap-6">
              <Card title="Verificação em duas etapas" description="Código pelo app autenticador a cada novo acesso.">
                <Switch
                  label="Ativar verificação em duas etapas"
                  description={form.twoFactor ? 'Ativa — salve para aplicar.' : 'Recomendado para quem acessa registros clínicos.'}
                  checked={form.twoFactor}
                  onChange={(v) => set('twoFactor', v)}
                />
              </Card>

              <Card title="Meus repasses" description={`Resumo de ${payout.monthLabel}`} action={<Badge tone="gold">Valores fictícios</Badge>}>
                <div className="flex items-center gap-4">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600 ring-1 ring-gold-200">
                    <Wallet size={22} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-overline uppercase text-graphite-500">Previsto no mês</p>
                    <p className="font-display text-kpi tabular-nums text-graphite-900">{formatCurrency(payout.expected)}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-caption text-graphite-500">Atendimentos</dt>
                    <dd className="font-bold tabular-nums text-graphite-900">{payout.attendances}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-graphite-500">Mês anterior</dt>
                    <dd className="font-bold tabular-nums text-graphite-900">{formatCurrency(payout.lastMonthPaid)}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-graphite-500">Próximo repasse</dt>
                    <dd className="font-bold tabular-nums text-graphite-900">
                      {payout.nextPaymentDate ? formatDate(payout.nextPaymentDate, { day: '2-digit', month: '2-digit' }) : '—'}
                    </dd>
                  </div>
                </dl>
                <p className="text-caption text-graphite-500">Detalhamento e comprovantes com o financeiro da clínica. O financeiro geral não é exibido no portal.</p>
              </Card>
            </div>

            <Card title="Sessões ativas" description="Dispositivos conectados à sua conta." className="xl:col-span-2">
              <ul className="flex flex-col divide-y divide-graphite-100">
                <li className="flex flex-wrap items-center gap-3 py-3">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-graphite-50 text-graphite-600">
                    <Laptop size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-graphite-900">
                      Este navegador
                      <Badge tone="success" size="sm" className="ml-2 align-middle">
                        Este dispositivo
                      </Badge>
                    </p>
                    <p className="text-caption text-graphite-500">
                      Sessão de demonstração · {user?.name ?? prof.name}
                      {user?.lastAccess ? ` · último acesso ${formatDate(user.lastAccess, { day: '2-digit', month: '2-digit' })} ${formatTime(user.lastAccess)}` : ''}
                    </p>
                  </div>
                </li>
              </ul>
              <p className="text-caption text-graphite-500">
                Na demonstração não há login real: para sair, use “Sair” no menu. No produto, as sessões vêm do servidor.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Barra Salvar / Descartar */}
      {dirty && (
        <div
          role="region"
          aria-label="Alterações não salvas"
          className="hm-safe-bottom sticky bottom-4 z-20 flex flex-col gap-3 rounded-md border border-graphite-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center"
        >
          <p className="min-w-0 flex-1 text-body-sm font-semibold text-graphite-800">Você tem alterações não salvas.</p>
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={Undo2} onClick={discard} className="flex-1 sm:flex-none">
              Descartar
            </Button>
            <Button leftIcon={Save} loading={saving} onClick={save} className="flex-1 sm:flex-none">
              Salvar alterações
            </Button>
          </div>
        </div>
      )}

      <RequestBlockModal open={modalOpen} onClose={() => setModalOpen(false)} initialKind="disponibilidade" existingRequests={requests} />
    </div>
  );
}
