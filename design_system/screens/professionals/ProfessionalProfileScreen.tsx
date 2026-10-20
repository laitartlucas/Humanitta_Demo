import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, DoorOpen, Pencil, Save, Stethoscope, UserX, Wallet } from 'lucide-react';
import type { Professional } from '@ds/mocks/types';
import {
  AppointmentCard,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  SpecialtyTag,
  Switch,
  useToast,
} from '@ds/components';
import { cn } from '@ds/foundations/cn';
import {
  DEMO_TODAY,
  DEMO_WEEK,
  ROOM_USAGE,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  appointments,
  formatCurrency,
  getProfessionalById,
  getRoomName,
  isSameDay,
  professionals,
  toDateKey,
} from '@ds/mocks/clinical';
import { EditProfessionalModal } from './modals';

export interface ProfessionalProfileScreenProps {
  professionalId?: string;
  onBack?: () => void;
}

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DaySchedule {
  weekday: Weekday;
  enabled: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const WEEK_KEYS = DEMO_WEEK.map(toDateKey);

function scheduleFrom(p: Professional): DaySchedule[] {
  return WEEK_ORDER.map((wd) => {
    const w = p.workingHours.find((x) => x.weekday === wd);
    return {
      weekday: wd,
      enabled: Boolean(w),
      start: w?.start ?? '08:00',
      end: w?.end ?? '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    };
  });
}

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function ProfessionalProfileScreen({ professionalId = 'prof-lauren', onBack }: ProfessionalProfileScreenProps) {
  const { toast } = useToast();
  const [prof, setProf] = useState<Professional | undefined>(() => getProfessionalById(professionalId) ?? professionals[0]);
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => (prof ? scheduleFrom(prof) : []));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const p = getProfessionalById(professionalId);
    setProf(p);
    setSchedule(p ? scheduleFrom(p) : []);
    setDirty(false);
  }, [professionalId]);

  const weekAppts = useMemo(
    () =>
      prof
        ? appointments
            .filter((a) => a.professionalId === prof.id && WEEK_KEYS.some((k) => a.start.startsWith(k)))
            .sort((a, b) => a.start.localeCompare(b.start))
        : [],
    [prof],
  );

  if (!prof) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Profissional não encontrado"
          description="Volte para a lista e selecione um profissional."
          action={
            onBack ? (
              <Button variant="secondary" leftIcon={ArrowLeft} onClick={onBack}>
                Voltar
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  const active = weekAppts.filter((a) => a.status !== 'cancelada');
  const weekRevenue = active.reduce((s, a) => s + a.price, 0);
  const weeklyHours = schedule.filter((d) => d.enabled).reduce((s, d) => s + Math.max(0, minutes(d.end) - minutes(d.start) - (minutes(d.breakEnd) - minutes(d.breakStart))), 0) / 60;
  const errors = schedule.map((d) => (d.enabled && minutes(d.end) <= minutes(d.start) ? 'O término deve ser após o início.' : undefined));
  const hasErrors = errors.some(Boolean);

  function patch(wd: Weekday, p: Partial<DaySchedule>) {
    setSchedule((s) => s.map((d) => (d.weekday === wd ? { ...d, ...p } : d)));
    setDirty(true);
  }

  function saveSchedule() {
    if (!prof || hasErrors) return;
    setSaving(true);
    window.setTimeout(() => {
      setProf({
        ...prof,
        workingHours: schedule.filter((d) => d.enabled).map((d) => ({ weekday: d.weekday, start: d.start, end: d.end })),
      });
      setSaving(false);
      setDirty(false);
      toast({ tone: 'success', title: 'Horários salvos', description: `Disponibilidade de ${prof.name} atualizada.` });
    }, 600);
  }

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <div>
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={onBack}>
            Profissionais
          </Button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-lg border border-graphite-200 bg-white p-5 shadow-sm md:p-6" aria-label="Perfil do profissional">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[1.5px] border-gold-300" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={prof.name} src={prof.avatarUrl} size="xl" ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-display-md text-graphite-900">{prof.name}</h1>
              {prof.isDemo ? <Badge tone="neutral">Demo</Badge> : <Badge tone="gold">Responsável Técnica</Badge>}
            </div>
            <p className="mt-1 text-sm text-graphite-600">{prof.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-graphite-500">
              <SpecialtyTag specialty={prof.specialty} variant="chip" />
              {prof.registry && <span>{prof.registry}</span>}
              <span className="flex items-center gap-1.5">
                <DoorOpen size={16} strokeWidth={1.75} aria-hidden="true" />
                {getRoomName(prof.roomId ?? '')} · {ROOM_USAGE[prof.roomId ?? ''] ?? '—'}
              </span>
            </div>
          </div>
          <Button variant="secondary" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
            Editar perfil
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ocupação" value={`${Math.round(prof.occupancy * 100)}%`} icon={Stethoscope} progress={Math.round(prof.occupancy * 100)} />
        <KpiCard label="Consultas na semana" value={String(active.length)} icon={CalendarDays} />
        <KpiCard label="Horas disponíveis" value={`${weeklyHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`} icon={Clock} footer="por semana" />
        <KpiCard label="Produção · semana" value={formatCurrency(weekRevenue)} icon={Wallet} tone="success" footer="valor fictício" />
      </div>

      <Card title="Agenda da semana" description="19 a 24 de outubro de 2026">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {DEMO_WEEK.map((d) => {
            const key = toDateKey(d);
            const dayItems = weekAppts.filter((a) => a.start.startsWith(key));
            const works = prof.workingHours.find((w) => w.weekday === d.getDay());
            const today = isSameDay(d, DEMO_TODAY);
            return (
              <section
                key={key}
                aria-label={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                className={cn('flex min-h-[140px] flex-col gap-2 rounded-md border p-3', today ? 'border-gold-300 bg-gold-50/50' : 'border-graphite-200')}
              >
                <header className="flex items-baseline justify-between">
                  <span className={cn('text-overline uppercase tracking-[0.08em]', today ? 'text-gold-700' : 'text-graphite-500')}>
                    {WEEKDAY_SHORT[d.getDay()]} {d.getDate()}
                  </span>
                  <span className="text-xs tabular-nums text-graphite-500">{works ? `${works.start}–${works.end}` : 'Folga'}</span>
                </header>
                {dayItems.length === 0 ? (
                  <p className="text-xs text-graphite-400">{works ? 'Sem consultas' : '—'}</p>
                ) : (
                  dayItems.map((a) => <AppointmentCard key={a.id} appointment={a} variant="compact" />)
                )}
              </section>
            );
          })}
        </div>
      </Card>

      <Card
        title="Configuração de horários"
        description="Defina os dias e horários de atendimento. Alterações valem para novos agendamentos."
        action={
          <Button size="sm" leftIcon={Save} onClick={saveSchedule} disabled={!dirty || hasErrors} loading={saving}>
            Salvar horários
          </Button>
        }
      >
        <ul className="flex flex-col divide-y divide-graphite-100">
          {schedule.map((d, i) => (
            <li key={d.weekday} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
              <div className="lg:w-56">
                <Switch
                  checked={d.enabled}
                  onChange={(v) => patch(d.weekday, { enabled: v })}
                  label={WEEKDAY_NAMES[d.weekday]}
                  description={d.enabled ? 'Atende' : 'Sem expediente'}
                />
              </div>
              <fieldset
                disabled={!d.enabled}
                className={cn('grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4', !d.enabled && 'opacity-50')}
              >
                <legend className="sr-only">Horários de {WEEKDAY_NAMES[d.weekday]}</legend>
                {(
                  [
                    ['start', 'Início'],
                    ['end', 'Término'],
                    ['breakStart', 'Intervalo de'],
                    ['breakEnd', 'Intervalo até'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-1 text-xs font-semibold text-graphite-600">
                    {label}
                    <input
                      type="time"
                      step={900}
                      value={d[field]}
                      onChange={(e) => patch(d.weekday, { [field]: e.target.value })}
                      aria-invalid={field === 'end' && Boolean(errors[i])}
                      className={cn(
                        'h-10 rounded-sm border bg-white px-3 text-sm font-medium tabular-nums text-graphite-900 focus-visible:border-gold-500 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed',
                        field === 'end' && errors[i] ? 'border-danger' : 'border-graphite-200',
                      )}
                    />
                  </label>
                ))}
              </fieldset>
              {errors[i] && (
                <p role="alert" className="text-xs font-semibold text-danger lg:w-40">
                  {errors[i]}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <EditProfessionalModal
        open={editOpen}
        professional={prof}
        onClose={() => setEditOpen(false)}
        onSave={(p) => {
          setProf(p);
          setEditOpen(false);
          toast({ tone: 'success', title: 'Perfil atualizado', description: p.name });
        }}
      />
    </div>
  );
}
