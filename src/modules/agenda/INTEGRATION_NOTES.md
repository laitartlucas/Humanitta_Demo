# Agenda (Agente 02) — Notas de integração

Branch `agent/02-agenda`. Pedido formal ao Integrador: [`docs/change-requests/02-agenda-regras-e-acesso.md`](../../../docs/change-requests/02-agenda-regras-e-acesso.md).

## 1. O que o módulo entrega

| Arquivo | Papel |
|---|---|
| `src/modules/agenda/agendaRules.ts` | Regras **puras** sobre o `Database`: funcionamento da clínica, almoço, expediente do profissional, bloqueios aprovados (e pendentes, só informativos), sala ativa, conflito de profissional e de sala, horário passado, grade de horários e pesquisa. |
| `src/modules/agenda/agendaService.ts` | Serviço da Agenda: **compõe** `appointmentService` e `attendanceService` do core com as regras acima. Não grava nada sozinho; toda escrita passa pelo core (que reaplica `agenda_clinica ≥ editar`). |
| `src/modules/agenda/hooks.ts` | `useAgendaSlots`, `useSlotIssues`, `useAvailability` (leitura do mesmo `db`). |
| `src/modules/agenda/index.ts` | API pública para outros módulos. |
| `design_system/screens/agenda/**` | Tela e modais migrados de `@ds/mocks` para `@core` (só formatadores e rótulos continuam vindo de `@ds/mocks/clinical`). |
| `tests/modules/agenda/*.test.ts` | 26 testes: criar, editar, reagendar, cancelar, confirmar, conflitos, filtros, pesquisa, persistência e permissões. |

Não existe store, `localStorage` ou coleção própria da Agenda: os agendamentos continuam em `db.appointments` e os pacientes em `db.patients`.

## 2. Regras aplicadas ao gravar (criar, reagendar, editar duração/sala/profissional)

1. Perfil com `agenda_clinica ≥ editar` (admin e recepção). Financeiro e profissional recebem `FORBIDDEN` do serviço — não é só o botão que some.
2. Clínica aberta no dia e dentro do horário de `clinicSettings.hours`; o intervalo de almoço é indisponível.
3. Dentro do expediente do profissional (`workingHours` ∩ funcionamento). Uma **alteração de disponibilidade aprovada** para a data substitui o expediente padrão.
4. Sem bloqueio **aprovado** sobreposto (os pendentes aparecem na grade como "Bloqueio pendente", sem impedir).
5. Sem outra consulta do mesmo profissional sobreposta, considerando a duração.
6. Sala ativa e sem outra consulta sobreposta na mesma sala (ex.: Sala 3, compartilhada por Quiropraxia e Podologia).
7. Criar e reagendar só para horários futuros (relógio `nowIso()` da demo).
8. Só consultas `agendada`/`confirmada` são editadas, reagendadas ou canceladas; confirmar só `agendada`; check-in só no dia; falta só depois do horário.

Erros chegam como `AppError` (`CONFLICT`/`VALIDATION`) com `fields.start`/`fields.roomId`, exibidos no campo e em toast. Os modais também avisam **antes** de enviar (`useSlotIssues`) e mostram a grade livre/ocupado/bloqueado (`useAgendaSlots`).

## 3. Decisões de comportamento

- **Trocar o profissional** no "Editar" usa `rescheduleAppointment` do core no mesmo horário: o original fica `reagendada` e o novo recebe `rescheduledFrom` (o core não permite trocar `professionalId` por `updateAppointment`).
- **Reagendar** mantém a sala; se a sala atual estiver inativa, o modal pede outra. Depois do reagendamento a sala é reaplicada com `updateAppointment`, porque `rescheduleAppointment` do core sempre usa a sala padrão do profissional.
- No detalhe, **"Iniciar/Concluir atendimento" foram substituídos por "Registrar chegada"** (check-in via `attendanceService.checkIn`): iniciar/finalizar é exclusivo do profissional responsável no Portal (core). Com a consulta em andamento, o modal informa isso.
- Registros `reagendada` **sem sucessor** (dados da Etapa 1: `ag-004`, `ag-404`) podem receber o novo horário pelo "Reagendar".
- O aviso "Avisar paciente pelo WhatsApp" continua simulado (toast). O envio real é do Agente 07.

