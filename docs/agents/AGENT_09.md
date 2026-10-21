# Agente 09 — Relatório de integração, QA e preparação de deploy

- Branch: `integracao/agent-09` (a partir de `main` @ `d68041c`). **Nada foi mesclado em `main` nem publicado.**
- Data: 20/10/2026 · Ambiente: Windows 11, Node 22.17.0, npm 10.9.2, Git 2.53, Chromium (Playwright 1.64.1).

---

## 1. Integração

### 1.1 Branches integradas (ordem pedida, `git merge --no-ff`, estratégia padrão `ort`, sem `-X ours/theirs`)

| # | Branch | Commit de origem | Merge | Conflitos | Typecheck | Testes após o merge |
|---|---|---|---|---|---|---|
| 1 | `agent/01-dashboard` | `9eaa981` | `c06c0d7` | nenhum | 0 erros | 27/27 |
| 2 | `agent/02-agenda` | `6949ce5` | `baaf3f7` | nenhum | 0 erros | 53/53 |
| 3 | `agent/03-pacientes` | `37458af` | `85224e5` | nenhum | 0 erros | 83/83 |
| 4 | `agent/04-profissionais-portal` | `5566bcf` | `eac82b2` | nenhum | 0 erros | 111/111 |
| 5 | `agent/05-atendimentos` | `789930e` | `5a39581` | nenhum | 0 erros | 129/129 |
| 6 | `agent/06-financeiro` | `2eb961c` | `abc54a0` | nenhum | 0 erros | 156/156 |
| 7 | `agent/07-whatsapp-ia` | `a2e8404` | `417c1fd` | nenhum | 0 erros | 199/199 |
| 8 | `agent/08-relatorios-config` | `e3f32d7` (+ `a0867ac`) | `65da948` | nenhum | 0 erros | 226/226 |

Antes dos merges: os 8 worktrees estavam sem alterações pendentes e as 8 branches passavam em `check:boundaries`
(nenhum agente alterou arquivo compartilhado). Todos os commits originais são ancestrais de `integracao/agent-09`.

### 1.2 Conflitos encontrados (lógicos — não houve conflito textual)

| Conflito | Agentes | Resolução |
|---|---|---|
| Falta: 05 permitia registrar antes do horário; 02 só depois | 02 × 05 | Regra do 02 (correta) aplicada **no core** (`markNoShow`); teste do 05 ajustado para usar consulta vencida (`ag-104`) |
| Regras de transição só nos módulos (Portal chamava o core sem elas) | 04 × 05 | Check-in/início/falta validados no core: consulta pendente, no dia, sem check-in repetido; cancelar consulta cancela o atendimento |
| `confirmAppointment` aceitava `reagendada` (registro substituído) | 02 | Core aceita só `agendada`; semente encadeia `ag-004 → ag-404` |
| Cobrança duplicada evitada só no módulo Financeiro | 05 × 06 | Core recusa 2ª receita ativa por `appointmentId` e receita de atendimento não concluído |
| Mensagens novas ficavam ANTES das da semente (relógio fixo 10:24 × mensagens até 10:42) | 07 | `isoAfter` no core: sempre após a última mensagem; relógio da demo avança em tempo real |
| `appendAiMessage` sem guarda (IA podia responder após transferência humana) | 07 | Core lança `CONFLICT` se a conversa não está em modo IA |
| Nome/telefone do paciente desatualizados em conversas e lançamentos | 03 × 06 × 07 | `updatePatient` sincroniza agendamentos, lançamentos e conversas; telefone único |
| Semente sem histórico: comparativos "+1.833%", gráfico de 12 meses zerado, saldo negativo | 01 × 06 × 08 | Semente v2 com histórico determinístico (§4) — números coerentes nos 3 módulos |
| Testes do 06 com valores exatos da semente antiga | 06 | `resetDemoData({ history: false })` mantém as asserções exatas sobre a semente base |

---

## 2. Funcionalidades

### 2.1 Funcionais

Legenda: **UI** = verificado pela interface no build de produção; **T** = coberto por testes automatizados do módulo/integração (não clicado na UI nesta etapa).

