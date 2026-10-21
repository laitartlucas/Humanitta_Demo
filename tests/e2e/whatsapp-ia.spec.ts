/**
 * Central WhatsApp e Assistente IA SIMULADOS: recebimento simulado, resposta automática,
 * transferência para humano (IA para de responder), envio local, persistência e ambiente de testes.
 * Nenhuma requisição sai para serviços externos.
 */
import { expect, test, type Page } from '@playwright/test';
import { freshStart, login, trackErrors } from './helpers';

async function messagesOf(page: Page, conversationId: string) {
  return page.evaluate((id) => {
    const d = JSON.parse(localStorage.getItem('humanitta:demo:db') ?? '{}');
    return (d.messages ?? []).filter((m: { conversationId: string }) => m.conversationId === id) as { from: string; text: string; at: string }[];
  }, conversationId);
}

test('WhatsApp simulado: IA responde, humano assume, IA silencia e histórico persiste', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  const external: string[] = [];
  // Só são permitidos: o próprio site e o download das fontes do design (Google Fonts, GET).
  const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname === 'localhost') return;
    if (FONT_HOSTS.includes(u.hostname) && r.method() === 'GET') return;
    external.push(`${r.method()} ${r.url()}`);
  });

  await freshStart(page);
  await login(page, 'recepcao');
  await page.goto('./#/whatsapp');
  await expect(page.getByText(/Simulação de WhatsApp|simulad/i).first()).toBeVisible();

  // Carla Menegatti (cv-01) está com o Assistente IA.
  await page.locator('main').getByRole('button', { name: /Carla Menegatti/ }).first().click();
  await page.getByRole('button', { name: 'Simular mensagem recebida' }).click();
  await page.getByRole('button', { name: 'Qual o endereço de vocês?' }).click();
  // Resposta automática simulada (após o "digitando…"): a última mensagem é da IA, com o endereço.
  await expect
    .poll(async () => {
      const list = await messagesOf(page, 'cv-01');
      const last = list[list.length - 1];
      return last ? `${last.from}:${last.text}` : '';
    }, { timeout: 15_000 })
    .toMatch(/^ia:.*Rio Branco/);
  const afterAi = await messagesOf(page, 'cv-01');
  const asked = afterAi[afterAi.length - 2];
  expect(asked.from).toBe('paciente');
  expect(asked.text).toBe('Qual o endereço de vocês?');
  // Ordem cronológica preservada: as novas ficam depois das da semente (até 10:42).
  expect(asked.at > '2026-10-19T10:42:00').toBe(true);
  expect(afterAi[afterAi.length - 1].at > asked.at).toBe(true);

  // Humano assume: envia mensagem local; IA não responde mais.
  await page.getByRole('button', { name: 'Assumir conversa' }).click();
  const composer = page.locator('main').getByRole('textbox').last();
  await composer.fill('Mensagem da recepção (teste E2E).');
  await composer.press('Enter');
  await expect(page.locator('main').getByText('Mensagem da recepção (teste E2E).').first()).toBeVisible();
  const iaCount = (await messagesOf(page, 'cv-01')).filter((m) => m.from === 'ia').length;
  const toggle = page.getByRole('button', { name: 'Simular mensagem recebida' });
  if (await toggle.isVisible()) await toggle.click(); // o painel pode continuar aberto
  await page.getByRole('button', { name: 'Qual o endereço de vocês?' }).click();
  await page.waitForTimeout(4000); // tempo do "digitando…" simulado
  expect((await messagesOf(page, 'cv-01')).filter((m) => m.from === 'ia').length).toBe(iaCount);

  // Recarregar mantém o histórico.
  await page.reload();
  await page.locator('main').getByRole('button', { name: /Carla Menegatti/ }).first().click();
  await expect(page.locator('main').getByText('Mensagem da recepção (teste E2E).').first()).toBeVisible();

  expect(external, 'nenhuma chamada externa').toEqual([]);
  expect(errors).toEqual([]);
});

test('Assistente IA: ambiente de testes responde FAQ e transfere quando pedido', async ({ page }) => {
  const errors = trackErrors(page);
  await freshStart(page);
  await login(page, 'admin');
  await page.goto('./#/assistente');
  await page.getByRole('tab', { name: /Ambiente de testes/ }).click();
  await expect(page.locator('main').getByText(/não é IA real/i)).toBeVisible();
  await page.getByRole('button', { name: 'Qual o endereço de vocês?' }).click();
  await expect(page.locator('main').getByText(/Rio Branco/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('textbox', { name: 'Mensagem de teste' }).fill('Preciso falar com uma atendente');
  await page.getByRole('button', { name: 'Enviar mensagem de teste' }).click();
  await expect(page.locator('main').getByText(/transfer/i).first()).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
