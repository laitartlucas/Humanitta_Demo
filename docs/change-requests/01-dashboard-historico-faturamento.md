# CR 01-dashboard-historico-faturamento
- Agente: 01 · Dashboard
- Arquivo(s) compartilhado(s): `src/core/data/seed.ts` (e `SCHEMA_VERSION`)
- O que preciso: lançamentos de **receita paga** demonstrativos de nov/2025 a set/2026 na semente
  (ex.: um lançamento "Fechamento mensal (demonstração)" por mês, com os valores de `yearlyRevenue`
  de `@ds/mocks/clinical`: 31.800, 29.400, 30.100, 33.200, 34.900, 35.600, 36.200, 38.900, 41.500, 40.100, 43.500).
- Por quê / qual tela usa: o gráfico "Faturamento" (3M/6M/12M) do Dashboard agora é calculado a partir de
  `selectFinanceTotals(s, ctx, mes).revenue`. Como a semente só tem lançamentos de outubro/2026, os meses
  anteriores aparecem com R$ 0,0k e o comparativo "vs. setembro" do KPI de faturamento fica sem base.
  Usar `yearlyRevenue` direto na tela violaria o critério 3 do contrato (mock como fonte de dados).
- Alternativa local enquanto aguardo: o gráfico mostra os valores reais da base (só outubro preenchido);
  o KPI de faturamento omite o delta quando o período anterior é zero.
- Impacto em outros agentes: Financeiro (06) e Relatórios (08) passariam a ver os mesmos meses no histórico —
  coerente, pois todos usam `selectFinanceTotals`. Os lançamentos mensais devem usar `category` própria
  (ex.: "Histórico") para o Financeiro poder filtrá-los da listagem operacional, se quiser.

## Observação (sem pedido de mudança)
- `useActivity()` devolve o feed sem escopo. Hoje os eventos não têm conteúdo clínico, mas incluem valores de
  pagamento ("registrou pagamento de R$ …"), visíveis à recepção (`pacientes_financeiro = ver`, então ok).
  Se no futuro algum evento ganhar dado financeiro geral ou clínico, o feed precisará de um campo de
  `feature` por evento para o core filtrar por perfil.
