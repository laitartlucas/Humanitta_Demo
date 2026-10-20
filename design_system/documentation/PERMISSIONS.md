# Humanittá Gestão — Perfis de acesso e matriz de permissões

> **Ocultar menus não é segurança.**
> Esta matriz define o que a **interface** mostra para cada perfil. O controle de acesso efetivo será implementado pelos agentes de desenvolvimento, **no servidor**, em toda rota de API e em toda ação.
> Uma tela escondida no front continua acessível a quem chamar a API diretamente, se o servidor não validar.

Fontes:
- Código: `design_system/access/permissions.ts` (`Role`, `PERMISSIONS`, `canAccess`, `inOwnScope`) e `design_system/layouts/nav.ts` (`NAV_BY_ROLE`, `HOME_BY_ROLE`, `DEMO_USERS`).
- Design: `design_system/access/design/Perfis.dc.html` e a página **"Portal do Profissional & Acesso"** do canvas.
- Tela administrativa: Configurações › Permissões (`screens/settings/sections/PermissionsSection.tsx`), que exibe a mesma matriz.

---

## 1. Um login, quatro experiências

```
Login único ──► autenticação no servidor ──► sessão com { userId, role, professionalId? }
            ──► interface do perfil (menu, tela inicial, ações) ──► cada requisição revalidada no servidor
```

| Perfil | Usuário demo | Tela inicial | Menu |
|---|---|---|---|
| **Administrador** | Camila S. | Dashboard | Dashboard, Agenda, Pacientes, Profissionais, Atendimentos, Financeiro, WhatsApp, Assistente IA, Relatórios, Configurações |
| **Recepcionista** | Juliana P. | Agenda | Dashboard, Agenda, Pacientes, Profissionais, Atendimentos, WhatsApp, Relatórios |
| **Profissional de saúde** | Dra. Lauren Bertocchi | Meu Dashboard | Meu Dashboard, Minha Agenda, Meus Pacientes, Meus Atendimentos, Meu Perfil |
| **Financeiro** | Marcelo T. | Financeiro | Dashboard, Financeiro, Pacientes, Relatórios |

Na demonstração, a tela de login tem um seletor "Perfil de demonstração" **só para a apresentação**.
No produto, o perfil **nunca** vem do formulário: ele vem da conta autenticada.

---

## 2. Níveis de acesso

