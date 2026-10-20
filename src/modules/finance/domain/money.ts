/**
 * Valores monetários do Financeiro.
 *
 * O modelo compartilhado guarda `amount` em reais (`number`). Para evitar erros de ponto
 * flutuante (0,1 + 0,2), TODA soma e comparação do módulo é feita em centavos inteiros e só
 * convertida de volta para reais na borda (gravação e exibição).
 */

/** Valor em centavos inteiros. */
export type Cents = number;

/** Teto de sanidade para um único lançamento (R$ 1.000.000,00). */
export const MAX_ENTRY_CENTS: Cents = 100_000_000;

export const toCents = (reais: number): Cents => Math.round(reais * 100);
export const fromCents = (cents: Cents): number => cents / 100;

/** Soma `amount` (reais) em centavos e devolve centavos. */
export function sumCents(list: readonly { amount: number }[]): Cents {
  return list.reduce((total, e) => total + toCents(e.amount), 0);
}

/**
 * Converte o texto digitado ("1.234,56", "1234,5", "1234.56", "R$ 80") em centavos.
 * Devolve `null` para texto vazio, negativo ou com mais de duas casas decimais.
 */
export function parseCurrencyInput(raw: string): Cents | null {
  let s = raw.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) {
    // "1.234" ou "1.234.567": pontos são separadores de milhar.
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ''] = s.split('.');
  return Number(int) * 100 + Number(dec.padEnd(2, '0'));
}

/** Centavos → texto editável ("1234,50"). */
export function centsToInput(cents: Cents): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
