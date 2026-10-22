/**
 * ENSAIO DA APRESENTAÇÃO — executa exatamente o roteiro da demonstração para o cliente
 * (ROTEIRO_APRESENTACAO.md), com os mesmos cliques, dados e ordem. Rode no dia:
 *   npm run demo:check        (contra o site publicado)
 * Qualquer falha aqui = não apresentar aquele trecho até corrigir.
 */
import { expect, test, type Page } from '@playwright/test';
import { freshStart, login, logout, trackErrors } from './helpers';

const PACIENTE = { nome: 'Maria Exemplo', nascimento: '1988-04-15', telefone: '(54) 99100-0950' };

async function menu(page: Page, label: string) {
  const sidebar = page.locator('aside, nav').filter({ has: page.getByRole('link', { name: new RegExp(`^${label}`) }) }).first();
  await sidebar.getByRole('link', { name: new RegExp(`^${label}`) }).first().click();
}

test('roteiro da apresentação (15–20 min) — ponta a ponta', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);

  // 0. Preparação: dados restaurados.
  await freshStart(page);

  // 1. Administração — visão geral.
  await login(page, 'admin');
  await expect(page.locator('main').getByRole('heading', { name: /Bom dia, Camila/ })).toBeVisible();
  await page.locator('main').getByRole('radio', { name: 'Mês', exact: true }).click();
  await expect(page.locator('main').getByText('1–19 out vs. 1–19 set').first()).toBeVisible();
  await page.locator('main').getByRole('radio', { name: 'Hoje', exact: true }).click();
  await logout(page);

  // 2. Recepção — cadastro, agendamento a partir da ficha, confirmação e chegada.
  await login(page, 'recepcao');
  await menu(page, 'Pacientes');
  await page.getByRole('button', { name: 'Novo paciente' }).click();
  const novo = page.getByRole('dialog');
  await novo.getByLabel(/Nome completo/).fill(PACIENTE.nome);
  await novo.getByLabel(/Data de nascimento/).fill(PACIENTE.nascimento);
  await novo.getByLabel(/telefone/i).fill(PACIENTE.telefone);
  await novo.locator('input[type=checkbox]').check(); // consentimento LGPD
  await novo.getByRole('button', { name: 'Cadastrar paciente' }).click();
  await expect(page.getByText('Paciente cadastrado')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir perfil' }).click();
  await expect(page.locator('main').getByRole('heading', { name: PACIENTE.nome })).toBeVisible();
  await page.locator('main').getByRole('button', { name: 'Agendar', exact: true }).click();

  const ag = page.getByRole('dialog');
  await expect(ag.getByLabel(/^Paciente/).locator('option:checked')).toHaveText(PACIENTE.nome);
  await ag.getByLabel(/^Profissional/).selectOption('prof-lauren');
  await ag.getByLabel(/^Data/).fill('2026-10-19');
  await ag.getByLabel(/^Horário/).fill('14:00');
  await expect(ag.getByText(/Horário ocupado/)).toBeVisible();
  await ag.getByLabel(/^Horário/).fill('17:10');
  await expect(ag.getByText(/Horário ocupado/)).toHaveCount(0);
  await ag.getByRole('button', { name: 'Agendar' }).click();
  await expect(page.getByText('Agendamento criado')).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`17:10.*${PACIENTE.nome}`) }).first().click();
  await page.getByRole('button', { name: 'Confirmar presença' }).click();
  await expect(page.getByText('Presença confirmada')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar chegada' }).click();
  await expect(page.getByText('Chegada registrada')).toBeVisible();
  await page.keyboard.press('Escape');

  // 3. Recepção — WhatsApp com IA simulada e atendimento humano.
  await menu(page, 'WhatsApp');
  await page.locator('main').getByRole('button', { name: /Carla Menegatti/ }).first().click();
  await page.getByRole('button', { name: 'Simular mensagem recebida' }).click();
  await page.getByRole('button', { name: 'Qual o endereço de vocês?' }).click();
  await expect(page.locator('main').getByText(/Rio Branco, 185/).last()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Assumir conversa' }).click();
  const composer = page.locator('main').getByRole('textbox').last();
  await composer.fill('Olá, Carla! Aqui é a Juliana, da recepção. Posso ajudar?');
  await composer.press('Enter');
  await expect(page.locator('main').getByText('Aqui é a Juliana, da recepção').first()).toBeVisible();
  await logout(page);

  // 4. Profissional — Dra. Lauren conclui o atendimento em andamento e atende a nova paciente.
  await login(page, 'profissional', 'u-prof-lauren');
  await expect(page.locator('main').getByText(/Bom dia, Dra\. Lauren/)).toBeVisible();
  await menu(page, 'Meus Atendimentos');
  await page.getByRole('button', { name: 'Finalizar atendimento' }).click();
  let fim = page.getByRole('dialog');
  await fim.getByRole('checkbox', { name: /Revisei o registro clínico/ }).check();
  await fim.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.getByText('Atendimento finalizado')).toBeVisible();
  await page.locator('main').getByText(PACIENTE.nome).first().click();
  await page.getByRole('button', { name: 'Iniciar atendimento' }).click();
  const notas = page.getByPlaceholder('[Registro demonstrativo — não usar dados reais]');
  await notas.nth(0).fill('Avaliação de rotina (registro fictício).');
  await notas.nth(1).fill('Exame clínico demonstrativo.');
  await page.getByRole('button', { name: 'Finalizar atendimento' }).click();
  fim = page.getByRole('dialog');
  await fim.getByRole('checkbox', { name: /Revisei o registro clínico/ }).check();
  await fim.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.getByText('Atendimento finalizado').first()).toBeVisible();
  await logout(page);

  // 4b. Privacidade: outra profissional não vê a paciente nem o registro.
  await login(page, 'profissional', 'u-prof-helena');
  await menu(page, 'Meus Pacientes');
  await expect(page.locator('main').getByText(/vinculados às suas consultas/)).toBeVisible();
  await expect(page.locator('main').getByText(PACIENTE.nome)).toHaveCount(0);
  await logout(page);

  // 5. Financeiro — recebimento vinculado ao atendimento, sem duplicidade.
  await login(page, 'financeiro');
  await expect(page.locator('main').getByText('1–19 out vs. 1–19 set').first()).toBeVisible();
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  let lanc = page.getByRole('dialog');
  const vinculo = lanc.getByLabel(/Atendimento relacionado/);
  await vinculo.selectOption({ label: (await vinculo.locator('option', { hasText: PACIENTE.nome }).textContent())!.trim() });
  await lanc.getByLabel(/^Valor/).fill('220,00');
  await lanc.getByLabel(/^Situação/).selectOption('pago');
  await lanc.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByText('Lançamento criado')).toBeVisible();
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  lanc = page.getByRole('dialog');
  await expect(lanc.getByLabel(/Atendimento relacionado/).locator('option', { hasText: PACIENTE.nome })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await logout(page);

  // 6. Administração — relatórios, aprovação de bloqueio e Assistente IA.
  await login(page, 'admin');
  await menu(page, 'Relatórios');
  await expect(page.locator('main').getByText('01/10/2026 a 19/10/2026 vs. 01/09/2026 a 19/09/2026')).toBeVisible();
  await menu(page, 'Configurações');
  await page.locator('main').getByRole('button', { name: 'Solicitações de bloqueio' }).click();
  await page.locator('main').getByRole('button', { name: 'Aprovar' }).first().click();
  await expect(page.getByText('Solicitação aprovada')).toBeVisible();
  await menu(page, 'Assistente IA');
  await page.getByRole('tab', { name: /Ambiente de testes/ }).click();
  await page.getByRole('button', { name: 'Qual o endereço de vocês?' }).click();
  await expect(page.locator('main').getByText(/Rio Branco/).first()).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
});
