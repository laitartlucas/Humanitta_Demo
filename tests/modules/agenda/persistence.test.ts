/**
 * Agente 02 — 9. Persistência: alterações da Agenda vão para o armazenamento ÚNICO do core
 * (localStorage `humanitta:demo:db`) e voltam ao "recarregar a página" (novo carregamento do módulo).
 * Nenhuma chave própria da Agenda é criada.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return Array.from(this.data.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

const storage = new MemoryStorage();
const g = globalThis as unknown as { window?: unknown };

beforeAll(() => {
  g.window = { localStorage: storage, location: { search: '' } };
});
afterAll(() => {
  delete g.window;
});

/** Simula abrir/recarregar a página: módulos novos, mesmo localStorage. */
async function loadApp() {
  vi.resetModules();
  const core = await import('@core');
  const agenda = await import('@modules/agenda/agendaService');
  return { core, agenda };
}

const flush = () => new Promise((r) => setTimeout(r, 250));

describe('9. persistência', () => {
  // Recarrega o core duas vezes (resetModules): timeout maior para máquinas/CI mais lentos.
  it('criação, confirmação e cancelamento sobrevivem ao recarregamento', async () => {
    const first = await loadApp();
    const user = first.core.db.getState().users.find((u) => u.id === 'u-recepcao');
    if (!user) throw new Error('usuário ausente');
    const ctx = first.core.toAccessContext(user);

    const created = first.agenda.createAgendaAppointment(ctx, {
      patientId: 'pac-03',
      professionalId: 'prof-helena',
      service: 'Sessão de fonoterapia',
      start: '2026-10-20T10:30:00',
      durationMin: 45,
    });
    first.agenda.confirmAgendaAppointment(ctx, created.id);
    first.agenda.cancelAgendaAppointment(ctx, 'ag-202', 'Solicitação do paciente');
    await flush();

    expect(storage.getItem(first.core.DB_STORAGE_KEY)).toContain(created.id);
    expect(Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => k?.includes('agenda'))).toEqual([]);

    const second = await loadApp();
    const s = second.core.db.getState();
    expect(s.appointments.find((a) => a.id === created.id)?.status).toBe('confirmada');
    expect(s.appointments.find((a) => a.id === 'ag-202')?.status).toBe('cancelada');
  }, 20_000);
});