| Nível | Significado | Chip visual |
|---|---|---|
| **Editar** | Lê e altera | `gold-600` sobre `gold-50` · ícone `Pencil` |
| **Visualizar** | Só leitura, clínica toda | `info` · `Eye` |
| **Somente os próprios** | Só registros vinculados ao `professional_id` do usuário | `ai` (#2F6F68) · `UserCheck` |
| **Solicitar** | Pode pedir; outra pessoa aprova | `warning` · `Send` |
| **Sem acesso** | Recurso invisível e bloqueado | `graphite-600` sobre `graphite-100` · `Ban` |

---

## 3. Matriz (padrão de fábrica)

| Recurso | Administrador | Recepcionista | Profissional | Financeiro |
|---|---|---|---|---|
| Dashboard da clínica | Visualizar | Visualizar | Sem acesso (usa Meu Dashboard) | Visualizar |
| Agenda geral | Editar | Editar | Sem acesso | Visualizar |
| Minha agenda | — | — | Somente os próprios | — |
| Bloqueio de horário / disponibilidade | Editar (aprova) | Visualizar | **Solicitar** | Sem acesso |
| Cadastro de pacientes | Editar | Editar | Somente os próprios (dados mínimos) | Visualizar |
| Central WhatsApp | Editar | Editar | Sem acesso | Sem acesso |
| Atendimentos (iniciar/finalizar) | Visualizar | Visualizar (check-in) | Somente os próprios | Visualizar |
| Registro clínico (prontuário) | Sem acesso | Sem acesso | Somente os próprios | Sem acesso |
| Cadastro de profissionais | Editar | Visualizar | Sem acesso | Visualizar |
| Financeiro do paciente | Editar | Visualizar | Sem acesso | Editar |
| Financeiro geral | Editar | Sem acesso | Sem acesso | Editar |
| Repasses | Editar | Sem acesso | Somente os próprios (resumo) | Editar |
| Relatórios de consultas | Visualizar | Visualizar | Somente os próprios | Visualizar |
| Relatórios financeiros | Visualizar | Sem acesso | Sem acesso | Visualizar |
| Assistente IA | Editar | Visualizar | Sem acesso | Sem acesso |
| Configurações da clínica | Editar | Sem acesso | Sem acesso | Sem acesso |
| Usuários e permissões | Editar | Sem acesso | Sem acesso | Sem acesso |
| Meu perfil | Editar | Editar | Editar | Editar |

A administração pode ajustar esta matriz em Configurações › Permissões. Dois limites, porém, são **fixos por sigilo profissional (LGPD)** e não podem ser alterados:
- prontuário só para o profissional responsável;
- o profissional nunca vê o financeiro geral.

### Ações-chave
| Ação | Admin | Recepção | Profissional | Financeiro |
|---|---|---|---|---|
| Criar / reagendar / cancelar agendamento | Sim | Sim | Não (pede à recepção) | Não |
| Iniciar / finalizar atendimento | Não | Check-in | Só os próprios | Não |
| Ver ou registrar prontuário | Não | Não | Só os próprios | Não |
| Solicitar bloqueio de horário | — | — | Sim | — |
| Aprovar bloqueio / alteração de disponibilidade | Sim | Não | Não | Não |
| Registrar pagamento | Sim | Não | Não | Sim |
| Exportar relatório financeiro | Sim | Não | Não | Sim |
| Gerenciar usuários e perfis | Sim | Não | Não | Não |

---

## 4. Portal do Profissional — escopo de dados

- **Agenda, pacientes e atendimentos** filtrados por `professional_id = usuário.professional_id` **na consulta ao banco**, nunca só no front.
- **Pacientes, dados mínimos**: nome, idade, telefone mascarado, próxima e última consulta, tratamento em curso, alertas administrativos.
  Ficam de fora saldo, CPF, endereço completo e dados financeiros. Modele isso como *view*/DTO própria (`PortalPatient` em `mocks/portal.ts`).
- **Preços**: o portal não mostra valores de consulta (`PortalAppointment` não tem preço). Repasses aparecem apenas como resumo do próprio profissional.
- **Bloqueios**: o profissional cria uma *solicitação* (`enviada → aprovada | recusada`). Só a administração altera a disponibilidade real.
  Se a administração desativar a permissão, os botões ficam desabilitados com explicação (`RequestChangeButton`).
- **Registro clínico**: área com cadeado, aviso LGPD e trilha de auditoria ("Acesso registrado em …"). Na demo os campos são demonstrativos.

---

## 5. Requisitos para a implementação (agentes)

1. **Autorização no servidor** em toda rota (leitura e escrita), a partir da sessão: `role`, `userId`, `professionalId`.
2. **Políticas no banco** (ex.: Row Level Security), como `appointments.professional_id = auth.professional_id()` para o perfil profissional.
   Prontuário em tabela separada, com política própria e **log de auditoria** a cada leitura.
3. **Rotas protegidas no front** apenas como conveniência: rota sem permissão renderiza `AccessDenied`, espelhando o 403 do servidor. URL digitada manualmente também cai em 403.
4. **Menor privilégio**: novos usuários começam sem acesso, e o perfil é atribuído por um administrador.
5. **Sessão**: expiração por inatividade, encerramento de sessões em Meu Perfil › Segurança, 2FA opcional.
6. **Testes**: para cada perfil, testar o acesso às APIs de cada recurso marcado "Sem acesso" e esperar 403 do servidor.

---

## 6. Componentes e utilitários

| Item | Onde | Uso |
|---|---|---|
| `Role`, `ROLE_LABEL`, `PERMISSIONS`, `FEATURES`, `canAccess(role, feature, min)`, `inOwnScope(...)` | `@ds/access` | Decidir o que **mostrar** |
| `NAV_BY_ROLE`, `MOBILE_NAV_BY_ROLE`, `HOME_BY_ROLE`, `getNavItems(role)`, `DEMO_USERS` | `@ds/layouts` | Menus e tela inicial por perfil |
| `AppShell role={...} user={...}` | `@ds/layouts` | Sidebar, bottom-nav e header do perfil (o portal ganha a pílula "Portal do Profissional") |
| `AccessDenied` | `@ds/screens/professional-portal` | Estado 403 |
| `ScopeBadge`, `ScopeInfoCard` | `@ds/screens/professional-portal` | Mostram que a lista está restrita aos próprios registros |
| `RequestChangeButton`, `RequestBlockModal`, `BlockRequestList` | `@ds/screens/professional-portal` | Fluxo de solicitação com aprovação |