| Módulo | Verificado |
|---|---|
| Login demonstrativo / logout / troca de perfil | 4 perfis + escolha do profissional; logout pelo menu; sem sessão → login |
| Dashboard | KPIs do dia, faturamento 3/6/12 meses, consultas por especialidade, atualizam após agendamento/pagamento |
| Agenda | UI: semana, novo agendamento com detecção de conflito, confirmação, check-in · T: reagendar, cancelar, editar, falta, regras de sala/expediente |
| Pacientes | UI: cadastro (com consentimento LGPD), busca, paginação, ficha · T: edição, exclusão/inativação, duplicidade |
| Profissionais | UI: lista, ficha, edição do perfil · T: cadastro, ativar/desativar, acesso ao Portal, solicitações |
| Portal do Profissional | Dashboard, agenda, pacientes (dados mínimos), atendimentos (iniciar, registro clínico, finalizar), perfil; isolamento por profissional |
| Atendimentos (clínica) | UI: tela abre nos perfis com acesso · T: fila do dia, chegada, falta, sem conteúdo clínico para admin/recepção |
| Financeiro | UI: visão geral, recebimento vinculado ao atendimento, bloqueio de duplicidade · T: pagamento, estorno, exclusão, repasses, filtros, CSV |
| WhatsApp (simulado) | Conversas, recebimento simulado, resposta da IA, assumir/devolver, transferência, envio local, persistência |
| Assistente IA (simulado) | Configuração, FAQ, ambiente de testes, transferência para humano |
| Relatórios | Agendamentos, atendimentos, financeiro, pacientes e profissionais calculados da base compartilhada |
| Configurações | UI: 12 seções abrem; aprovação de bloqueio de horário · T: usuários, permissões, serviços, salas, horários |
| Rotas | 26 itens de menu nos 4 perfis, F5 em rota interna, 403, rota inexistente, botão de retorno |

### 2.2 Parcialmente funcionais / limitações conhecidas

- ~~Comparativo "mês atual" contra o mês anterior inteiro~~ — **corrigido na rodada de ajustes finais (§7)**.
- **Título da Agenda** quebra em 2 linhas em telas ≤1440 px — comportamento do design original (mesmas classes), não alterado.
- ~~Agenda sem paciente pré-selecionado~~ — **corrigido na rodada de ajustes finais (§7)**.
- **Feriados** — melhoria futura registrada em §7.3. **Preferências do sistema, CPF/endereço do paciente, vigência de disponibilidade, `serviceId` nos agendamentos**: não existem no modelo (CRs 03, 04, 08) — as telas não simulam o que não grava.
- **Exportação em PDF**: desabilitada ("em breve"), sem biblioteca.
- **`DataTable` com `srOnlyHeader`** pode gerar rolagem horizontal; contornado localmente pelo Agente 05 (CR 05 §5).

---

## 3. Qualidade

### 3.1 Resultados de testes (executados nesta máquina)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros (TypeScript strict) |
| `npm test` (vitest) | **237/237** em 15 arquivos (13 contrato do core, 213 dos módulos, 11 de integração) |
| `npm run build` | OK, sem avisos; maior chunk 170 kB |
| `npm run test:e2e` (Playwright, build servido como GitHub Pages) | **14/14**: rotas/perfis (4) + 404 fora do subcaminho, fluxo principal de 20 passos, WhatsApp/IA (2), responsivo desktop 1440 / tablet 768 / smartphone 393 (6) |
| `npm run check:boundaries` | 8/8 branches de agente OK |
| `npm audit --omit=dev` | 2 moderadas (react-router; ver `docs/SECURITY.md`) |

Fluxo principal (seção 7 do briefing) executado **manualmente no navegador** e depois **automatizado** em `tests/e2e/main-flow.spec.ts`:
cadastro → listagem → profissional → disponibilidade/conflito → agendamento → confirmação → chegada → portal da Dra. Lauren →
iniciar → registro clínico fictício → concluir → recebimento vinculado → bloqueio de duplicidade → dashboard → relatórios →
recarregar (persistência) → Dra. Helena sem acesso (lista, URL direta do paciente e do atendimento = 403).

### 3.2 Erros corrigidos pelo Agente 09

