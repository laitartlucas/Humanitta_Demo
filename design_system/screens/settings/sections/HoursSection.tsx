import { useState } from 'react';
import { Button, Card, Switch, useToast } from '@ds/components';
import { clinicHours } from '@ds/mocks/business';
import type { ClinicHours } from '@ds/mocks/business';

const TIME_CLASS =
  'h-10 rounded-sm border border-graphite-200 bg-white px-2 text-[13px] tabular-nums text-graphite-900 focus:border-gold-500 focus:outline-none focus:shadow-focus';

export function HoursSection() {
  const { toast } = useToast();
  const [hours, setHours] = useState<ClinicHours[]>(clinicHours);
  const update = (w: ClinicHours['weekday'], patch: Partial<ClinicHours>) =>
    setHours((l) => l.map((h) => (h.weekday === w ? { ...h, ...patch } : h)));

  const field = (h: ClinicHours, key: 'start' | 'end' | 'lunchStart' | 'lunchEnd', label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`ch-${key}-${h.weekday}`} className="text-[11px] font-semibold text-graphite-500">
        {label}
      </label>
      <input
        id={`ch-${key}-${h.weekday}`}
        type="time"
        value={h[key] ?? ''}
        onChange={(e) => update(h.weekday, { [key]: e.target.value })}
        className={TIME_CLASS}
      />
    </div>
  );

  return (
    <Card
      title="Horário de funcionamento"
      description="Define os horários disponíveis na agenda e no Assistente IA."
      action={
        <Button size="sm" onClick={() => toast({ tone: 'success', title: 'Horários salvos', description: 'Somente nesta demonstração.' })}>
          Salvar horários
        </Button>
      }
    >
      <ul className="flex flex-col divide-y divide-graphite-100">
        {hours.map((h) => (
          <li key={h.weekday} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-end">
            <div className="lg:w-52 lg:pb-2">
              <Switch checked={h.open} onChange={(v) => update(h.weekday, { open: v })} label={h.label} />
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
          </li>
        ))}
      </ul>
    </Card>
  );
}
