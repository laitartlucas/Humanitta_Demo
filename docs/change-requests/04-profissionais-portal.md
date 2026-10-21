# CR 04-profissionais-portal — notas de integração e pedidos ao Integrador

- Agente: 04 · Profissionais e Portal do Profissional
- Branch: `agent/04-profissionais-portal`
- Destinatário: Integrador (Agente 0 — referido no briefing como "Agente 09")

## 1. O que foi entregue (somente na área do Agente 04)

| Área | Arquivos |
|---|---|
| Gestão de profissionais | `design_system/screens/professionals/{ProfessionalsScreen,ProfessionalProfileScreen}.tsx`, `professionalActions.ts`, `professionalsData.ts`, `modals/{New,Edit}ProfessionalModal.tsx`, `modals/ProfessionalFormFields.tsx`, `modals/{GrantAccess,RefuseRequest}Modal.tsx` |
| Portal — dados | `design_system/screens/professional-portal/shared/{portalData,usePortalData,portalActions}.ts` |
| Portal — telas | `dashboard/`, `calendar/` (tela, `PortalWeekBoard`, `PortalMonthGrid`, `RequestBlockModal`), `patients/`, `attendances/` (tela, `clinicalDraft.ts`, `FinishAttendanceModal`), `profile/`, `shared/{DayTimeline,WeekStrip,PortalAppointmentDrawer,BlockRequestList}.tsx` |
| Rotas | `src/modules/professionals/routes.tsx`, `src/modules/portal/routes.tsx` |
| Testes | `tests/modules/professionals/professionals.test.ts`, `tests/modules/portal/portal.test.ts` |

Leitura só por hooks do `@core`, escrita só por serviços (`settingsService`, `blockRequestService`,
`attendanceService`) via `useAction`. Nenhum store, `localStorage` ou coleção paralela.
As telas do Portal não aceitam mais `professionalId` por prop: o profissional é sempre o da sessão.
Imports restantes de `@ds/mocks/*` são apenas tipos, formatadores e rótulos (permitido pelo contrato §8.3).

## 2. Pedidos de mudança compartilhada (com solução local em uso)

### 2.1 `Professional.status` (situação do cadastro)
- Arquivo: `src/core/domain/entities.ts`, `settingsService.upsertProfessional`.
- Hoje: ativar/desativar usa o `status` do `UserRecord` vinculado (`setProfessionalActive`). Profissional sem usuário aparece como "Sem acesso ao Portal".
- Pedido: campo opcional `status?: 'ativo' | 'inativo'` no `Professional`, para a Agenda (02) poder ocultar inativos ao criar consultas.
- Impacto: 02 (filtro de profissionais), 08 (Configurações › Usuários).

### 2.2 Vários serviços / especialidades por profissional
- Hoje: o vínculo com serviços é derivado da especialidade única (`services.filter(s => s.specialty === prof.specialty)`).
- Pedido: `Professional.serviceIds?: ID[]` e `Professional.extraSpecialties?: Specialty[]`.

### 2.3 Intervalo por dia na grade
- Hoje: `workingHours` não tem intervalo; usamos o intervalo padrão 12:00–13:00 quando o expediente passa pelo almoço (`DEFAULT_BREAK`). Os campos "Intervalo" do editor de horários ficam desabilitados.
- Pedido: `workingHours[].breakStart?/breakEnd?`.

### 2.4 Dados de contato e preferências do próprio profissional
- `settingsService.updateOwnProfile` só aceita `title` e `avatarUrl`. Telefone profissional, apresentação curta e preferências (notificações, visão padrão, retorno padrão) estão visíveis mas desabilitados / valem só na sessão.
- Pedido: `Professional.phone?`, `Professional.bio?` aceitos em `updateOwnProfile`, e `UserRecord.preferences?` com serviço próprio.

### 2.5 Histórico restrito (atendimentos de outros profissionais com os mesmos pacientes)
- Hoje: `selectRestrictedMarkers` (local, `portalData.ts`) lê `appointments` e projeta só `{appointmentId, patientId, patientName, date, durationMin}`.
- Pedido: mover para o core como seletor oficial (no backend: view com RLS).

### 2.6 Vigência da alteração de disponibilidade
- `decideRequest` aplica a disponibilidade aprovada à grade imediatamente; o campo `date` ("válido a partir de") não é respeitado porque a grade não tem vigência.
- Pedido: `workingHours` com vigência, ou o core aplicar a mudança na data.

### 2.7 `scripts/check-boundaries.mjs` — falso positivo com pastas novas
- `git status --porcelain` agrupa diretórios não rastreados (ex.: `tests/modules/`), que não casam com `tests/modules/portal/**`.
- Pedido: usar `git status --porcelain -uall`. Contorno: rodar o check com os arquivos em stage ou já commitados.

## 3. Dependências com outros agentes
- 02 Agenda: bloqueios aprovados já valem por `appointmentService.findConflicts`; pendentes não bloqueiam. Ver 2.1.
- 05 Atendimentos: o Portal usa `checkInAt` do atendimento para mostrar "paciente na recepção".
- 08 Configurações: aprovação de bloqueios também está no perfil do profissional (mesmo serviço `decideBlockRequest`, mesma regra de aprovador).
- Financeiro não tem a rota `/profissionais` em `NAV_BY_ROLE`. Se precisar consultar dados do profissional para repasses, é preciso liberar a rota (somente leitura; a tela já esconde as ações por `useCan`).

## 4. Segurança (lembrete)
O login de perfil é só demonstração. As checagens de `useCan` e dos serviços espelham o 403 do servidor; o backend real deve derivar `role` e `professional_id` do token e aplicar RLS.

## Resposta do Integrador (Agente 09) — 20/10/2026
- 2.1–2.6 (status do profissional, vários serviços, intervalo por dia, contato/preferências, histórico restrito no core, vigência): **adiados** — soluções locais em uso; exigem mudança de modelo.
- 2.7 check-boundaries: **atendido**.
- Transições de atendimento chamadas pelo Portal agora são validadas no core (consulta pendente, no dia, um em andamento por profissional).
- Card de profissional: botões e barra de filtros corrigidos para não estourar a largura (desktop e tablet).
