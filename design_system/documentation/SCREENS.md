# Humanittá Gestão — Telas (SCREENS.md)

Cada tela tem três representações:

| Camada | Onde | Para quê |
|---|---|---|
| **Artboard de design** | `screens/<módulo>/design/*.dc.html` e o canvas publicado no claude.ai | Referência visual e de conteúdo, aberta no editor Design |
| **Tela React** | `screens/<módulo>/*Screen.tsx` | Implementação navegável com dados fictícios, sem backend |
| **Modais do módulo** | `screens/<módulo>/modals/*.tsx` | Fluxos de criação e edição |

> Os arquivos `.dc.html` dependem do runtime do editor Design (`support.js`) e **não abrem soltos** no navegador.
> Para ver as telas localmente, rode `npm run dev`. Para ver os artboards, abra o canvas do claude.ai.

Rotas de pré-visualização: o `src/App.tsx` usa um roteador em memória. No login, escolha o **perfil de demonstração** e preencha qualquer senha; cada perfil abre a própria tela inicial (Admin → Dashboard, Recepção → Agenda, Profissional → Meu Dashboard, Financeiro → Financeiro). Uma rota fora do perfil mostra `AccessDenied` (403). Ver `PERMISSIONS.md`.

---

## 01 · Login — `screens/login`
- **Arquivos**: `LoginScreen.tsx` · design `Login.dc.html`
- **Conteúdo**: painel institucional escuro (símbolo, frase acolhedora, quarto de círculo dourado, endereço) + formulário (e-mail, senha com mostrar/ocultar, manter conectado, esqueci a senha, Entrar) + selos de demonstração.
- **Estados**: erro de validação, credenciais inválidas, carregando.
- **Props**: `onLogin?: () => void`. A autenticação real fica para a próxima etapa.

## 02 · Dashboard — `screens/dashboard`
- **Arquivos**: `DashboardScreen.tsx` · `Dashboard.dc.html` (artboard-mestre do shell)
- **Blocos**: saudação contextual · 5 KPIs (consultas hoje, pacientes ativos, faturamento do mês, ocupação com barra, a confirmar) ·
  faturamento de 6 meses (`BarChart`, mês atual em dourado) · consultas por especialidade (`HorizontalBarList`) ·
  próximos atendimentos (`DataTable`) · atividades recentes (linha do tempo).
- **Props**: `onNavigate`, `onNewAppointment`.

## 03 · Agenda Inteligente — `screens/agenda`
- **Arquivos**: `AgendaScreen.tsx`, `components/` (`AgendaToolbar`, `AgendaSidebar`, `WeekView`, `DayView`, `MonthView`),
  `agendaUtils.ts` (grade, `HOUR_HEIGHT`, sobreposição, slots), `modals/` (`NewAppointmentModal`, `AppointmentDetailsModal`,
  `EditAppointmentModal`, `RescheduleModal`, `CancelAppointmentModal`) · design `Agenda.dc.html` (interativo), `AgendaModais.dc.html`
- **Visões**: Dia (colunas por profissional) · Semana (padrão, seg–sáb, 07–20h, linha dourada da hora atual) · Mês (até 3 consultas por dia + "mais").
- **Filtros**: profissional, especialidade (legenda clicável), sala, status.
- **Disponibilidade**: mini calendário com dias marcados, ocupação por profissional, salas livres, clique em slot vazio para agendar.
- **Cards**: faixa superior na cor da especialidade, paciente, horário, serviço, status e ícone de origem IA. Abaixo de 2 sobreposições as consultas ficam lado a lado; acima disso, em cascata.
- **Estados**: confirmar, cancelar (com motivo), concluir, reagendar e conflito de sala no editar, cada um com toast de resultado.

## 04 · Pacientes — `screens/patients`
- **Arquivos**: `PatientsScreen.tsx`, `PatientProfileScreen.tsx`, `modals/` (`NewPatientModal`, `EditPatientModal`,
  `DeletePatientDialog`, `PatientFormFields`) · design `Pacientes.dc.html`, `PacientePerfil.dc.html`
- **Lista**: busca, filtros rápidos (`FilterChip`), tabela com seleção e ações em massa, paginação, drawer de pré-visualização, estado vazio de busca.
- **Perfil (abas)**: Visão geral · Agendamentos · Histórico administrativo · Documentos demonstrativos · Financeiro · Dados cadastrais.
  O prontuário clínico **não** aparece aqui: um aviso com cadeado leva para Atendimentos.

## 05 · Profissionais — `screens/professionals`
- **Arquivos**: `ProfessionalsScreen.tsx`, `ProfessionalProfileScreen.tsx`, `modals/` (`NewProfessionalModal`,
  `EditProfessionalModal`, `ProfessionalFormFields`) · design `Profissionais.dc.html`
