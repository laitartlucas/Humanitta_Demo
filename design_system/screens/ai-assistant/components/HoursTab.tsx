import { Card, Switch, Textarea } from '@ds/components';
import type { AiBusinessHours } from '@ds/mocks/business';
import type { AiTabProps } from './IdentityTab';

export function HoursTab({ config, onChange }: AiTabProps) {
  const update = (weekday: AiBusinessHours['weekday'], patch: Partial<AiBusinessHours>) =>
    onChange({ hours: config.hours.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)) });

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Horário de atendimento humano"
        description="Fora destes horários, o assistente avisa que a equipe retorna no próximo período útil."
      >
        <ul className="flex flex-col divide-y divide-graphite-100">
          {config.hours.map((h) => (
            <li key={h.weekday} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="sm:w-56">
                <Switch checked={h.open} onChange={(v) => update(h.weekday, { open: v })} label={h.label} />
              </div>
              {h.open ? (
                <div className="flex items-center gap-2 text-[13px]">
                  <label className="sr-only" htmlFor={`ai-h-start-${h.weekday}`}>
                    Início — {h.label}
                  </label>
                  <input
                    id={`ai-h-start-${h.weekday}`}
                    type="time"
                    value={h.start}
                    onChange={(e) => update(h.weekday, { start: e.target.value })}
                    className="h-10 rounded-sm border border-graphite-200 bg-white px-3 tabular-nums text-graphite-900 focus:border-gold-500 focus:outline-none focus:shadow-focus"
                  />
                  <span className="text-graphite-500">até</span>
                  <label className="sr-only" htmlFor={`ai-h-end-${h.weekday}`}>
                    Fim — {h.label}
                  </label>
                  <input
                    id={`ai-h-end-${h.weekday}`}
                    type="time"
                    value={h.end}
                    onChange={(e) => update(h.weekday, { end: e.target.value })}
                    className="h-10 rounded-sm border border-graphite-200 bg-white px-3 tabular-nums text-graphite-900 focus:border-gold-500 focus:outline-none focus:shadow-focus"
                  />
                </div>
              ) : (
                <span className="text-[13px] text-graphite-500">Sem atendimento humano — somente assistente</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Mensagem fora do horário">
        <Textarea
          label="Texto enviado fora do horário"
          rows={4}
          value={config.outOfHoursMessage}
          onChange={(e) => onChange({ outOfHoursMessage: e.target.value })}
        />
      </Card>
    </div>
  );
}
