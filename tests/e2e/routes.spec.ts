/**
 * Rotas, menus, permissões por perfil, 403, rota inexistente, logout e recarregamento (F5)
 * no build de produção servido como GitHub Pages.
 */
import { expect, test } from '@playwright/test';
import { expectHealthyMain, freshStart, login, logout, trackErrors, type DemoRole } from './helpers';

const MENU: Record<DemoRole, { label: string; hash: string }[]> = {
  admin: [
    { label: 'Dashboard', hash: '#/dashboard' },
    { label: 'Agenda', hash: '#/agenda' },
    { label: 'Pacientes', hash: '#/pacientes' },
    { label: 'Profissionais', hash: '#/profissionais' },
    { label: 'Atendimentos', hash: '#/atendimentos' },
    { label: 'Financeiro', hash: '#/financeiro' },
    { label: 'WhatsApp', hash: '#/whatsapp' },
    { label: 'Assistente IA', hash: '#/assistente' },
    { label: 'Relatórios', hash: '#/relatorios' },
    { label: 'Configurações', hash: '#/configuracoes' },
  ],
  recepcao: [
    { label: 'Dashboard', hash: '#/dashboard' },
    { label: 'Agenda', hash: '#/agenda' },
    { label: 'Pacientes', hash: '#/pacientes' },
    { label: 'Profissionais', hash: '#/profissionais' },
    { label: 'Atendimentos', hash: '#/atendimentos' },
    { label: 'WhatsApp', hash: '#/whatsapp' },
    { label: 'Relatórios', hash: '#/relatorios' },
  ],
  financeiro: [
    { label: 'Dashboard', hash: '#/dashboard' },
    { label: 'Financeiro', hash: '#/financeiro' },
    { label: 'Pacientes', hash: '#/pacientes' },
    { label: 'Relatórios', hash: '#/relatorios' },
  ],
  profissional: [
    { label: 'Meu Dashboard', hash: '#/portal/dashboard' },
    { label: 'Minha Agenda', hash: '#/portal/agenda' },
    { label: 'Meus Pacientes', hash: '#/portal/pacientes' },
    { label: 'Meus Atendimentos', hash: '#/portal/atendimentos' },
    { label: 'Meu Perfil', hash: '#/portal/perfil' },
  ],
};

const FORBIDDEN: Record<DemoRole, string> = {
  admin: '#/portal/agenda',
  recepcao: '#/financeiro',
  financeiro: '#/whatsapp',
  profissional: '#/configuracoes',
};

const HOME: Record<DemoRole, string> = {
  admin: '#/dashboard',
  recepcao: '#/agenda',
  financeiro: '#/financeiro',
  profissional: '#/portal/dashboard',
};

for (const role of Object.keys(MENU) as DemoRole[]) {
  test(`perfil ${role}: menu completo, F5, 403 e logout`, async ({ page }) => {
    const errors = trackErrors(page);
    await freshStart(page);
    await login(page, role);
    await expect(page).toHaveURL(new RegExp(`${HOME[role].replace('/', '\\/')}$`));

    const sidebar = page.locator('aside, nav').filter({ has: page.getByRole('link', { name: MENU[role][0].label }) }).first();
    for (const item of MENU[role]) {
      await sidebar.getByRole('link', { name: new RegExp(`^${item.label}`) }).first().click();
      await expect(page).toHaveURL(new RegExp(`${item.hash.replace(/\//g, '\\/')}$`));
      await expectHealthyMain(page);
    }

    // Recarregar uma rota interna continua funcionando (hospedagem estática).
    await page.reload();
    await expectHealthyMain(page);

    // Rota fora do perfil → 403; rota inexistente → não encontrada.
    await page.goto(`./${FORBIDDEN[role]}`);
    await expect(page.locator('main').getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    await page.goto('./#/rota-que-nao-existe');
    await expect(page.locator('main').getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await page.locator('main').getByRole('button', { name: /Voltar ao meu início/ }).click();
    await expect(page).toHaveURL(new RegExp(`${HOME[role].replace('/', '\\/')}$`));

    await logout(page);
    await page.goto(`./${HOME[role]}`);
    await expect(page).toHaveURL(/#\/login/); // sem sessão → login
    expect(errors).toEqual([]);
  });
}

test('URL fora do subcaminho publicado responde 404 (como no GitHub Pages)', async ({ request }) => {
  const base = new URL(test.info().project.use.baseURL!);
  const res = await request.get(`${base.origin}/agenda-inexistente-humanitta`);
  expect(res.status()).toBe(404);
});
