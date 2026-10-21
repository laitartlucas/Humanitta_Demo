# CR 03-pacientes

- Agente: 03 · Pacientes
- Branch: `agent/03-pacientes`
- Status: aguardando o Integrador (00). O módulo funciona hoje com as soluções locais descritas abaixo.

## 1. Campos de cadastro ausentes no modelo (`PatientRecord`)

- Arquivo(s) compartilhado(s): `src/core/domain/entities.ts`, `src/core/services/patients.ts` (`PatientInput`), `src/core/data/seed.ts`, `docs/DATA_MODELS.md`
- O que preciso: campos **opcionais** `cpf?: string` (fictício, exibido mascarado), `address?: { street; number; district; city; state; zip }` e `emergencyContact?: { name; relationship; phone }`.
- Por quê: o artboard `PacientePerfil.dc.html` mostra CPF (mascarado), endereço e contato de emergência, e o brief do módulo pede esses campos no cadastro.
- Alternativa local: o formulário e a ficha usam só os campos do contrato atual (nome, nascimento, telefone, e-mail, cidade, etiquetas, situação e `adminNote` como observação administrativa). Nada é guardado fora do `Database`.
- Impacto: Portal (04) **não** deve receber esses campos (`selectMyPatients` continua sem CPF/endereço). Incrementar `SCHEMA_VERSION`.

## 2. Prevenção de duplicidade no serviço

- Arquivo: `src/core/services/patients.ts`
- O que preciso: `createPatient`/`updatePatient` recusarem (`CONFLICT` com `fields`) telefone já cadastrado, ou nome + data de nascimento iguais.
- Alternativa local: `registerPatient`/`savePatient` em `design_system/screens/patients/data/patientData.ts` fazem a checagem antes de chamar o serviço. Outros pontos de cadastro (ex.: WhatsApp/IA) não passam por ela.

## 3. Sincronização de nome/telefone desnormalizados

- Arquivo: `src/core/services/patients.ts` (`updatePatient`)
- Hoje só `appointments[].patientName` é sincronizado. Faltam:
  - `conversations[].contactName` / `phone` (quando `patientId` bate);
  - `financialEntries[].patientName`.
- Impacto: WhatsApp (07) e Financeiro (06) mostram o nome antigo depois de uma edição até essa correção.

## 4. Status inativo no serviço

- `createPatient` sempre grava `status: 'ativo'`. O módulo cria e, se o formulário pedir inativo, chama `updatePatient` em seguida.
- Sugestão: aceitar `status?` em `PatientInput`.
- Sugestão para a Agenda (02): `createAppointment` recusar paciente com `status = 'inativo'`.

## 5. Histórico de alterações cadastrais

- `ActivityEvent` não tem `patientId`; o histórico do paciente filtra o feed pelo nome (frágil se o nome mudar).
- O que preciso: `ActivityEvent.subject?: { kind: 'patient' | …; id: ID }` (opcional) e que `logActivity` aceite esse parâmetro.

## 6. Financeiro do paciente como seletor do core

- `selectFinancialEntries` exige `financeiro ≥ ver`, mas a matriz dá à recepção `pacientes_financeiro = ver` e `financeiro = nenhum`.
- Alternativa local: `selectPatientFinance` (no módulo) checa `pacientes_financeiro ≥ ver` e devolve só receitas do paciente.
- Sugestão: promover para `src/core/selectors` (`selectPatientFinance`) e expor `usePatientFinance(patientId)`.

## 7. Escopo `proprio` do cadastro de pacientes

- `selectPatients` devolve `[]` para o profissional (`pacientes_cadastro = proprio`). O módulo já trata o escopo `proprio` em `selectPatientRows`/`selectPatientDetail` (só pacientes vinculados, em dados mínimos, sem saldo/e-mail/cidade/telefone completo). Isso fica disponível para o Portal (04) se ele quiser reaproveitar.
- Sugestão: promover `selectPatientScope` para o core.

## 8. Integração com a Agenda (Agente 02)

- O botão "Agendar" do perfil leva a `/agenda`, mas a Agenda ainda não aceita paciente pré-selecionado.
- O que preciso: um jeito tipado de abrir "Novo agendamento" com `patientId` (sem dado pessoal na URL), por exemplo `useAppNavigate()('agenda')` com `state: { newAppointmentFor: patientId }`, ou um `AppRoute` com parâmetro.
- **Dependência**: neste branch a Agenda ainda lê `@ds/mocks/clinical` para a lista de pacientes. Pacientes cadastrados aqui só aparecem na seleção de novos agendamentos quando a Agenda migrar para `usePatients()` (tarefa do Agente 02 no contrato §6). O fluxo pelo serviço já funciona: `appointmentService.createAppointment` aceita o novo `patientId` (coberto em `tests/modules/patients`).

## 9. Botão WhatsApp

- Hoje leva a `/whatsapp`. Para abrir direto a conversa do paciente: `routePath('whatsapp', conversationId)` + rota `/whatsapp/:conversationId` (Agente 07 / Integrador).

## Resposta do Integrador (Agente 09) — 20/10/2026
1. CPF/endereço/contato de emergência: **adiado** (exige `SCHEMA_VERSION` e decisão de LGPD).
2. Duplicidade: **parcialmente atendido** — o core recusa telefone já cadastrado (`CONFLICT`); nome + nascimento continua na regra local.
3. Sincronização de nome/telefone em conversas e lançamentos: **atendido**.
4–7. `status` na criação, `subject` no feed, `selectPatientFinance` e `selectPatientScope` no core: **adiados** (soluções locais em uso).
8. Paciente pré-selecionado na Agenda: **adiado** (documentado em `docs/agents/AGENT_09.md` §2.2).
9. Abrir conversa específica no WhatsApp: **adiado**.
