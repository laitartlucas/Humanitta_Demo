# CR 02-agenda-regras-e-acesso

- Agente: 02 · Agenda
- Arquivo(s) compartilhado(s): `src/core/services/appointments.ts`, `design_system/layouts/nav.ts`, `src/core/data/seed.ts` (ou `design_system/mocks/business.ts`), `scripts/check-boundaries.mjs`
- Detalhes e contexto: `src/modules/agenda/INTEGRATION_NOTES.md` §5

## O que preciso

1. **Regras de agenda no core.** Mover para `appointmentService` a validação de sala (ativa e sem sobreposição), funcionamento da clínica, almoço e expediente do profissional. A implementação pura já existe em `src/modules/agenda/agendaRules.ts` (`checkSlot`) e pode ser copiada para o core.
2. **`rescheduleAppointment(id, start, professionalId?, roomId?)`** — aceitar `roomId` opcional e preservar o status `confirmada`.
3. **`confirmAppointment`** — aceitar só `agendada` (hoje aceita `reagendada`, que é o registro substituído).
4. **Menu do Financeiro** — incluir `agenda` em `NAV_BY_ROLE.financeiro`, se a agenda somente leitura do contrato (§6, linha 02) for desejada.
5. **Semente** — sábado `open: true, 08:00–12:00`; Sala 7 `active: true` ("Multiuso"); expediente do Dr. Gustavo a partir de 08:00.
6. **check-boundaries** — `git status --porcelain --untracked-files=all`, para não acusar diretórios novos como `tests/modules/`.

## Por quê / qual tela usa

Agenda (criar/reagendar/editar). Sem o item 1, Portal e Assistente IA que chamarem o core diretamente podem reservar uma sala ocupada ou um horário fora do funcionamento.

## Alternativa local enquanto aguardo

`src/modules/agenda/agendaService.ts` compõe os serviços do core com as regras; outros módulos podem importar de `@modules/agenda`. A tela já tem modo somente leitura para perfis sem `agenda_clinica ≥ editar`.

## Impacto em outros agentes

04 (Portal) e 07 (IA) passam a ter as mesmas regras ao agendar. 08 (Configurações) controla horários e salas que alimentam essas regras. Nenhuma mudança de formato do `Database`.

## Resposta do Integrador (Agente 09) — 20/10/2026
1. Regras de sala/expediente no core: **adiado** — continuam em `@modules/agenda` (`checkSlot`), já usadas pela Agenda e pelo agendamento via WhatsApp. Conflito de profissional e bloqueio aprovado seguem no core.
2. `rescheduleAppointment` com `roomId`: **adiado** (a solução local cobre a tela).
3. `confirmAppointment` só `agendada`: **atendido**.
4. Agenda no menu do Financeiro: **não alterado** — o menu por perfil segue o design (`PERMISSIONS.md` §1). Decisão de produto pendente.
5. Sábado/Sala 7/expediente do Dr. Gustavo: **não alterado** — dados "a confirmar com a clínica".
6. `check-boundaries --untracked-files=all`: **atendido**.
- Regra de falta (só após o horário) aplicada no core para todos os módulos.
