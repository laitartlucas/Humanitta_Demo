# CR 07-whatsapp-ia

- Agente: 07 · WhatsApp e Assistente IA
- Status: aguardando Integrador (09/00)
- Alternativa local: **já implementada** em `src/modules/messaging/` e `src/modules/ai-assistant/` — nada quebra se o CR demorar.

## 1. Status da conversa (aberta / pendente / encerrada)

- Arquivo(s): `src/core/domain/entities.ts`, `src/core/services/messaging.ts`, `docs/DATA_MODELS.md`
- O que preciso: campo opcional `ConversationRecord.status?: 'aberta' | 'pendente' | 'encerrada'` (ausente = `aberta`) e serviço `setConversationStatus(ctx, convId, status)` com `whatsapp ≥ editar`.
- Por quê: encerrar, reabrir, marcar pendente e os indicadores "pendentes/finalizadas" da Central.
- Alternativa local: `src/modules/messaging/model.ts` (`ConversationView`, `statusOf`) grava o campo opcional no mesmo registro via repositório + `assertCan`.
- Impacto: nenhum para leitores atuais (campo opcional). Dashboard/Relatórios podem passar a contar "finalizadas".

## 2. Etiquetas

- O que preciso: `addConversationTag(ctx, convId, tag)` / `removeConversationTag(ctx, convId, tag)` no `messagingService` (deduplicação sem diferenciar maiúsculas, até 32 caracteres).
- Alternativa local: `addTag` / `removeTag` em `src/modules/messaging/service.ts`.

## 3. Mensagens de sistema

- O que preciso: `MessageRecord.kind?: 'sistema'` (registro de evento que nunca é enviado ao contato) e `from` aceitando `'sistema'`, ou o campo `kind` apenas.
- Por quê: registro visual de transferência, assumir/devolver para IA, status, vínculo e agendamento.
- Alternativa local: `MessageView.kind = 'sistema'` com `from: 'atendente'`. **Atenção** para quem contar mensagens por `from === 'atendente'`: filtrar `kind !== 'sistema'`.

## 4. Relógio das mensagens (bug)

- Arquivo: `src/core/services/messaging.ts`
- Problema: `sendMessage` e `appendAiMessage` usam `nowIso()` (fixo em 19/10 10:24), mas a semente tem mensagens até 10:42. Mensagens novas ficam **antes** das existentes no histórico e a conversa não sobe na lista.
- Proposta: usar `max(nowIso(), última mensagem + 1s)` — exatamente `nextTimestamp()` de `src/modules/messaging/service.ts` — ou alinhar a semente ao relógio.
- Alternativa local: o serviço do módulo corrige `at`/`lastAt` logo após chamar o core.

## 5. `appendAiMessage` sem contexto nem guarda

- Problema: `appendAiMessage(convId, text)` não recebe `ctx`, não checa permissão nem o modo da conversa — permitiria resposta automática numa conversa em atendimento humano.
- Proposta: `appendAiMessage(ctx, convId, text)` que lança `CONFLICT` se `mode !== 'ia'` ou `aiConfig.enabled === false`.
- Alternativa local: `replyWithSimulatedAi` revalida modo, status e configuração no momento do envio (coberto em `tests/modules/messaging/service.test.ts`).

## 6. Recebimento simulado

- O que preciso: `receiveMessage(convId, text)` no core (no produto: webhook do WhatsApp Business no backend) que incrementa `unread`, atualiza a prévia e reabre conversa encerrada.
- Alternativa local: `receiveSimulatedMessage` (ferramenta da demonstração, exige `whatsapp ≥ editar`).

## 7. Campos humanizados do Assistente IA

- Arquivo: `design_system/mocks/business.ts` (`AiAssistantConfig`) / `src/core/domain/entities.ts` (`AiConfig`), semente.
- O que preciso: campos opcionais `description`, `personality`, `objective`, `limits`, `adminInstructions`, `customReplies: { id, label, keywords[], answer, enabled }[]`, `autoReplyInCentral: boolean`.
- Alternativa local: `src/modules/ai-assistant/settings.ts` (`AiConfigExtras`, `withExtras`, `defaultAiSettings`) grava os campos no mesmo documento `aiConfig` via `updateAiConfig`.

## 8. Rota do Assistente IA para a recepção (decisão de produto)

- `PERMISSIONS.recepcao.assistente_ia = 'ver'`, mas `NAV_BY_ROLE.recepcao` não tem `assistente`, então a rota mostra 403. A tela já suporta somente leitura (`fieldset disabled` + aviso). Decidir se a recepção deve ver a configuração; se sim, incluir o item no menu.

## 9. Mensagens da semente com conteúdo sensível

- `cv-08 / m-0802` diz que o arquivo de exame foi encaminhado "para anexar ao prontuário". Sugestão: trocar por texto administrativo ("Recebido! Nossa equipe vai encaminhar o documento à profissional responsável.").

## 10. Promoção de utilitários

- `findAvailableSlots` (`src/modules/messaging/availability.ts`) é útil para Agenda/Portal; candidato a seletor do core (`selectAvailableSlots`).

## Resposta do Integrador (Agente 09) — 20/10/2026
1–3, 6, 7, 10. Status da conversa, etiquetas, mensagens de sistema, `receiveMessage`, campos humanizados da IA, `selectAvailableSlots` no core: **adiados** (soluções locais gravam no mesmo banco).
4. Relógio/ordem das mensagens: **atendido** no core (`isoAfter`).
5. Guarda da IA: **atendido** — `appendAiMessage` recusa conversa fora do modo IA.
8. Assistente IA no menu da recepção: **não alterado** (menu do design); decisão de produto pendente.
9. Mensagem `m-0802`: **atendido** (texto administrativo).
