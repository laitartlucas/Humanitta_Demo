# CR 08-relatorios-configuracoes

- Agente: 08 · Relatórios e Configurações
- Branch: `agent/08-relatorios-config`
- Destinatário: Integrador (00) / Agente 09 (integração geral)

Este pedido reúne as dependências encontradas ao implementar Relatórios e Configurações. Para cada item já existe uma solução local no módulo; nada foi alterado fora da área do Agente 08.

## 1. `AppointmentRecord.serviceId` preenchido

- Arquivos compartilhados: `src/core/data/seed.ts`, `src/core/services/appointments.ts`
- O que preciso: `serviceId` preenchido na semente e em `createAppointment`/`updateAppointment`. Hoje nenhum dos 64 agendamentos tem esse campo, e os nomes de serviço dos agendamentos (22 nomes) não batem com o cadastro `services` (10 itens).
- Quem usa: o filtro "Serviço" e a "Distribuição por serviço" dos Relatórios.
- Alternativa local: os Relatórios agrupam e filtram por `Appointment.service` (nome).
- Impacto: Agenda (02) e Assistente IA (07) ao criar agendamentos.

## 2. Vínculo `FinancialEntryRecord.appointmentId`

- Arquivos compartilhados: `src/core/data/seed.ts`, `src/core/services/finance.ts`
- O que preciso: receitas ligadas ao agendamento de origem (o campo já existe no tipo, mas está vazio na semente).
- Quem usa: "Receita por serviço" nos Relatórios.
- Alternativa local: mostramos "Receita por categoria de serviço" (`category`), com uma nota na tela. Não estimamos receita por serviço a partir do preço do agendamento, para não contar a mesma receita duas vezes.
- Impacto: Financeiro (06).

## 3. Preferências do sistema e feriados

- Arquivo compartilhado: `src/core/domain/entities.ts` (`ClinicSettings`) + `SCHEMA_VERSION`
- O que preciso: campos opcionais `preferences?: { dateFormat; defaultAgendaView; weekStartsOn; … }` e `holidays?: { date; label; allDay }[]`. O artboard de Configurações tem "Feriados e recesso".
- Alternativa local: **não implementado**. Sem campo no modelo não há onde persistir, e é proibido criar `localStorage` próprio. As seções não aparecem, para não simular algo que não grava.
- Impacto: Agenda (02) e Assistente IA (07) devem respeitar feriados ao oferecer horários.

## 4. Proteção contra autoalteração no serviço

- Arquivo compartilhado: `src/core/services/settings.ts`
- O que preciso: `upsertUser` recusar (FORBIDDEN) mudança de `role`/`status` do próprio `ctx.userId`, e `setPermission` recusar a redução de `configuracoes`/`usuarios_permissoes` do próprio perfil.
- Alternativa local: a interface impede (campos bloqueados, sem botão de desativar a si mesmo, células "seu perfil" travadas na matriz). Hoje é só interface; o serviço ainda aceita.

## 5. Situação do profissional

- Arquivo compartilhado: `Professional` (`design_system/mocks/types.ts`)
- O que preciso: decidir se `Professional` ganha `active?: boolean`.
- Alternativa local: "Profissionais ativos/inativos" usa a situação do usuário vinculado (`users[].status === 'ativo'`). Desativar o usuário em Configurações › Usuários atualiza o relatório.
- Impacto: Profissionais (04).

## 6. Relatórios individuais do profissional

- Arquivos compartilhados: `design_system/layouts/nav.ts` (`NAV_BY_ROLE`)
- Situação: a matriz dá `relatorios_operacionais = proprio` ao profissional, mas a rota `/relatorios` não faz parte do menu dele (ProtectedLayout → 403).
- Pronto do lado do Agente 08: `buildReport` já restringe tudo ao `ctx.professionalId` (escopo próprio, sem financeiro nem pacientes; testado). Falta decidir se entra no menu do Portal (Agente 04) ou em `NAV_BY_ROLE`.

## 7. Tamanho do bundle

- Arquivos compartilhados: `src/app/router.tsx` / `moduleRegistry`
- Observação: `vite build` avisa que o chunk principal tem mais de 500 kB (526 kB, 141 kB gzip) com todos os módulos.
- Sugestão: `React.lazy` por módulo no registro de rotas.

## 8. Fora do escopo desta etapa (evolução futura)

- Exportação em PDF: exige biblioteca nova ou serviço. O botão aparece desabilitado, com "em breve".
- Envio real de e-mail/SMS/WhatsApp, upload de logotipo, convites de usuário e senhas: tudo simulado ou desabilitado e identificado como demonstração.
- Permissão específica de exportação: hoje exportar exige o mesmo nível de visualização do relatório (`relatorios_operacionais`/`relatorios_financeiros ≥ ver`, mais `pacientes_cadastro`/`whatsapp` conforme o caso). Se for necessário separar "ver" de "exportar", falta uma `Feature` nova.

## Resposta do Integrador

_(pendente)_
