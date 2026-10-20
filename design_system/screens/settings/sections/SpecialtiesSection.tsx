import { Card, SpecialtyTag, Switch } from '@ds/components';
import { settingsService, useAction, useCan, useProfessionals, useServices, useSpecialties } from '@core';
import { INLINE_SELECT, ReadOnlyNote } from './shared';

const DURATIONS = [20, 30, 40, 45, 50, 60, 90];

/** Configurações › Especialidades — `updateSpecialty` (ativa/inativa e duração padrão). */
export function SpecialtiesSection() {
  const specialties = useSpecialties();
  const professionals = useProfessionals();
  const services = useServices();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateSpecialty, { success: 'Especialidade atualizada' });

  return (
    <div className="flex flex-col gap-4">
      {!canEdit && <ReadOnlyNote />}
      <Card title="Especialidades" description="Especialidades divulgadas pela Humanittá. Desative para ocultar da agenda e do Assistente IA.">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {specialties.map((s) => {
            const pros = professionals.filter((p) => p.specialty === s.id).length;
            const svc = services.filter((sv) => sv.specialty === s.id && sv.active).length;
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <SpecialtyTag specialty={s.id} variant="chip" />
                  <span className="text-right text-[12px] text-graphite-500">
                    {pros} {pros === 1 ? 'profissional' : 'profissionais'} · {svc} {svc === 1 ? 'serviço ativo' : 'serviços ativos'}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Switch
                    checked={s.active}
                    disabled={!canEdit || update.loading}
                    onChange={(v) => void update.run(s.id, { active: v })}
                    label={s.active ? 'Ativa' : 'Inativa'}
                  />
                  <div className="flex items-center gap-2">
                    <label htmlFor={`dur-${s.id}`} className="text-[12px] font-semibold text-graphite-600">
                      Duração padrão
                    </label>
                    <select
                      id={`dur-${s.id}`}
                      value={s.defaultDurationMin}
                      disabled={!canEdit || update.loading}
                      onChange={(e) => void update.run(s.id, { defaultDurationMin: Number(e.target.value) })}
                      aria-label={`Duração padrão — ${s.name}`}
                      className={INLINE_SELECT}
                    >
                      {Array.from(new Set([...DURATIONS, s.defaultDurationMin]))
                        .sort((a, b) => a - b)
                        .map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
