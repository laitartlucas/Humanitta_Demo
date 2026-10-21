/**
 * Fluxo principal de ponta a ponta PELA INTERFACE (build de produção, GitHub Pages simulado):
 * recepção cadastra paciente → agenda com a Dra. Lauren → confirma e registra chegada →
 * Dra. Lauren inicia, registra e conclui → financeiro lança o recebimento → dashboard/relatórios →
 * recarregar mantém os dados → Dra. Helena não vê nada disso.
 */
import { expect, test, type Page } from '@playwright/test';
import { freshStart, login, logout, trackErrors } from './helpers';

const PATIENT = 'Valentina Demo E2E';

async function dbSnapshot(page: Page) {
  return page.evaluate((name) => {
    const d = JSON.parse(localStorage.getItem('humanitta:demo:db') ?? '{}');
    const p = d.patients?.find((x: { name: string }) => x.name === name);
    const a = p && d.appointments.find((x: { patientId: string }) => x.patientId === p.id);
    return {
      patientId: p?.id as string | undefined,
      appointment: a as { id: string; status: string; professionalId: string } | undefined,
      attendance: a && d.attendances.find((x: { appointmentId: string }) => x.appointmentId === a.id),
      clinical: a && d.clinicalRecords.find((x: { appointmentId: string }) => x.appointmentId === a.id),
      revenue: a && d.financialEntries.filter((x: { appointmentId?: string; type: string }) => x.appointmentId === a.id && x.type === 'receita'),
    };
  }, PATIENT);
}

