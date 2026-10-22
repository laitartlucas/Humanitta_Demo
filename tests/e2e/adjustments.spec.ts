/**
 * Ajustes finais (Agente 09): paciente pré-selecionado na Agenda a partir da ficha e
 * comparativo mensal com o mesmo intervalo de dias (legenda explícita).
 */
import { expect, test, type Page } from '@playwright/test';
import { freshStart, login, logout, trackErrors } from './helpers';

async function db(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('humanitta:demo:db') ?? '{}'));
}

test('ficha do paciente → Agendar abre a Agenda com o paciente selecionado', async ({ page }) => {
  const errors = trackErrors(page);
  await freshStart(page);
  await login(page, 'recepcao');
  await page.goto('./#/pacientes/pac-01');
  await page.locator('main').getByRole('button', { name: 'Agendar', exact: true }).click();

  await expect(page).toHaveURL(/#\/agenda$/); // nenhum dado do paciente na URL
  const dialog = page.getByRole('dialog');
  const patient = dialog.getByLabel(/^Paciente/);
  await expect(patient).toHaveValue('pac-01');

  // Pode trocar o paciente (perfil autorizado) e voltar.
  await patient.selectOption('pac-02');
  await expect(patient).toHaveValue('pac-02');
  await patient.selectOption('pac-01');

  // Validações continuam valendo: horário ocupado da Dra. Helena é recusado.
  await dialog.getByLabel(/^Profissional/).selectOption('prof-helena');
  await dialog.getByLabel(/^Data/).fill('2026-10-20');
  await dialog.getByLabel(/^Horário/).fill('09:00');
  await expect(dialog.getByText(/Horário ocupado/)).toBeVisible();
  await dialog.getByLabel(/^Horário/).fill('11:00');
  await expect(dialog.getByText(/Horário ocupado/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Agendar' }).click();
  await expect(page.getByText('Agendamento criado')).toBeVisible();

  // Mesmo ID de paciente, sem cadastro duplicado.
  await expect
    .poll(async () => ((await db(page)).appointments ?? []).filter((a: { start: string }) => a.start === '2026-10-20T11:00:00').length)
    .toBe(1);
  const state = await db(page);
  const created = state.appointments.find((a: { start: string }) => a.start === '2026-10-20T11:00:00');
  expect(created.patientId).toBe('pac-01');
  expect(created.professionalId).toBe('prof-helena');
  expect(state.patients.filter((p: { name: string }) => p.name === 'Carla Menegatti')).toHaveLength(1);

  // Recarregar a Agenda não reabre o formulário.
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Abrir a Agenda pelo menu não pré-seleciona ninguém.
  await page.locator('main').getByRole('button', { name: 'Novo agendamento' }).first().click();
  await expect(page.getByRole('dialog').getByLabel(/^Paciente/)).toHaveValue('');
  expect(errors).toEqual([]);
});

test('comparativo do mês em andamento usa o mesmo intervalo de dias e diz isso', async ({ page }) => {
  const errors = trackErrors(page);
  await freshStart(page);

  await login(page, 'financeiro');
  await page.goto('./#/financeiro');
  await expect(page.locator('main').getByText('1–19 out vs. 1–19 set').first()).toBeVisible();
  await logout(page);

  await login(page, 'admin');
  await page.locator('main').getByRole('radio', { name: 'Mês', exact: true }).click();
  await expect(page.locator('main').getByText('1–19 out vs. 1–19 set').first()).toBeVisible();

  await page.goto('./#/relatorios');
  await expect(page.locator('main').getByText('01/10/2026 a 19/10/2026 vs. 01/09/2026 a 19/09/2026')).toBeVisible();
  expect(errors).toEqual([]);
});

test('após o login volta à página pedida; caminho suspeito cai no início do perfil', async ({ page }) => {
  await freshStart(page);
  await page.goto('./#/pacientes');
  await expect(page).toHaveURL(/#\/login/);
  await page.getByLabel('Perfil de demonstração').selectOption('recepcao');
  await page.locator('#login-password').fill('demo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/#\/pacientes$/);
  await logout(page);

  await page.goto('./#//evil.example/agenda');
  await expect(page).toHaveURL(/#\/login/);
  await page.getByLabel('Perfil de demonstração').selectOption('recepcao');
  await page.locator('#login-password').fill('demo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/#\/agenda$/); // tela inicial da recepção, sem seguir o caminho suspeito
  expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host); // não saiu do site
});
