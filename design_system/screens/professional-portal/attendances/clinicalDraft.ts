/**
 * Registro clínico do Portal: os 4 campos do formulário são gravados como UM texto em
 * `ClinicalRecord.summary` (o core guarda só o resumo). Formato estável "Rótulo: valor" por linha,
 * para reabrir o rascunho nos mesmos campos.
 */
export type ClinicalField = 'queixa' | 'procedimento' | 'evolucao' | 'conduta';
export type ClinicalDraft = Record<ClinicalField, string>;

export const CLINICAL_FIELDS: { key: ClinicalField; label: string; rows: number }[] = [
  { key: 'queixa', label: 'Queixa / motivo da consulta', rows: 2 },
  { key: 'procedimento', label: 'Procedimento realizado', rows: 3 },
  { key: 'evolucao', label: 'Evolução', rows: 3 },
  { key: 'conduta', label: 'Conduta e orientações', rows: 2 },
];

export const EMPTY_DRAFT: ClinicalDraft = { queixa: '', procedimento: '', evolucao: '', conduta: '' };

/** Campos → texto do prontuário (campos vazios são omitidos). */
export function composeClinicalSummary(draft: ClinicalDraft): string {
  return CLINICAL_FIELDS.filter((f) => draft[f.key].trim())
    .map((f) => `${f.label}: ${draft[f.key].trim().replace(/\n+/g, ' ')}`)
    .join('\n');
}

/** Texto do prontuário → campos. Texto livre (ex.: resumos da semente) vai para "Evolução". */
export function parseClinicalSummary(summary: string | undefined): ClinicalDraft {
  if (!summary?.trim()) return { ...EMPTY_DRAFT };
  const draft: ClinicalDraft = { ...EMPTY_DRAFT };
  let matched = false;
  summary.split('\n').forEach((line) => {
    const field = CLINICAL_FIELDS.find((f) => line.startsWith(`${f.label}: `));
    if (field) {
      draft[field.key] = line.slice(field.label.length + 2);
      matched = true;
    }
  });
  if (!matched) draft.evolucao = summary.trim();
  return draft;
}
