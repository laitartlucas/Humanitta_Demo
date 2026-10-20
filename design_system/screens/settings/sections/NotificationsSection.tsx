import { useState } from 'react';
import { Card } from '@ds/components';
import { notificationSettings } from '@ds/mocks/business';
import type { NotificationSetting } from '@ds/mocks/business';

type Channel = keyof NotificationSetting['channels'];
const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'sistema', label: 'No sistema' },
  { id: 'email', label: 'E-mail' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

export function NotificationsSection() {
  const [items, setItems] = useState<NotificationSetting[]>(notificationSettings);

  const toggle = (id: string, ch: Channel) =>
    setItems((l) => l.map((n) => (n.id === id ? { ...n, channels: { ...n.channels, [ch]: !n.channels[ch] } } : n)));

  return (
    <Card title="Notificações" description="Escolha por onde cada aviso é enviado. Envios são simulados na demonstração.">
      <ul className="flex flex-col divide-y divide-graphite-100">
        {items.map((n) => (
          <li key={n.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-[14px] font-bold text-graphite-900">{n.label}</p>
              <p className="text-[13px] text-graphite-500">{n.description}</p>
            </div>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Canais para {n.label}</legend>
              {CHANNELS.map((c) => {
                const id = `notif-${n.id}-${c.id}`;
                const on = n.channels[c.id];
                return (
                  <label
                    key={c.id}
                    htmlFor={id}
                    className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-colors has-[:focus-visible]:shadow-focus ${
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
  );
}
