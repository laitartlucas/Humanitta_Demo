import { DoorOpen } from 'lucide-react';
import { Card, SpecialtyTag, Switch } from '@ds/components';
import { settingsService, useAction, useCan, useRooms } from '@core';
import { ReadOnlyNote } from './shared';

/** Configurações › Salas — disponibilidade para agendamento via `updateRoom`. */
export function RoomsSection() {
  const rooms = useRooms();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateRoom, { success: 'Sala atualizada' });

  return (
    <div className="flex flex-col gap-4">
      {!canEdit && <ReadOnlyNote />}
      <Card title="Salas" description="Conforme a placa da recepção. Usadas para evitar conflitos na agenda.">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-300 text-gold-600">
                  <DoorOpen size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-graphite-900">{r.name}</h3>
                  <p className="text-[13px] text-graphite-600">{r.label}</p>
                </div>
              </div>
              {r.specialty && <SpecialtyTag specialty={r.specialty} variant="chip" />}
              {r.note && <p className="text-[12px] text-graphite-500">{r.note}</p>}
              <Switch
                checked={r.active}
                disabled={!canEdit || update.loading}
                label={r.active ? 'Disponível para agendamento' : 'Indisponível'}
                onChange={(v) => void update.run(r.id, { active: v })}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
