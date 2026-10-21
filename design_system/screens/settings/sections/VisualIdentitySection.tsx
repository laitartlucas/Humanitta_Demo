import { Save, Upload } from 'lucide-react';
import { Button, Card, Logo, SegmentedControl, useToast } from '@ds/components';
import type { VisualIdentitySetting } from '@ds/mocks/business';
import { settingsService, useAction, useCan, useClinicSettings } from '@core';
import { useSettingsDraft } from '../draft';

const PALETTE: { name: string; hex: string; role: string }[] = [
  { name: 'Dourado 600', hex: '#8F6425', role: 'Botões e links' },
  { name: 'Dourado 500', hex: '#B5832F', role: 'Marca e gráficos' },
  { name: 'Dourado 300', hex: '#DDB872', role: 'Detalhes' },
  { name: 'Grafite 900', hex: '#1E1D1B', role: 'Texto e menu' },
  { name: 'Grafite 500', hex: '#77736B', role: 'Texto secundário' },
  { name: 'Marfim', hex: '#FAF8F4', role: 'Fundo' },
];

/** Configurações › Identidade visual — variante do logotipo em `clinicSettings.visualIdentity`. */
export function VisualIdentitySection() {
  const { toast } = useToast();
  const settings = useClinicSettings();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateClinicSettings);
  const { value, setDraft, dirty, save, saving } = useSettingsDraft<VisualIdentitySetting>(
    'identidade',
    settings.visualIdentity,
    (visualIdentity) => update.run({ visualIdentity }),
    { success: 'Identidade visual salva' },
  );
  const variant = value.logoVariant;

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Logotipo"
        description="Usado no menu, login, recibos e documentos."
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={Upload}
              disabled={!canEdit}
              onClick={() => toast({ tone: 'info', title: 'Envio de logotipo em breve', description: 'Nesta demonstração nenhum arquivo é enviado.' })}
            >
              Substituir
            </Button>
            {canEdit && (
              <Button size="sm" leftIcon={Save} onClick={() => void save()} loading={saving} disabled={!dirty}>
                Salvar
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <SegmentedControl
            size="sm"
            ariaLabel="Variante do logotipo"
            value={variant}
            onChange={(v) => canEdit && setDraft((d) => ({ ...d, logoVariant: v === 'mark' ? 'mark' : 'full' }))}
            options={[
              { value: 'full', label: 'Completo' },
              { value: 'mark', label: 'Símbolo' },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex h-40 items-center justify-center rounded-md border border-graphite-200 bg-white">
              <Logo variant={variant} tone="dark" size={variant === 'full' ? 56 : 72} />
            </div>
            <div className="flex h-40 items-center justify-center rounded-md bg-graphite-900">
              <Logo variant={variant} tone="light" size={variant === 'full' ? 56 : 72} />
            </div>
          </div>
        </div>
      </Card>
      <Card title="Cores da marca" description="Paleta derivada do logotipo e das publicações da Humanittá. Definida pelo design system.">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {PALETTE.map((c) => (
            <li key={c.hex} className="overflow-hidden rounded-md border border-graphite-200">
              <div className="h-16" style={{ background: c.hex }} aria-hidden="true" />
              <div className="p-3">
                <p className="text-[13px] font-bold text-graphite-900">{c.name}</p>
                <p className="text-[12px] tabular-nums text-graphite-500">{c.hex}</p>
                <p className="text-[12px] text-graphite-600">{c.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Tipografia">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-md border border-graphite-200 p-4">
            <p className="text-overline uppercase tracking-[.08em] text-graphite-500">Títulos</p>
            <p className="font-display text-[34px] font-semibold leading-tight text-graphite-900">Saúde Integral</p>
            <p className="text-[12px] text-graphite-500">{value.displayFont}</p>
          </div>
          <div className="rounded-md border border-graphite-200 p-4">
            <p className="text-overline uppercase tracking-[.08em] text-graphite-500">Interface</p>
            <p className="text-[18px] font-semibold text-graphite-900">Acolhedor, elegante e direto.</p>
            <p className="text-[12px] text-graphite-500">{value.bodyFont}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
