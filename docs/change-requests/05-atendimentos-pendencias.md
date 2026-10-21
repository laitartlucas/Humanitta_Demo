# CR 05-atendimentos-pendencias

- Agente: 05 · Atendimentos
- Destino: Integrador (00/09) · cópia para 04 (Portal) e 06 (Financeiro)
- Solução local já entregue: `src/modules/attendances/flow.ts` (ações validadas) e `model.ts` (leitura composta).

## 1. Transições sem validação de estado no core — `src/core/services/attendances.ts` (segurança/consistência)

| Função | Problema | Pedido |
|---|---|---|
| `startAttendance` | Não confere o status do agendamento: inicia consulta `concluida`, `cancelada` ou `faltou` (e "reabre" um atendimento finalizado). | Exigir agendamento em `agendada/confirmada/reagendada` e atendimento `aguardando`. |
| `markNoShow` | Marca falta em consulta concluída, em andamento ou futura. | Exigir etapa pendente e data ≤ hoje. |
| `checkIn` | Só bloqueia por `status`; um segundo check-in sobrescreve `checkInAt`. Aceita datas futuras. | Bloquear se `checkInAt` existir; exigir dia da consulta. |
| `cancelAppointment` (agenda) | Não atualiza `Attendance.status` para `cancelado` (fica divergente se havia check-in). | Atualizar o atendimento junto. |

O módulo 05 já bloqueia todos esses casos em `flow.ts` (testado), mas **outro módulo que chame o core direto** (ex.: Portal) não tem a proteção. No backend real, essas regras precisam ser do servidor.

## 2. Registro clínico estruturado — `ClinicalRecord` (`src/core/domain/entities.ts`)

- Hoje só existe `summary: string`. A tela oferece Motivo / Observações / Evolução / Recomendações (fictícios) e grava em `summary` num formato rotulado reversível (`clinicalNote.ts`).
- Pedido: campos opcionais `reason?`, `observations?`, `evolution?`, `recommendations?` (+ `SCHEMA_VERSION`). Sem quebra: textos antigos continuam em `summary`.

## 3. Vínculo financeiro — semente (`src/core/data/seed.ts`)

- Nenhum `FinancialEntryRecord` da semente tem `appointmentId`, então todo atendimento concluído aparece como "Sem lançamento".
- Para o Agente 06: `selectUnbilledFinishedAttendances(state, ctx)` (em `@modules/attendances`) lista os concluídos **sem** receita vinculada — use para gerar cobrança uma única vez por `appointmentId`. Este módulo nunca cria lançamentos.
- Sugestão: promover esse seletor ao core.

## 4. Relógio fixo da demo — `src/core/clock.ts`

- `now()` é sempre 19/10/2026 10:24: início e fim no mesmo minuto ⇒ duração real "menos de 1 minuto". Sugestão: relógio que avança a partir de `DEMO_NOW` (offset desde o carregamento).

## 5. `DataTable` com `srOnlyHeader` — `design_system/components/DataTable.tsx`

- O `<span class="sr-only">` (absolute) escapa do contêiner `overflow-x-auto` (que é `static`) e cria **rolagem horizontal na página** em 1024 px. Contornado localmente com `relative overflow-hidden` no wrapper da tabela. Pedido: `relative` no contêiner de rolagem da `DataTable`.

## 6. Portal do Profissional (Agente 04)

- `/atendimentos` só existe para admin/recepção (`NAV_BY_ROLE`); iniciar/concluir é exclusivo do profissional. O Portal pode reutilizar, sem copiar:
  - `useAttendanceViews()`, `useAttendanceAvailability()`, `useAttendanceFlow()`, `useDemoRecord()` (`@modules/attendances`);
  - `AttendancesScreen` (`@ds/screens/attendances`) já funciona com contexto de profissional (escopo próprio, sem preço, registro editável) — validado manualmente com Dra. Helena e Dra. Lauren numa rota temporária, já removida;
  - ou `FinishAttendanceDialog` / `DemoRecordPanel` isolados.
- Sugestão: promover `model.ts` + `flow.ts` ao core (`attendanceService`), para não haver dependência entre módulos.

## 7. Reagendamentos da semente

- `ag-004` (original) e `ag-404` (novo) vêm ambos como `reagendada`, sem `rescheduledFrom`. O módulo trata o mais antigo como substituído por heurística (`hasLaterSibling` em `model.ts`). Pedido: `rescheduledFrom: 'ag-004'` e status `agendada` em `ag-404` na semente.

## Impacto em outros agentes

Itens 1, 2 e 7 alteram o core/semente (Integrador). Itens 3 e 6 são oportunidades de reuso para 06 e 04; nenhum arquivo deles foi alterado.

## Resposta do Integrador (Agente 09) — 20/10/2026
1. Transições no core: **atendido** (check-in/início/falta; cancelar consulta → atendimento `cancelado`). Falta só após o horário (regra da Agenda); teste ajustado.
2. Registro clínico estruturado: **adiado** (formato rotulado em `summary` mantido).
3. Vínculo financeiro na semente: **atendido** — receitas do histórico têm `appointmentId`; o core recusa 2ª receita por atendimento.
4. Relógio: **atendido** — avança em tempo real no navegador (fixo nos testes).
5. `DataTable` `relative`: **adiado** (contorno local funciona).
6. Promoção de `model.ts`/`flow.ts` ao core: **adiado**.
7. `ag-404` encadeado a `ag-004`: **atendido**.