- **Cards**: foto (placeholder com iniciais e anel dourado, até chegarem as fotos oficiais), especialidade, sala, horários livres hoje, ocupação semanal, status.
  A Dra. Lauren Bertocchi é a única profissional real (selo "Responsável técnica"). As demais levam o selo "Demo".
- **Perfil**: KPIs, serviços, agenda individual semanal e configuração de horários (dias, início/fim, intervalo, exceções e folgas).

## 06 · Atendimentos — `screens/attendances`
- **Arquivos**: `AttendancesScreen.tsx`, `modals/AttendanceDetailsModal.tsx` · design `Atendimentos.dc.html`
- **Conteúdo**: abas por status, filtros, "Agora na clínica" (em curso, com tempo decorrido, e fila de espera), tabela do dia, drawer de detalhes
  (linha do tempo, checklist administrativo), **área de registro clínico restrito** (cadeado, campos desabilitados, aviso LGPD), iniciar e finalizar atendimento, histórico fictício.

## 07 · Financeiro — `screens/finance`
- **Arquivos**: `FinanceScreen.tsx`, `modals/` (`NewEntryModal`, `RegisterPaymentModal`, `DeleteEntryDialog`) · design `Financeiro.dc.html` (interativo)
- **Abas**: Visão geral (KPIs, fluxo de caixa em `LineChart`, receita por especialidade em `DonutChart`, formas de pagamento, vencimentos) ·
  Receitas · Despesas · A receber (cobrar via WhatsApp) · Repasses (por profissional, fechar mês).

## 08 · Central WhatsApp — `screens/messaging`
- **Arquivos**: `MessagingScreen.tsx`, `components/` (`ConversationList`, `ChatThread`, `MessageComposer`, `PatientPanel`, `TransferMenu`) · design `WhatsApp.dc.html`
- **3 colunas**: conversas e filtros (Todas, Não lidas, IA, Humano, etiquetas) · histórico com bolhas por autor (paciente, IA, atendente, sistema), cartões de horários sugeridos e campo de digitação com respostas rápidas · painel do paciente com ações rápidas e notas internas.
- **Indicadores**: modo IA/Humano, assumir conversa, transferir. **Sem integração real**: tudo é simulado em memória.
- No celular as colunas viram etapas: lista → conversa → painel.

## 09 · Assistente IA — `screens/ai-assistant`
- **Arquivos**: `AiAssistantScreen.tsx`, `components/` (`IdentityTab`, `BehaviorTab`, `KnowledgeTab`, `HoursTab`, `TransferTab`,
  `TestingTab`, `ChatPreview`, `simulate.ts`) · design `AssistenteIA.dc.html` (interativo)
- **Abas**: Identidade (nome, personalidade, tom de voz, assinatura, mensagem inicial) · Comportamento (permissões e instruções; orientação clínica bloqueada) ·
  Conhecimento/FAQ · Horários · Transferência humana (regras, palavras-chave, SLA) · Ambiente de testes (sandbox com intenção detectada).
- Switch global para ativar ou desativar e prévia ao vivo no formato do WhatsApp. `simulate.ts` responde por regras simples. **Não há IA real.**

## 10 · Relatórios — `screens/reports`
- **Arquivos**: `ReportsScreen.tsx` · design `Relatorios.dc.html`
- **Conteúdo**: filtros de período e comparação com o período anterior, KPIs com delta, evolução de consultas (atual vs. anterior tracejado), faturamento mensal,
  consultas por especialidade, comparecimento/faltas/cancelamentos, heatmap de horários de pico, produtividade por profissional e biblioteca de relatórios com exportação PDF/CSV (simulada, via toast).

## 11 · Configurações — `screens/settings`
- **Arquivos**: `SettingsScreen.tsx`, `sections/` (`ClinicDataSection`, `SpecialtiesSection`, `ServicesSection`, `RoomsSection`,
  `HoursSection`, `UsersSection`, `PermissionsSection`, `NotificationsSection`, `VisualIdentitySection`, `IntegrationsSection`) · design `Configuracoes.dc.html` (interativo)
- Navegação secundária (lista vertical em lg+, select abaixo disso) e rodapé "Salvar / Descartar" ativo apenas quando há alteração.
- Dados confirmados da clínica já vêm preenchidos. O que não foi confirmado aparece como `[a definir]`.

---

## 12 · Portal do Profissional — `screens/professional-portal`
Experiência do perfil **Profissional de saúde**: mesmo login e mesma identidade visual, com uma sidebar simplificada (Meu Dashboard, Minha Agenda, Meus Pacientes, Meus Atendimentos, Meu Perfil) e escopo restrito aos registros do próprio profissional.
Profissional da demo: Dra. Lauren Bertocchi (`prof-lauren`). Pacientes e horários são fictícios. Seletores de escopo em `mocks/portal.ts`.

