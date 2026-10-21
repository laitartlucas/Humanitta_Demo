/**
 * Responsividade @responsivo (projetos desktop 1440, tablet 768, smartphone Pixel 5):
 * cada tela principal abre sem erro e SEM rolagem horizontal na página. Salva capturas em
 * test-results/screens/ para revisão visual contra os artboards do design.
 */
import { expect, test } from '@playwright/test';
import { expectHealthyMain, expectNoHorizontalScroll, freshStart, login, trackErrors, type DemoRole } from './helpers';

const PAGES: { role: DemoRole; prof?: string; hashes: string[] }[] = [
  { role: 'admin', hashes: ['#/dashboard', '#/agenda', '#/pacientes', '#/pacientes/pac-01', '#/profissionais', '#/atendimentos', '#/financeiro', '#/whatsapp', '#/assistente', '#/relatorios', '#/configuracoes'] },
  { role: 'profissional', prof: 'u-prof-lauren', hashes: ['#/portal/dashboard', '#/portal/agenda', '#/portal/pacientes', '#/portal/atendimentos', '#/portal/perfil'] },
];

for (const group of PAGES) {
  test(`@responsivo telas de ${group.role}`, async ({ page }, info) => {
    test.setTimeout(180_000);
    const errors = trackErrors(page);
    await freshStart(page);
    await login(page, group.role, group.prof);
    for (const hash of group.hashes) {
      await page.goto(`./${hash}`);
      await expectHealthyMain(page);
      await page.waitForTimeout(400); // skeletons e gráficos
      await expectNoHorizontalScroll(page);
      const name = hash.replace(/[#/]+/g, '-').replace(/^-|-$/g, '');
      await page.screenshot({ path: `test-results/screens/${info.project.name}/${group.role}-${name}.png`, fullPage: false });
    }
    if (info.project.name === 'smartphone') {
      // Bottom-nav do layout móvel presente.
      await expect(page.getByRole('navigation').last()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
