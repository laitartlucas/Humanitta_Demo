/**
 * CSV para Excel pt-BR: separador ";", BOM UTF-8, aspas duplicadas e proteção contra
 * injeção de fórmulas (células iniciadas por = + - @ recebem apóstrofo).
 */

export type CsvCell = string | number | null | undefined;

export interface CsvTable {
  /** Nome do arquivo sem extensão. */
  filename: string;
  headers: string[];
  rows: CsvCell[][];
}

const NUMBER = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

/** Valor monetário/decimal no formato aceito pelo Excel em pt-BR (vírgula decimal, sem milhar). */
export function csvDecimal(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '' : NUMBER.format(v);
}

export function csvPercent(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : `${csvDecimal(v * 100)}%`;
}

export function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '';
  let text = typeof cell === 'number' ? String(cell) : cell;
  const isNumeric = /^-?\d+(,\d+)?%?$/.test(text);
  if (typeof cell === 'string' && !isNumeric && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(table: Pick<CsvTable, 'headers' | 'rows'>): string {
  const lines = [table.headers, ...table.rows].map((row) => row.map(escapeCsvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Nome de arquivo seguro: minúsculas, sem acentos nem espaços. */
export function safeFilename(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'relatorio'
  );
}

/** Dispara o download no navegador (sem servidor). Devolve false se o ambiente não permitir. */
export function downloadCsv(table: CsvTable): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const blob = new Blob([toCsv(table)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename(table.filename)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