## 4. Como outros agentes usam

**Portal do Profissional (04)** — consultar os agendamentos do profissional logado:

```ts
import { useAppointments } from '@core';
const mine = useAppointments({ from, to }); // o seletor do core já restringe a ctx.professionalId
```

Disponibilidade para a "Minha Agenda" (expediente, almoço, bloqueios aprovados/pendentes):

```ts
import { useAvailability, useAgendaSlots } from '@modules/agenda';
const { professionalDay } = useAvailability();
const day = professionalDay(ctx.professionalId, '2026-10-21'); // { window, unavailable, pending }
```

**WhatsApp / Assistente IA (07)** — agendar respeitando as mesmas regras: chame `createAgendaAppointment(ctxRecepcao, input)` / `rescheduleAgendaAppointment` / `cancelAgendaAppointment` em vez das funções do core diretamente (enquanto o CR abaixo não for atendido).

## 5. Pendências e dependências fora da minha área

| # | Situação | Impacto | Pedido |
|---|---|---|---|
| 1 | `appointmentService` (core) só valida conflito do mesmo profissional e bloqueios. Sala, funcionamento, almoço e expediente estão só no módulo da Agenda. | Quem chamar o core direto (Portal, IA) pode gravar em sala ocupada ou fora do horário. | Mover `checkSlot` para o core (ou validar em `createAppointment`/`rescheduleAppointment`). |
| 2 | `rescheduleAppointment` não aceita `roomId` nem preserva `confirmada`; `updateAppointment` não troca profissional. | Contornado no módulo (dois passos). | Parâmetro opcional `roomId` e manter status. |
| 3 | `confirmAppointment` aceita `reagendada`. | O módulo só confirma `agendada`. | Alinhar com o ciclo de vida do DATA_MODELS §4. |
| 4 | O contrato prevê agenda **somente leitura** para Financeiro, mas `NAV_BY_ROLE.financeiro` não inclui `agenda` → `/agenda` mostra "Acesso não autorizado". | A tela já suporta modo leitura (`useCan('agenda_clinica','editar') = false`: sem "Novo agendamento", slots não clicáveis, selo "Somente visualização"). | Incluir `agenda` no menu do Financeiro, se desejado. |
| 5 | Semente: sábado está `open: false` em `clinicSettings.hours`, mas Dra. Lauren e Dra. Bianca têm expediente aos sábados e consultas (`ag-601`, `ag-602`); o artboard mostra sábado de manhã aberto. | Com a regra de funcionamento, sábado fica "Clínica fechada" para novos agendamentos (os existentes continuam visíveis). | Configurar sábado `open: true, 08:00–12:00` (Agente 08 / semente). |
| 6 | Semente: Sala 7 está `active: false`, mas é a sala padrão do Dr. Gustavo (artboard: "Sala 7 · Multiuso"). | Novos agendamentos do Dr. Gustavo pedem outra sala. | Ativar a Sala 7 como Multiuso. |
| 7 | Dr. Gustavo começa 07:30, antes da abertura (08:00). | A janela dele é recortada para 08:00. | Ajustar expediente ou horário da clínica. |
| 8 | `scripts/check-boundaries.mjs` usa `git status --porcelain` sem `-uall`: um diretório novo não rastreado aparece como `tests/modules/` e é acusado como fora da área. | Falso positivo antes do commit; depois do commit passa. | Usar `--untracked-files=all`. |
| 9 | Busca global do cabeçalho (⌘K) não é da Agenda. | A pesquisa de consultas está na barra da Agenda. | — |

## 6. Verificação (executada nesta branch)

- `npm run typecheck` · `npm test` (39 testes: 13 do core + 26 da Agenda) · `npm run build` · `node scripts/check-boundaries.mjs --agent 02`.
- Navegador (dev server local): Recepção — criar (com aviso de conflito ao vivo), confirmar, reagendar, cancelar, recarregar a página (dados mantidos), visão Dia com filtro de profissional e bloqueio aprovado, pesquisa; Financeiro — rota bloqueada pelo menu (item 4); celular 375 px sem rolagem horizontal.