1. `/` mostrava "Página não encontrada" (rota-índice sem `routeId`) — corrigido antes desta etapa (`d68041c`).
2. Transições inválidas de atendimento aceitas pelo core (Portal) — §1.2.
3. Cobrança duplicada possível fora do módulo Financeiro — §1.2.
4. Ordem errada de mensagens novas no WhatsApp + IA respondendo após transferência — §1.2.
5. Dados desnormalizados do paciente desatualizados — §1.2.
6. Profissionais: botões do card estouravam 273 px (dois `Button fullWidth` numa linha flex) e barra de filtros estourava 75 px no tablet.
7. GitHub Pages: rotas com history router dariam 404 ao recarregar → hash router + `base: './'`.
8. 3 vulnerabilidades altas em produção (react-router) → 6.30.6.
9. Semente: reagendamento sem vínculo, mensagem citando prontuário, ausência de histórico.

### 3.3 Vulnerabilidades

Detalhes e riscos residuais em [`docs/SECURITY.md`](../SECURITY.md) §4. Resumo: produção 2 moderadas (react-router, sem SSR e sem navegação a URLs externas);
desenvolvimento 2 críticas (vitest→tinypool) e altas de tailwind/vite — exigem versões major, não aplicadas para não arriscar o design.

---

## 4. Dados de demonstração (semente v3)

| Coleção | Registros | Observação |
|---|---|---|
| Usuários | 11 | 3 administrativos + 8 profissionais (um por profissional, com `professionalId`) |
| Pacientes / Profissionais | 12 / 8 | da Etapa 1 |
| Agendamentos | 419 | 01/09–24/10/2026 + histórico da Dra. Lauren; 320 concluídos, 24 faltas, 28 cancelados, 45 em aberto |
| Atendimentos / Prontuários | 345 / 320 | derivados das consultas |
| Lançamentos | 365 | 1 receita por consulta concluída do histórico + despesas de set/26 detalhadas + fechamentos nov/25–ago/26 + semente original |
| Conversas / Mensagens | 9 / 25 | WhatsApp simulado |

Histórico gerado por PRNG com semente fixa (`src/core/data/history.ts`): sempre os mesmos IDs e valores; sem conflito de horário (testado).
Restauração: `?reset-demo` na URL — validada em todos os testes E2E.

---

## 5. Deploy

- Build: `npm run build` (gera `dist/` com caminhos relativos).
- Teste local idêntico ao Pages: `npm run build && npm run pages:serve` → `http://localhost:4180/humanitta-gestao/`.
- Publicação: workflow manual `.github/workflows/deploy-pages.yml` (Settings › Pages › Source = GitHub Actions). Passo a passo em [`docs/DEPLOY.md`](../DEPLOY.md).
- **Falta informar**: conta/organização e nome do repositório GitHub (não há `remote` configurado) e autorização para push e publicação.

---

## 6. Demonstração

| Perfil | Usuário | Tela inicial | Fluxos para apresentar |
|---|---|---|---|
| Administrador | Camila S. | Dashboard | Indicadores, relatórios, configurações, aprovação de bloqueio |
| Recepcionista | Juliana P. | Agenda | Cadastro de paciente, agendamento, confirmação, chegada, WhatsApp |
| Profissional | 8 opções (ex.: Dra. Lauren, Dra. Helena) | Meu Dashboard | Atendimento completo com registro clínico; isolamento entre profissionais |
| Financeiro | Marcelo T. | Financeiro | Recebimento vinculado, repasses, relatórios financeiros |

Limitações do ambiente estático: dados por navegador (`localStorage`), sem login real, WhatsApp e IA simulados, relógio da demo
a partir de 19/10/2026 10:24. **Não é um sistema pronto para produção clínica.**

---

## 7. Rodada de ajustes finais (21/10/2026)

Branch `integracao/agent-09`. A `main` foi mesclada por você em `3d29fb9` com o conteúdo de `0d4e3bc` (idêntico);
**os ajustes abaixo ainda não estão na `main`** e não foram publicados.

### 7.1 Comparativo mensal com o mesmo intervalo de dias

- Regra única no core: `src/core/periods.ts` → `comparablePeriods(range, hoje)`. Se o período é formado por meses
  inteiros e está em andamento, compara **do dia 1 até hoje** com **os mesmos dias** do período anterior, limitado ao fim
  de cada mês (ex.: 1–31/03 → 1–28/02; 29/02 em ano bissexto; janeiro → dezembro do ano anterior). Mês fechado e
  intervalo livre continuam como antes.
