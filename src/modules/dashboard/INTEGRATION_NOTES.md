# Dashboard (Agente 01) — notas de integração

## O que o módulo entrega
- `/dashboard` (container `DashboardPage` em `routes.tsx`) → `DashboardScreen` (`design_system/screens/dashboard`).
- `dashboardData.ts`: seletor puro `selectDashboard(state, ctx, período, agora)` que compõe os seletores do core.
  Lido via `useQuery`, então qualquer escrita de Agenda, Pacientes, Financeiro ou Atendimentos re-renderiza o Dashboard.

| Indicador | Fonte (core) | Regra |
|---|---|---|
| Consultas (total/confirmadas/pendentes/canceladas) | `selectAppointments` | mesma regra do `selectDayOverview` (total = tudo menos canceladas; pendente = `agendada`) |
| Pacientes cadastrados | `selectPatients` | total + novos no período (`createdAt`) |
| Faturamento | `selectFinancialEntries` / `selectFinanceTotals` | receita **paga**; só com `financeiro ≥ ver` |
| Gráfico de faturamento | `selectFinanceTotals(mês)` × 12 meses | 3M/6M/12M recortam a série |
| Taxa de ocupação | `appointments` + `rooms` ativas + `clinicSettings.hours` | min. agendados ÷ (salas × expediente − almoço) |
| Consultas por especialidade | `selectAppointments` + `specialties` | exclui canceladas |
| Próximos atendimentos | `selectAppointments` | agendada/confirmada/em atendimento ainda não encerradas, máx. 6 |
| Atividades recentes | `db.activity` (`logActivity`) | 6 mais recentes |

Filtro de período (Hoje / Semana seg–dom / Mês) é estado local da tela; comparação com o período anterior equivalente.

## Perfis
- **admin**: tudo. **recepção**: sem faturamento nem gráfico financeiro (grade com 4 KPIs). **financeiro**: com faturamento,
  sem "Novo agendamento" e sem atalhos para Agenda/WhatsApp (fora do `NAV_BY_ROLE`). **profissional**: a guarda de rota já
  mostra 403; o seletor também devolve `null` (defesa em profundidade). Nenhum dado de prontuário é lido.

## Dependências / pendências para o Integrador
- CR `docs/change-requests/01-dashboard-historico-faturamento.md`: histórico de receita na semente (gráfico de 12 meses).
- `scripts/check-boundaries.mjs` lê `git status --porcelain` sem `-uall`; uma pasta nova ainda não rastreada aparece como
  `tests/modules/` (sem o arquivo) e é marcada como violação. Some depois de `git add`. Sugestão: usar `--porcelain -uall`.
- A tela importa **somente o tipo** `DashboardData` de `@modules/dashboard/dashboardData` (sem dependência em runtime).
