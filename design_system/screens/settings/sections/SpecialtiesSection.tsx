import { useState } from 'react';
import { Card, Switch, SPECIALTY_LABEL, SpecialtyTag } from '@ds/components';
import { specialtySettings } from '@ds/mocks/business';
import type { SpecialtySetting } from '@ds/mocks/business';

const DURATIONS = [20, 30, 40, 45, 50, 60, 90];

export function SpecialtiesSection() {
  const [items, setItems] = useState<SpecialtySetting[]>(specialtySettings);
  const update = (s: SpecialtySetting['specialty'], patch: Partial<SpecialtySetting>) =>
    setItems((list) => list.map((i) => (i.specialty === s ? { ...i, ...patch } : i)));

  return (
    <Card title="Especialidades" description="Especialidades divulgadas pela Humanittá. Desative para ocultar da agenda e do Assistente IA.">
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((s) => (
          <li key={s.specialty} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <SpecialtyTag specialty={s.specialty} variant="chip" />
              <span className="text-[12px] text-graphite-500">
                {s.professionals} {s.professionals === 1 ? 'profissional' : 'profissionais'}
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Switch checked={s.active} onChange={(v) => update(s.specialty, { active: v })} label={s.active ? 'Ativa' : 'Inativa'} />
              <div className="flex items-center gap-2">
                <label htmlFor={`dur-${s.specialty}`} className="text-[12px] font-semibold text-graphite-600">
                  Duração padrão
                </label>
                <select
                  id={`dur-${s.specialty}`}
                  value={s.defaultDurationMin}
                  onChange={(e) => update(s.specialty, { defaultDurationMin: Number(e.target.value) })}
                  aria-label={`Duração padrão — ${SPECIALTY_LABEL[s.specialty]}`}
                  className="h-10 rounded-sm border border-graphite-200 bg-white px-2 text-[13px] text-graphite-900 focus:border-gold-500 focus:outline-none focus:shadow-focus"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