test('fluxo principal: cadastro → agendamento → portal → atendimento → financeiro → relatórios', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = trackErrors(page);
  await freshStart(page);

  // 1–3. Recepção cadastra a paciente e a encontra na lista.
  await login(page, 'recepcao');
  await page.goto('./#/pacientes');
  await page.getByRole('button', { name: 'Novo paciente' }).click();
  const pDialog = page.getByRole('dialog');
  await pDialog.getByLabel(/Nome completo/).fill(PATIENT);
  await pDialog.getByLabel(/Data de nascimento/).fill('1990-05-12');
  await pDialog.getByLabel(/telefone/i).fill('(54) 99100-0997');
  await pDialog.getByText(/Paciente autorizou/).click();
  await pDialog.getByRole('button', { name: 'Cadastrar paciente' }).click();
  await expect(page.getByText('Paciente cadastrado')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox', { name: 'Buscar pacientes' }).fill('Valentina');
  await expect(page.locator('main').getByText(PATIENT).first()).toBeVisible();

  // 4–7. Agenda: horário ocupado é recusado; horário livre é agendado e confirmado.
  await page.goto('./#/agenda');
  await page.getByRole('button', { name: 'Novo agendamento' }).first().click();
  const aDialog = page.getByRole('dialog');
  await aDialog.getByLabel(/^Paciente/).selectOption({ label: PATIENT });
  await aDialog.getByLabel(/^Profissional/).selectOption('prof-lauren');
  await aDialog.getByLabel(/^Data/).fill('2026-10-19');
  await aDialog.getByLabel(/^Horário/).fill('14:00');
  await expect(aDialog.getByText(/Horário ocupado/)).toBeVisible();
  await aDialog.getByLabel(/^Horário/).fill('17:10');
  await expect(aDialog.getByText(/Horário ocupado/)).toHaveCount(0);
  await aDialog.getByRole('button', { name: 'Agendar' }).click();
  await expect(page.getByText('Agendamento criado')).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`17:10.*${PATIENT}`) }).first().click();
  await page.getByRole('button', { name: 'Confirmar presença' }).click();
  await expect(page.getByText('Presença confirmada')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar chegada' }).click();
  await expect(page.getByText('Chegada registrada')).toBeVisible();
  // A persistência grava com debounce (150 ms): aguarda o localStorage refletir a ação.
  await expect.poll(async () => (await dbSnapshot(page)).attendance?.checkInAt).toBeTruthy();
  let snap = await dbSnapshot(page);
  expect(snap.appointment?.status).toBe('confirmada');
  await page.keyboard.press('Escape');
  await logout(page);

  // 8–13. Dra. Lauren: vê a consulta, conclui o atendimento em andamento e atende a nova paciente.
  await login(page, 'profissional', 'u-prof-lauren');
  await page.goto('./#/portal/agenda');
  await expect(page.locator('main').getByText(/Valentina/).first()).toBeVisible();
  await page.goto('./#/portal/atendimentos');
  await page.getByRole('button', { name: 'Finalizar atendimento' }).click(); // Patrícia (em andamento na semente)
  let fDialog = page.getByRole('dialog');
  await fDialog.getByText('Revisei o registro clínico deste atendimento').click();
  await fDialog.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.getByText('Atendimento finalizado')).toBeVisible();
  await page.locator('main').getByText(PATIENT).first().click();
  await page.getByRole('button', { name: 'Iniciar atendimento' }).click();
  const notes = page.getByPlaceholder('[Registro demonstrativo — não usar dados reais]');
  await notes.nth(0).fill('Teste E2E: avaliação de rotina (fictício).');
  await notes.nth(1).fill('Teste E2E: exame demonstrativo.');
  await page.getByRole('button', { name: 'Finalizar atendimento' }).click();
  fDialog = page.getByRole('dialog');
  await fDialog.getByText('Revisei o registro clínico deste atendimento').click();
  await fDialog.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.getByText('Atendimento finalizado').first()).toBeVisible();
  await expect.poll(async () => (await dbSnapshot(page)).attendance?.status).toBe('finalizado');
  snap = await dbSnapshot(page);
  expect(snap.appointment?.status).toBe('concluida');
  expect(snap.clinical?.summary).toContain('Teste E2E');
  expect(snap.clinical?.professionalId).toBe('prof-lauren');
  await logout(page);

  // 14–15. Financeiro: recebimento vinculado ao atendimento; não pode ser lançado duas vezes.
  await login(page, 'financeiro');
  await page.goto('./#/financeiro');
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  let eDialog = page.getByRole('dialog');
  const related = eDialog.getByLabel(/Atendimento relacionado/);
  await related.selectOption({ label: (await related.locator('option', { hasText: PATIENT }).textContent())!.trim() });
  await eDialog.getByLabel(/^Valor/).fill('220,00');
  await eDialog.getByLabel(/^Situação/).selectOption('pago');
  await eDialog.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByText('Lançamento criado')).toBeVisible();
  await expect.poll(async () => (await dbSnapshot(page)).revenue?.length).toBe(1);
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  eDialog = page.getByRole('dialog');
  await expect(eDialog.getByLabel(/Atendimento relacionado/).locator('option', { hasText: PATIENT })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await logout(page);

  // 16–17. Dashboard e relatórios abrem com os dados atualizados.
  await login(page, 'admin');
  await expect(page.locator('main').getByText(/Pacientes cadastrados/i)).toBeVisible();
  await expect(page.locator('main').getByText('13', { exact: true }).first()).toBeVisible();
  await page.goto('./#/relatorios');
  await expect(page.locator('main').getByText(/Faturamento/i).first()).toBeVisible();

  // 18–19. Recarregar a página mantém tudo.
  await page.reload();
  snap = await dbSnapshot(page);
  expect(snap.appointment?.status).toBe('concluida');
  expect(snap.revenue).toHaveLength(1);
  await logout(page);

  // 20. Outro profissional não vê paciente, consulta nem registro clínico.
  await login(page, 'profissional', 'u-prof-helena');
  await page.goto('./#/portal/pacientes');
  await expect(page.locator('main').getByText(/vinculados às suas consultas/)).toBeVisible();
  await expect(page.locator('main').getByText(PATIENT)).toHaveCount(0);
  await page.goto(`./#/portal/pacientes/${snap.patientId}`);
  await expect(page.locator('main').getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  await page.goto(`./#/portal/atendimentos/${snap.appointment?.id}`);
  await expect(page.locator('main').getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  await expect(page.locator('main').getByText('Teste E2E')).toHaveCount(0);

  expect(errors).toEqual([]);
});
