# Central WhatsApp e Assistente IA — pontos de extensão

> Nesta etapa **nada está conectado**: não há API do WhatsApp, webhook, provedor de IA nem credenciais.
> Toda mensagem fica no banco local de demonstração e as respostas do assistente vêm de regras
> (`src/modules/ai-assistant/engine.ts`). A interface sempre identifica isso como simulação.

## Onde cada coisa vive hoje

| Responsabilidade | Hoje (demo) | No produto (backend seguro) |
|---|---|---|
| Enviar mensagem | `service.sendMessage` grava no banco local | Backend chama a API oficial do WhatsApp Business (Cloud API) com token guardado no servidor |
| Receber mensagem | `service.receiveSimulatedMessage` (botão "Simular mensagem recebida") | Webhook `POST /webhooks/whatsapp` validado por assinatura → grava a mensagem → notifica o front (SSE/WebSocket) |
| Status de entrega | `service.advanceDelivery` com timers locais | Eventos `sent/delivered/read` do webhook |
| Resposta do assistente | `engine.simulateReply` (regras locais) | Provedor de IA chamado **pelo backend**, com as mesmas configurações (`AiSettings`) como instruções |
| Transferência / modo humano | `service.setMode` / `transferConversation` | Mesma regra, revalidada no servidor (role do token) |
| Agendamento pela central | `service.scheduleFromConversation` → `appointmentService.createAppointment` | Mesmo serviço da Agenda no backend |
| Modelos de mensagem (templates) | não implementado | Templates aprovados pela Meta, cadastrados em Configurações |
| Registro de eventos | mensagens `kind: 'sistema'` | Log de auditoria do servidor |

## Contratos sugeridos para a implementação futura

```ts
/** Porta de saída — implementada SOMENTE no backend. */
interface WhatsAppGateway {
  sendText(to: string, text: string): Promise<{ providerMessageId: string }>;
  sendTemplate(to: string, templateName: string, params: string[]): Promise<{ providerMessageId: string }>;
}

/** Evento normalizado vindo do webhook. */
type WhatsAppInboundEvent =
  | { type: 'message'; from: string; text: string; providerMessageId: string; at: string }
  | { type: 'status'; providerMessageId: string; status: 'enviada' | 'entregue' | 'lida' };

/** Provedor de IA — mesma assinatura do motor simulado, mas assíncrona e no servidor. */
interface AiReplyProvider {
  reply(input: string, settings: AiSettings, ctx: SimulationContext): Promise<SimulationResult>;
}
```

Regras que **não podem mudar** ao trocar a simulação por integrações reais:

1. Nunca responder automaticamente uma conversa com `mode === 'humano'` — revalidar no momento do envio (ver `replyWithSimulatedAi`).
2. Nunca enviar conteúdo clínico (prontuário, diagnóstico, prescrição) pelo assistente.
3. Tokens/chaves só no servidor; o front nunca recebe credenciais.
4. Permissões a partir da sessão autenticada (`whatsapp`, `assistente_ia`, `agenda_clinica`), não do cliente.
