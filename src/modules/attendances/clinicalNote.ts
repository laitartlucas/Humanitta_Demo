/**
 * Agente 05 — registro DEMONSTRATIVO de atendimento.
 *
 * O contrato (`ClinicalRecord.summary: string`) prevê um único texto. A interface oferece campos
 * separados (motivo, observações, evolução, recomendações) e os grava nesse mesmo `summary` em um
 * formato rotulado e reversível — sem campo novo no core (ver docs/change-requests/05-*.md).
 *
 * Todo conteúdo é fictício e digitado manualmente: o sistema não gera diagnóstico, prescrição
 * nem recomendação automática.
 */
import { validation } from '@core';

export type DemoNoteField = 'motivo' | 'observacoes' | 'evolucao' | 'recomendacoes';

export type DemoNote = Record<DemoNoteField, string>;

export const DEMO_NOTE_FIELDS: { key: DemoNoteField; label: string; placeholder: string; rows: number }[] = [
  { key: 'motivo', label: 'Motivo do atendimento (fictício)', placeholder: 'Ex.: retorno de acompanhamento — texto de demonstração', rows: 2 },
  { key: 'observacoes', label: 'Observações demonstrativas', placeholder: 'Anotações fictícias da sessão', rows: 2 },
  { key: 'evolucao', label: 'Evolução demonstrativa', placeholder: 'Evolução fictícia em relação à sessão anterior', rows: 3 },
  { key: 'recomendacoes', label: 'Recomendações fictícias', placeholder: 'Orientações gerais de demonstração (sem prescrição)', rows: 2 },
];

export const DEMO_NOTE_HEADER = '[Registro demonstrativo — conteúdo fictício]';
export const DEMO_NOTE_MAX = 800;

const LABEL: Record<DemoNoteField, string> = {
  motivo: 'Motivo',
  observacoes: 'Observações',
  evolucao: 'Evolução',
  recomendacoes: 'Recomendações',
};

export const emptyDemoNote = (): DemoNote => ({ motivo: '', observacoes: '', evolucao: '', recomendacoes: '' });

/** Campos → texto único gravado em `ClinicalRecord.summary`. */
export function composeDemoNote(note: DemoNote): string {
  const lines = DEMO_NOTE_FIELDS.map(({ key }) => [key, note[key].trim()] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => `${LABEL[k]}: ${v.replace(/\s*\n\s*/g, ' ')}`);
  return [DEMO_NOTE_HEADER, ...lines].join('\n');
}

/** Texto do `summary` → campos. Textos antigos (sem rótulos) vão para "Observações". */
export function parseDemoNote(summary: string): DemoNote {
  const note = emptyDemoNote();
  const body = summary.replace(DEMO_NOTE_HEADER, '').trim();
  let matched = false;
  for (const line of body.split('\n')) {
    const field = (Object.keys(LABEL) as DemoNoteField[]).find((k) => line.startsWith(`${LABEL[k]}: `));
    if (field) {
      note[field] = line.slice(LABEL[field].length + 2).trim();
      matched = true;
    }
  }
  if (!matched && body) note.observacoes = body;
  return note;
}

/** Padrões de identificação que não podem entrar na demonstração (CPF, CNS, e-mail, telefone). */
const IDENTIFIERS: RegExp[] = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF
  /\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Cartão Nacional de Saúde
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // e-mail
  /\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/, // telefone
];

/**
 * Valida o registro: ao menos um campo, limite de tamanho, declaração de conteúdo fictício e
 * nenhum identificador pessoal. Lança `AppError('VALIDATION')` com `fields` por campo.
 */
export function validateDemoNote(note: DemoNote, fictitiousConfirmed: boolean): void {
  const fields: Record<string, string> = {};
  const filled = DEMO_NOTE_FIELDS.filter(({ key }) => note[key].trim());
  if (!filled.length) fields.motivo = 'Preencha ao menos um campo do registro demonstrativo.';
  for (const { key } of DEMO_NOTE_FIELDS) {
    const v = note[key];
    if (v.length > DEMO_NOTE_MAX) fields[key] = `Use no máximo ${DEMO_NOTE_MAX} caracteres.`;
    else if (IDENTIFIERS.some((re) => re.test(v))) fields[key] = 'Não inclua documentos, telefones ou e-mails — use apenas texto fictício.';
  }
  if (!fictitiousConfirmed) fields.ficticio = 'Confirme que o conteúdo é fictício e destinado à demonstração.';
  if (Object.keys(fields).length) throw validation(fields);
}