- **Financeiro** (`FinanceScreen`): as variações de receita, despesas, saldo e a receber usam o intervalo comparável;
  os valores exibidos continuam sendo os do mês. Legenda: **"1–19 out vs. 1–19 set"**.
- **Dashboard** (filtro "Mês"): consultas e faturamento comparados pelo mesmo intervalo, com a mesma legenda. "Dia" e
  "Semana" não mudaram (já comparavam períodos equivalentes).
- **Relatórios**: KPIs das abas Visão geral, Agendamentos, Atendimentos e Financeiro e o CSV "Resumo do período" usam o
  intervalo comparável; o cabeçalho mostra **"01/10/2026 a 19/10/2026 vs. 01/09/2026 a 19/09/2026"**. O gráfico de
  evolução dia a dia continua comparando com o mês anterior inteiro (é uma série por dia, não uma variação).
- Semente v3: as despesas de set/2026 passaram a ser lançamentos detalhados no mesmo calendário das despesas de outubro
  (o fechamento único em 28/09 deixava "1–19 set" sem despesa). Total de setembro mantido (R$ 20.830, valor do design).
- Efeito na demonstração: receita **−44,3% → −3,7%** (1–19 out × 1–19 set).

### 7.2 Paciente pré-selecionado na Agenda

- Ficha do paciente → **Agendar** abre a Agenda com o formulário "Novo agendamento" e o paciente já selecionado.
- O ID vai no **estado da navegação** (`AgendaNavState`, `src/app/navigation.ts`), nunca na URL. O estado é consumido ao
  abrir (não reabre ao recarregar nem ao voltar). Abrir a Agenda pelo menu continua sem pré-seleção.
- O paciente pode ser trocado no formulário; conflitos de horário, expediente e salas continuam validados; a criação usa
  os serviços compartilhados (mesmo `patientId`, nenhum cadastro novo). Perfis sem `agenda_clinica ≥ editar` não veem o
  formulário (o botão "Agendar" também não aparece para eles).

### 7.3 Feriados — melhoria futura (não implementado)

Proposta para uma próxima etapa: `ClinicSettings.holidays?: { date; label; allDay; start?; end? }[]` editável em
Configurações › Horários, respeitado pela Agenda (`checkSlot`), pelo Portal (grade de horários) e pelo Assistente IA
(`findAvailableSlots`), junto com **bloqueios de agenda da clínica** (ex.: recesso, manutenção de sala) além dos
bloqueios por profissional que já existem. Exige incremento de `SCHEMA_VERSION`.

### 7.4 Segurança

- `npm audit --omit=dev`: continuam **2 moderadas** em `react-router` 6.30.6 (última versão 6; correção só na v7, major).
  Avaliação: injeção em hidratação SSR **não se aplica** (sem SSR); open redirect por barra invertida só é explorável com
  destino controlado pelo usuário. O único ponto assim era o retorno pós-login (`location.state.from`), agora
  **restrito a caminhos internos do perfil e sem `\` ou `//`**.
- Defeito antigo corrigido no mesmo ponto: o retorno à página pedida antes do login nunca funcionava (a tela de login
  redirecionava para o início ao detectar a sessão). Agora volta à página pedida, quando permitida.

### 7.5 Testes desta rodada (executados nesta máquina)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm test` | **245/245** (+8: `tests/integration/periods.test.ts`) |
| `npm run build` | OK, sem avisos |
| `npm run test:e2e` | **17/17** (+3: `tests/e2e/adjustments.spec.ts` — paciente pré-selecionado, legendas do comparativo, retorno pós-login) |

### 7.6 Riscos residuais

- As despesas de outubro na semente original do design são menores que as de setembro do design; o comparativo
  "1–19 out × 1–19 set" mostra despesas −47% (dado real da semente, não erro de período).
- A comparação "Semana" do Dashboard (semana atual × semana passada inteira) não foi alterada, por pedido.
- Navegadores que já abriram a demo recarregam a semente automaticamente (`SCHEMA_VERSION` 3); o GitHub Pages pode servir
  o `index.html` em cache por alguns minutos após uma publicação.
