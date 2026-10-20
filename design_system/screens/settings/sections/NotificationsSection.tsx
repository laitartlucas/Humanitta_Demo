import { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button, Card, ConfirmDialog } from '@ds/components';
import type { NotificationSetting } from '@ds/mocks/business';
import { createSeed, settingsService, useAction, useCan, useClinicSettings } from '@core';
import { useSettingsDraft } from '../draft';
import { ReadOnlyNote } from './shared';

type Channel = keyof NotificationSetting['channels'];
const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'sistema', label: 'No sistema' },
  { id: 'email', label: 'E-mail' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

/** Configurações › Notificações — preferências demonstrativas (nenhum envio real). */
export function NotificationsSection() {
  const settings = useClinicSettings();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateClinicSettings);
  const [confirmReset, setConfirmReset] = useState(false);
  const { value: items, setDraft, dirty, save, saving } = useSettingsDraft<NotificationSetting[]>(
    'notificacoes',
    settings.notifications,
    (n) => update.run({ notifications: n }),
    { success: 'Preferências de notificação salvas' },
  );

  const toggle = (id: string, ch: Channel) =>
    setDraft((l) => l.map((n) => (n.id === id ? { ...n, channels: { ...n.channels, [ch]: !n.channels[ch] } } : n)));

  async function restoreDefaults() {
    const ok = await update.run({ notifications: createSeed().clinicSettings.notifications });
    setConfirmReset(false);
    if (ok) setDraft(() => createSeed().clinicSettings.notifications);
  }

  return (
    <div className="flex flex-col gap-4">
      {!canEdit && <ReadOnlyNote />}
      <Card
        title="Notificações"
        description="Escolha por onde cada aviso é enviado. Na demonstração nenhum e-mail, SMS ou WhatsApp é enviado de verdade."
        action={
          canEdit ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" leftIcon={RotateCcw} onClick={() => setConfirmReset(true)}>
                Restaurar padrão
              </Button>
              <Button size="sm" leftIcon={Save} onClick={() => void save()} loading={saving} disabled={!dirty}>
                Salvar
              </Button>
            </div>
          ) : undefined
        }
      >
        <ul className="flex flex-col divide-y divide-graphite-100">
          {items.map((n) => (
            <li key={n.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="text-[14px] font-bold text-graphite-900">{n.label}</p>
                <p className="text-[13px] text-graphite-500">{n.description}</p>
              </div>
              <fieldset className="flex flex-wrap gap-2" disabled={!canEdit}>
                <legend className="sr-only">Canais para {n.label}</legend>
                {CHANNELS.map((c) => {
                  const id = `notif-${n.id}-${c.id}`;
                  const on = n.channels[c.id];
                  return (
                    <label
                      key={c.id}
                      htmlFor={id}
                      className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-colors has-[:focus-visible]:shadow-focus has-[:disabled]:cursor-not-allowed ${
                        on ? 'border-gold-300 bg-gold-50 text-gold-700' : 'border-graphite-200 bg-white text-graphite-600 hover:bg-graphite-50'
                      }`}
                    >
                      <input id={id} type="checkbox" className="h-4 w-4 accent-[#8F6425]" checked={on} onChange={() => toggle(n.id, c.id)} />
                      {c.label}
                    </label>
                  );
                })}
              </fieldset>
            </li>
          ))}
        </ul>
      </Card>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => void restoreDefaults()}
        title="Restaurar notificações padrão?"
        description="Os canais voltam aos valores de demonstração originais. Esta ação substitui as preferências salvas."
        confirmLabel="Restaurar"
        tone="primary"
        loading={update.loading}
      />
    </div>
  );
}
