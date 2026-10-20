/**
 * Agente 06 — cenário 16: alterações do Financeiro sobrevivem a um "recarregamento".
 * Simula o navegador com um localStorage em memória e reimporta o core (novo carregamento do app),
 * usando a persistência compartilhada (`humanitta:demo:db`) — o módulo não tem armazenamento próprio.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

function fakeWindow() {
  const data = new Map<string, string>();
  return {
    data,
    window: {
      location: { search: '' },
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
        removeItem: (k: string) => void data.delete(k),
      },
    },
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('persistência', () => {
  it('16. lançamento criado e pagamento registrado continuam após recarregar', async () => {
    const fake = fakeWindow();
    vi.stubGlobal('window', fake.window);
    vi.resetModules();

    const core = await import('@core');
    const fin = await import('@modules/finance/domain');
    core.resetDemoData();
    const user = core.db.getState().users.find((u) => u.id === 'u-financeiro')!;
    const ctx = core.toAccessContext(user);
    const created = fin.createFinanceEntry(ctx, {
      type: 'despesa',
      description: 'Revisão do ar-condicionado',
      category: 'Manutenção',
      amountCents: 45_000,
      date: '2026-10-18',
      dueDate: '2026-10-28',
      method: 'pix',
      status: 'pendente',
    });
    fin.registerFinancePayment(ctx, 'fe-003', { amountCents: 145_000, method: 'pix', paidAt: '2026-10-19' });
    await wait(300); // debounce da persistência compartilhada (150 ms)

    // Nada além da chave compartilhada foi gravado.
    expect([...fake.data.keys()]).toEqual([core.DB_STORAGE_KEY]);

    vi.resetModules();
    const reloaded = await import('@core');
    const state = reloaded.db.getState();
    expect(state.financialEntries.find((e) => e.id === created.id)?.amount).toBe(450);
    expect(state.financialEntries.find((e) => e.id === 'fe-003')?.status).toBe('pago');
  }, 60_000); // reimportar o core inteiro duas vezes é lento na primeira transformação
});
