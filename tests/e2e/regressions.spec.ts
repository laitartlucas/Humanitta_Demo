/**
 * Regressões encontradas no ensaio da apresentação (Agente 09).
 */
import { expect, test } from '@playwright/test';
import { freshStart, login } from './helpers';

test('Finalizar atendimento: a confirmação marcada não se desfaz enquanto o cronômetro avança', async ({ page }) => {
  await freshStart(page);
  await login(page, 'profissional', 'u-prof-lauren');
  await page.goto('./#/portal/atendimentos');
  await page.getByRole('button', { name: 'Finalizar atendimento' }).click();
  const dialog = page.getByRole('dialog');
  const reviewed = dialog.getByRole('checkbox', { name: /Revisei o registro clínico/ });
  await reviewed.check();
  await dialog.getByLabel('Recado para a recepção (opcional)').fill('Prefere horários pela manhã.');
  await page.waitForTimeout(4000); // o cronômetro do atendimento re-renderiza a tela a cada segundo
  await expect(reviewed).toBeChecked();
  await expect(dialog.getByLabel('Recado para a recepção (opcional)')).toHaveValue('Prefere horários pela manhã.');
  await dialog.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.getByText('Atendimento finalizado')).toBeVisible();
});

test('WhatsApp: a entrega simulada não grava no banco depois que a tela é fechada', async ({ page }) => {
  await freshStart(page);
  await login(page, 'recepcao');
  await page.goto('./#/whatsapp');
  await page.locator('main').getByRole('button', { name: /João Pedro Basso/ }).first().click(); // já em atendimento humano
  const composer = page.locator('main').getByRole('textbox').last();
  await composer.fill('Mensagem de regressão (teste).');
  await composer.press('Enter');
  await expect(page.locator('main').getByText('Mensagem de regressão (teste).').first()).toBeVisible();
  await page.goto('./#/agenda'); // sai da Central imediatamente
  await page.waitForTimeout(3500); // além dos 2,4 s da simulação de "lida"
  const status = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('humanitta:demo:db') ?? '{}');
    return (d.messages ?? []).find((m: { text: string }) => m.text === 'Mensagem de regressão (teste).')?.status;
  });
  expect(status).toBe('enviada'); // nada mudou depois de sair da tela
});
