import { Button, Card, Switch } from '@ds/components';
import type { ClinicHours } from '@ds/mocks/business';
import { settingsService, useAction, useCan, useClinicSettings } from '@core';
import { useSettingsDraft } from '../draft';
import { ReadOnlyNote } from './shared';

const TIME_CLASS =
  'h-10 rounded-sm border bg-white px-2 text-[13px] tabular-nums text-graphite-900 focus:border-gold-500 focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-graphite-50';

/** Abertura < fechamento e intervalo (se informado) dentro do expediente. */
export function validateHours(hours: ClinicHours[]): Record<string, string> {
  const e: Record<string, string> = {};
  for (const h of hours) {
    if (!h.open) continue;
    if (!h.start || !h.end || h.start >= h.end) e[`end-${h.weekday}`] = `${h.label}: o fechamento deve ser depois da abertura.`;
    const hasLunch = Boolean(h.lunchStart || h.lunchEnd);
    if (hasLunch) {
      if (!h.lunchStart || !h.lunchEnd || h.lunchStart >= h.lunchEnd) e[`lunchEnd-${h.weekday}`] = `${h.label}: o intervalo deve terminar depois de começar.`;
      else if (h.lunchStart < h.start || h.lunchEnd > h.end) e[`lunchStart-${h.weekday}`] = `${h.label}: o intervalo deve estar dentro do expediente.`;
    }
  }
  return e;
}

/** Configurações › Horários — `clinicSettings.hours` via `updateClinicSettings`. */
export function HoursSection() {
  const settings = useClinicSettings();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateClinicSettings);
  const { value: hours, setDraft, dirty, save, saving, errors } = useSettingsDraft<ClinicHours[]>(
    'horarios',
    settings.hours,
    (h) => update.run({ hours: h }),
    { validate: validateHours, success: 'Horários salvos' },
  );
  const updateDay = (w: ClinicHours['weekday'], patch: Partial<ClinicHours>) =>
    setDraft((l) => l.map((h) => (h.weekday === w ? { ...h, ...patch } : h)));

  const field = (h: ClinicHours, key: 'start' | 'end' | 'lunchStart' | 'lunchEnd', label: string) => {
    const err = errors[`${key}-${h.weekday}`];
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`ch-${key}-${h.weekday}`} className="text-[11px] font-semibold text-graphite-500">
          {label}
        </label>
        <input
          id={`ch-${key}-${h.weekday}`}
          type="time"
          value={h[key] ?? ''}
          disabled={!canEdit}
          aria-invalid={err ? true : undefined}
          onChange={(e) => updateDay(h.weekday, { [key]: e.target.value })}
          className={`${TIME_CLASS} ${err ? 'border-danger' : 'border-graphite-200'}`}
        />
      </div>
    );
  };

  const dayErrors = (w: number) => ['end', 'lunchStart', 'lunchEnd'].map((k) => errors[`${k}-${w}`]).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {!canEdit && <ReadOnlyNote />}
      <Card
        title="Horário de funcionamento"
        description="Define os horários disponíveis na agenda e no Assistente IA."
        action={
          canEdit ? (
            <Button size="sm" onClick={() => void save()} loading={saving} disabled={!dirty}>
              Salvar horários
            </Button>
          ) : undefined
        }
      >
        <ul className="flex flex-col divide-y divide-graphite-100">
          {hours.map((h) => (
            <li key={h.weekday} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="lg:w-52 lg:pb-2">
                  <Switch checked={h.open} disabled={!canEdit} onChange={(v) => updateDay(h.weekday, { open: v })} label={h.label} />
                </div>
                {h.open ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {field(h, 'start', 'Abertura')}
                    {field(h, 'end', 'Fechamento')}
                    {field(h, 'lunchStart', 'Intervalo — início')}
                    {field(h, 'lunchEnd', 'Intervalo — fim')}
                  </div>
                ) : (
                  <span className="text-[13px] text-graphite-500 lg:pb-2">Fechado</span>
                )}
              </div>
              {dayErrors(h.weekday).map((m) => (
                <p key={m} className="text-xs text-danger">
                  {m}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