| Tela | Arquivos | Conteúdo |
|---|---|---|
| **Meu Dashboard** | `dashboard/PortalDashboardScreen.tsx` · `PortalDashboard.dc.html` | Boas-vindas, KPIs (hoje, confirmadas, pendentes, concluídas), próximo atendimento com Iniciar, agenda do dia (livres tracejados), semana compacta, calendário mensal, horários disponíveis, pacientes de hoje, histórico dos próprios atendimentos, atalho para o perfil |
| **Minha Agenda** | `calendar/PortalCalendarScreen.tsx`, `calendar/components/` (`PortalWeekBoard`, `PortalMonthGrid`), `calendar/modals/RequestBlockModal.tsx` · `PortalAgenda.dc.html` | Dia/Semana/Mês, filtro por data e status, cards (horário, paciente, serviço, status), livre × ocupado × bloqueado × bloqueio pendente, drawer de detalhes **sem valores**, solicitação de bloqueio com detecção de conflito, "Minhas solicitações" (enviada, aprovada, recusada). Não cria agendamento: isso é da recepção |
| **Meus Pacientes** | `patients/PortalPatientsScreen.tsx` · `PortalPacientes.dc.html` | Lista e cartões dos pacientes vinculados, filtros, drawer com **dados mínimos** (telefone mascarado, consultas e histórico com o profissional, alertas), card "Por que vejo apenas estes dados?" |
| **Meus Atendimentos** | `attendances/PortalAttendancesScreen.tsx`, `attendances/modals/FinishAttendanceModal.tsx` · `PortalAtendimentos.dc.html` | Hoje (aguardando → iniciar, em andamento com cronômetro → finalizar), **registro clínico restrito** com campos demonstrativos, aviso LGPD e trilha de auditoria, histórico autorizado (registro de outro profissional aparece bloqueado) |
| **Meu Perfil** | `profile/PortalProfileScreen.tsx` · `PortalPerfil.dc.html` | Dados profissionais (valores definidos pela administração), disponibilidade em modo leitura + "Solicitar alteração", preferências de notificação e de agenda, segurança (senha, sessões, 2FA), resumo de "Meus repasses" |
| Compartilhados | `shared/` | `AccessDenied` (403), `ScopeBadge`, `ScopeInfoCard`, `DayTimeline`, `WeekStrip`, `BlockRequestList`, `RequestChangeButton`, `PortalAppointmentDrawer`, `AttendanceHistoryList` |
| Responsivo | `design/PortalResponsivo.dc.html` | Tablet paisagem (consultório) e retrato, 4 telas de smartphone, bottom-nav do portal |

## 13 · Perfis & permissões — `access/`
- `access/design/Perfis.dc.html` (interativo): fluxo "um login, quatro experiências", menus dos 4 perfis lado a lado, matriz de permissões, ações por perfil, estados de acesso (403, ação desabilitada, aprovação pendente para o admin) e o aviso de segurança.
- Configurações › Permissões renderiza a mesma matriz a partir de `@ds/access`.

---

## Modais (todos)

| Modal | Componente React | Artboard |
|---|---|---|
| Novo paciente | `patients/modals/NewPatientModal` | `components/design/Modais.dc.html` §1 |
| Editar paciente | `patients/modals/EditPatientModal` | Modais §2 |
| Novo agendamento | `agenda/modals/NewAppointmentModal` | `agenda/design/AgendaModais.dc.html` §1 |
| Editar agendamento | `agenda/modals/EditAppointmentModal` | AgendaModais §3 |
| Reagendar | `agenda/modals/RescheduleModal` | AgendaModais §4 |
| Cancelar consulta | `agenda/modals/CancelAppointmentModal` | AgendaModais §5 |
| Detalhes da consulta | `agenda/modals/AppointmentDetailsModal` | AgendaModais §2 |
| Novo profissional | `professionals/modals/NewProfessionalModal` | Modais §3 |
| Editar profissional | `professionals/modals/EditProfessionalModal` | Modais §4 |
| Novo lançamento | `finance/modals/NewEntryModal` | Modais §5 |
| Registrar pagamento | `finance/modals/RegisterPaymentModal` | Modais §6 |
| Confirmar exclusão | `ConfirmDialog` (+ `DeletePatientDialog`, `DeleteEntryDialog`) | Modais §7 |
| Detalhes de atendimento | `attendances/modals/AttendanceDetailsModal` | Modais §8 |
| Drawer (filtros avançados) | `Drawer` | Modais §9 |
| Solicitar bloqueio de horário (portal) | `professional-portal/calendar/modals/RequestBlockModal` | `PortalAgenda.dc.html` |
| Finalizar atendimento (portal) | `professional-portal/attendances/modals/FinishAttendanceModal` | `PortalAtendimentos.dc.html` |

Os estados de hover, foco, erro, sucesso, carregamento, seleção e desabilitado de todos os componentes estão em `components/design/Componentes.dc.html`.
