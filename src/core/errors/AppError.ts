/**
 * Erros tipados da aplicação. Os serviços lançam `AppError`; as telas mostram `toast` + mensagem
 * inline a partir de `error.message` (já em pt-BR, pronta para a recepção).
 * Os códigos espelham as respostas HTTP que o backend devolverá.
 */
export type AppErrorCode =
  | 'NOT_FOUND' // 404
  | 'FORBIDDEN' // 403 — perfil sem permissão ou registro fora do escopo
  | 'VALIDATION' // 422 — dados inválidos
  | 'CONFLICT' // 409 — ex.: horário já ocupado
  | 'UNAUTHENTICATED' // 401 — sem sessão
  | 'STORAGE' // falha ao ler/gravar a persistência local
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Erros por campo (VALIDATION). */
  readonly fields?: Record<string, string>;

  constructor(code: AppErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.fields = fields;
  }
}

export const notFound = (what: string) => new AppError('NOT_FOUND', `${what} não encontrado(a).`);
export const forbidden = (message = 'Esta ação não faz parte do seu perfil de acesso.') => new AppError('FORBIDDEN', message);
export const validation = (fields: Record<string, string>, message = 'Revise os campos destacados.') =>
  new AppError('VALIDATION', message, fields);
export const conflict = (message: string) => new AppError('CONFLICT', message);

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Converte qualquer erro em AppError (útil em catch genéricos). */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  console.error('[Humanittá] Erro inesperado:', e);
  return new AppError('UNKNOWN', 'Algo não saiu como esperado. Tente novamente.');
}

/** Resultado explícito para chamadas que a UI quer tratar sem try/catch. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function attempt<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    return { ok: false, error: toAppError(e) };
  }
}
