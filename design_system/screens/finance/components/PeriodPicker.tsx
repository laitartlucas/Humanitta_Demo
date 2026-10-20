import { Input, Select } from '@ds/components';
import { PERIOD_PRESET_LABEL, type DateRange, type PeriodPreset } from '@modules/finance/domain';

export interface PeriodPickerProps {
  preset: PeriodPreset;
  onPresetChange: (p: PeriodPreset) => void;
  /** Intervalo do período personalizado (rascunho local da tela). */
  custom: DateRange;
  onCustomChange: (r: DateRange) => void;
}

const PRESETS = Object.keys(PERIOD_PRESET_LABEL) as PeriodPreset[];

const isPreset = (v: string): v is PeriodPreset => (PRESETS as string[]).includes(v);

/** Filtro de período do Financeiro (vale para indicadores, gráficos, listas e exportação). */
export function PeriodPicker({ preset, onPresetChange, custom, onCustomChange }: PeriodPickerProps) {
  const invalid = preset === 'personalizado' && Boolean(custom.from && custom.to && custom.from > custom.to);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <Select
        aria-label="Período"
        controlSize="sm"
        wrapperClassName="sm:w-44"
        options={PRESETS.map((p) => ({ value: p, label: PERIOD_PRESET_LABEL[p] }))}
        value={preset}
        onChange={(e) => {
          if (isPreset(e.target.value)) onPresetChange(e.target.value);
        }}
      />
      {preset === 'personalizado' && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Data inicial"
            type="date"
            value={custom.from}
            max={custom.to || undefined}
            onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
            error={invalid ? 'Início após o fim' : undefined}
          />
          <Input
            aria-label="Data final"
            type="date"
            value={custom.to}
            min={custom.from || undefined}
            onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
