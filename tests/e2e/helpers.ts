import { expect, type Page } from '@playwright/test';

export type DemoRole = 'admin' | 'recepcao' | 'profissional' | 'financeiro';

/** Coleta erros de JavaScript e de console da página (o teste falha se houver algum). */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Abre a demonstração com dados restaurados e sem sessão. */
export async function freshStart(page: Page) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./?reset-demo#/login');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
}

/** Login demonstrativo pelo formulário (perfil e, se profissional, qual profissional). */
export async function login(page: Page, role: DemoRole, professionalUserId?: string) {
  await page.goto('./#/login');
  await page.getByLabel('Perfil de demonstração').selectOption(role);
  if (professionalUserId) await page.getByLabel('Profissional (demonstração)').selectOption(professionalUserId);
  await page.locator('#login-password').fill('demo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/#\/login/, { timeout: 10_000 });
}

/** Logout pelo menu do usuário no header. */
export async function logout(page: Page) {
  await page.getByRole('button', { name: /Menu do usuário/ }).click();
  await page.getByRole('menuitem', { name: /Sair/ }).click();
  await expect(page).toHaveURL(/#\/login/);
}

/** A área principal não está em estado de erro (ErrorBoundary) nem de acesso negado. */
export async function expectHealthyMain(page: Page) {
  const main = page.locator('main');
  await expect(main).toBeVisible();
  // Títulos dos estados de erro (ErrorBoundary, AccessDenied) — não trechos de texto explicativo.
  for (const name of ['Não foi possível carregar esta área', 'Acesso não autorizado', 'Página não encontrada']) {
    await expect(main.getByRole('heading', { name, exact: true })).toHaveCount(0);
  }
}

/** Sem rolagem horizontal na página (critério de responsividade do design). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'rolagem horizontal na página').toBeLessThanOrEqual(1);
}
