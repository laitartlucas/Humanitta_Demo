# CR 06-financeiro — lacunas do core para o módulo Financeiro

- Agente: 06 · Financeiro
- Branch: `agent/06-financeiro`
- Arquivo(s) compartilhado(s): `src/core/services/finance.ts`, `src/core/selectors/index.ts`, `src/core/domain/entities.ts`, `src/core/data/seed.ts`
- Status: aguardando o Integrador. Todas as soluções locais abaixo já estão em `src/modules/finance/domain/` e usam o **mesmo** `db` (nenhum store ou `localStorage` novo).

## 1. Serviços de edição e estorno (`financeService.updateEntry` / `reverseEntry`)

- **O que preciso:** `updateEntry(ctx, id, patch)` e `reverseEntry(ctx, id)` no core, com `assertCan` por tipo (`repasses` para repasse, `financeiro` para os demais).
- **Por quê:** o contrato pede edição de receitas/despesas e estorno/cancelamento; o core só tem `createEntry`, `registerPayment` e `deleteEntry`.
- **Alternativa local:** `updateFinanceEntry` e `reverseFinanceEntry` (`operations.ts`) escrevem via `repositories.financialEntries` depois da mesma checagem de permissão do core. Basta trocar a chamada quando o serviço existir. Regras aplicadas: só edita em aberto; estorno é estado final; pago não é excluído (só estornado).
- **Impacto:** nenhum outro agente.

## 2. Validações em `financeService.registerPayment`

- **O que preciso:** validar `paidAt` (formato, data real, não futura) e o valor pago. Hoje o core aceita qualquer string em `paidAt`.
- **Alternativa local:** `registerFinancePayment` valida valor (centavos, igual ao valor em aberto), forma, data e transições antes de chamar o core.
- **Pagamento parcial** não está previsto no modelo. Se for desejado, é preciso uma coleção de pagamentos (`payments: { id, entryId, amount, method, paidAt }`), que também daria um histórico de baixas de verdade. Hoje o histórico é derivado de `paidAt`/`method` do lançamento.

## 3. Duplicidade por atendimento (`createEntry`)

- **O que preciso:** `createEntry` recusar (`CONFLICT`) uma segunda receita ativa com o mesmo `appointmentId`, e validar que o agendamento existe e está `concluida`.
- **Alternativa local:** `createFinanceEntry` faz essa checagem, força paciente/profissional a partir do agendamento e bloqueia lançamentos idênticos.

## 4. Situação "atrasado" derivada e `overdue` do `selectFinanceTotals`

- `atrasado` é gravado estaticamente na semente; um lançamento pendente cujo vencimento passa continua `pendente` no banco.
- `FinanceTotals.overdue` soma **todos os tipos** em atraso (inclui despesa de internet e repasse da fisioterapia), mas o Dashboard/Financeiro mostram esse número junto de "A receber".
- **Proposta:** derivar `atrasado` (pendente com `dueDate < todayKey()`) no seletor e separar `overdueReceivable` de `overduePayable`.
- **Alternativa local:** `effectiveStatus()` + `computeTotals()` do módulo. Na semente atual os números coincidem com `selectFinanceTotals` (há teste garantindo isso).

## 5. Campos opcionais em `FinancialEntryRecord`

- `notes?: string` (observações administrativas): o formulário mostra o campo desabilitado até lá.
- `supplier?: string` (fornecedor de despesas): o campo foi omitido do formulário por não existir no modelo.
- `reversedAt?: string` e `reverseReason?: string` para auditoria do estorno.
- Exige incremento de `SCHEMA_VERSION`.

## 6. Regra de repasse

- O contrato não define percentual oficial. O módulo usa `DEMO_PAYOUT_RULE` = 40% da receita **recebida** do profissional na quinzena, rotulado como "Demonstração" na tela.
- **O que preciso:** regra por profissional (ex.: `Professional.payoutPercent?` ou configuração em `ClinicSettings`) definida pela clínica.
- Deduplicação local: um repasse por profissional e quinzena (data = fim do período), gerado só após o fechamento. Para deduplicar **por atendimento**, o lançamento de repasse precisaria de `coveredEntryIds?: ID[]`.

## 7. Semente sem histórico

- A semente só tem lançamentos de outubro/2026. O gráfico de 12 meses e os comparativos com o período anterior ("vs. set/26") ficam sem base, e a tela mostra isso explicitamente em vez de inventar números.
- **O que preciso:** lançamentos fictícios de nov/2025 a set/2026 em `seed.ts` (coerentes com `monthlyCashFlow` dos mocks), com IDs estáveis.

## 8. Saldo do paciente

- `registerPayment` abate `patient.balance`, mas `createEntry` não soma ao saldo e o estorno não devolve. A semântica de `balance` precisa ser definida pelo core (Agente 03 lê esse valor). O módulo **não** altera `balance` no estorno.

## 9. Segurança (para o Agente 09)

- A rota `/financeiro` é bloqueada para recepção e profissional pelo `ProtectedLayout`; a tela também mostra "Acesso restrito" sem `financeiro ≥ ver`, e todas as operações revalidam permissão (403), inclusive para lançamento inexistente (não revela existência).
- O profissional só vê os próprios repasses (`selectPayoutRows` usa `scopeByProfessional('repasses')`); a base de faturamento nunca é calculada para esse perfil.
- Tudo isso **espelha** o backend; não é segurança de produção.
