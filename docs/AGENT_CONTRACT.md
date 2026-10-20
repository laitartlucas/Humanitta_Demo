# Humanittá Gestão — Contrato dos Agentes

> Contrato obrigatório entre o **Integrador (Agente 0)** e os **Agentes 1–8**.
> Em caso de conflito com qualquer outro documento, **este prevalece** — inclusive sobre a divisão sugerida em `design_system/documentation/DESIGN_HANDOFF.md §2`, que fica substituída.
> Fonte de propriedade de arquivos executável: [`agents.config.json`](../agents.config.json).

---

## 1. Estrutura de pastas e propriedade

```
src/
├── App.tsx · main.tsx                      [00]
├── app/                                    [00]  router, ProtectedLayout, LoginPage, routes.ts, navigation.ts, types.ts
├── core/                                   [00]  domain, data, store, repositories, access, session, selectors, services, hooks, errors
└── modules/
    ├── dashboard/                          [01]
    ├── agenda/                             [02]
    ├── patients/                           [03]
    ├── professionals/  portal/             [04]
    ├── attendances/                        [05]
    ├── finance/                            [06]
    ├── messaging/  ai-assistant/           [07]
    └── reports/  settings/                 [08]
design_system/
├── foundations/ components/ layouts/ assets/ access/ mocks/ documentation/   [00]
└── screens/
    ├── login/                              [00]
    ├── dashboard/                          [01]
    ├── agenda/                             [02]
    ├── patients/                           [03]
    ├── professionals/ professional-portal/ [04]
    ├── attendances/                        [05]
    ├── finance/                            [06]
    ├── messaging/ ai-assistant/            [07]
    └── reports/ settings/                  [08]
tests/
├── core.contract.test.ts                   [00]
└── modules/<módulo>/                       [dono do módulo]
docs/  scripts/  agents.config.json  package.json  tsconfig.json  vite.config.ts  tailwind.config.ts  index.html   [00]
docs/change-requests/                       [qualquer agente pode CRIAR arquivo novo]
```

### 1.1 Arquivos permitidos por agente

| Agente | Pode editar (e criar arquivos dentro) | Branch |
|---|---|---|
| **01 · Dashboard** | `design_system/screens/dashboard/**` · `src/modules/dashboard/**` · `tests/modules/dashboard/**` | `agent/01-dashboard` |
| **02 · Agenda** | `design_system/screens/agenda/**` · `src/modules/agenda/**` · `tests/modules/agenda/**` | `agent/02-agenda` |
| **03 · Pacientes** | `design_system/screens/patients/**` · `src/modules/patients/**` · `tests/modules/patients/**` | `agent/03-pacientes` |
| **04 · Profissionais & Portal** | `design_system/screens/professionals/**` · `design_system/screens/professional-portal/**` · `src/modules/professionals/**` · `src/modules/portal/**` · `tests/modules/{professionals,portal}/**` | `agent/04-profissionais-portal` |
| **05 · Atendimentos** | `design_system/screens/attendances/**` · `src/modules/attendances/**` · `tests/modules/attendances/**` | `agent/05-atendimentos` |
| **06 · Financeiro** | `design_system/screens/finance/**` · `src/modules/finance/**` · `tests/modules/finance/**` | `agent/06-financeiro` |
| **07 · WhatsApp & IA** | `design_system/screens/{messaging,ai-assistant}/**` · `src/modules/{messaging,ai-assistant}/**` · `tests/modules/{messaging,ai-assistant}/**` | `agent/07-whatsapp-ia` |
| **08 · Relatórios & Configurações** | `design_system/screens/{reports,settings}/**` · `src/modules/{reports,settings}/**` · `tests/modules/{reports,settings}/**` | `agent/08-relatorios-config` |

**Todos os demais arquivos são compartilhados e só mudam com aprovação do Integrador**, em especial: `package.json`, `package-lock.json`, `src/App.tsx`, `src/app/**`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `design_system/{foundations,components,layouts,access,mocks}/**`, `src/core/**` (estado global e tipos compartilhados).

Verificação automática: `npm run check:boundaries` (falha se o branch tocar arquivo fora da área).

---

## 2. Interfaces TypeScript (resumo)

Completo em `src/core/domain/entities.ts` e [DATA_MODELS.md](DATA_MODELS.md).

```ts
import type {
  ID, Database, PatientRecord, Professional, UserRecord, SpecialtyRecord, ServiceRecord, RoomRecord,
  AppointmentRecord, AppointmentStatus, Attendance, AttendanceStatus, ClinicalRecord,
  FinancialEntryRecord, ConversationRecord, MessageRecord, BlockRequestRecord,
  AiConfig, ClinicSettings, AccessContext, AppError, AppErrorCode,
} from '@core';
import type { PortalAppointment, PortalPatient } from '@ds/mocks/portal';   // DTOs de escopo
import type { Role, Feature, AccessLevel } from '@ds/access';
import type { AppRoute } from '@ds/layouts';
import type { ModuleDefinition, ModuleRoute } from '@app/types';

interface AccessContext { userId: ID; role: Role; professionalId?: ID }   // professionalId ⇔ role='profissional'

interface ModuleRoute { routeId: AppRoute; path: string; element: ReactNode; bleed?: boolean }
interface ModuleDefinition { id: string; owner: string; routes: ModuleRoute[] }
```

---

## 3. Serviços disponíveis (escrita)

Assinatura padrão: `fn(ctx: AccessContext, ...args)`; lançam `AppError`. Nas telas, chame via `useAction`.

| Serviço | Funções | Permissão exigida |
|---|---|---|
| `appointmentService` | `createAppointment(input)` · `updateAppointment(id, patch)` · `rescheduleAppointment(id, start, professionalId?)` · `cancelAppointment(id, reason)` · `confirmAppointment(id)` · `findConflicts(profId, start, dur, ignoreId?)` | `agenda_clinica ≥ editar` |
| `patientService` | `createPatient(input)` · `updatePatient(id, patch)` · `deletePatient(id)` (só sem histórico) | `pacientes_cadastro ≥ editar` |
| `attendanceService` | `checkIn(apptId)` · `startAttendance(apptId)` · `finishAttendance(apptId, resumo?)` · `markNoShow(apptId)` · `saveClinicalRecord(apptId, resumo)` | check-in: agenda; iniciar/finalizar/prontuário: **somente o profissional responsável** |
| `financeService` | `createEntry(input)` · `registerPayment(id, method, paidAt?)` · `deleteEntry(id)` | `financeiro ≥ editar` (`repasses` para tipo repasse) |
| `messagingService` | `sendMessage(convId, text)` · `appendAiMessage(convId, text)` · `markConversationRead(convId)` · `setConversationMode(convId, mode)` · `linkConversationToPatient(convId, patientId)` · `updateAiConfig(patch)` | `whatsapp ≥ editar` · IA: `assistente_ia ≥ editar` |
| `blockRequestService` | `requestBlock(input)` · `decideBlockRequest(id, 'aprovada'\|'recusada', motivo?)` · `withdrawBlockRequest(id)` | solicitar: profissional · decidir: `clinicSettings.blockApproverRole` (admin) |
| `settingsService` | `updateClinicSettings(patch)` · `setPermission(role, feature, level)` · `upsertService` · `updateRoom` · `updateSpecialty` · `upsertUser` · `upsertProfessional` · `updateOwnProfile` | `configuracoes` / `usuarios_permissoes` / `profissionais ≥ editar` · `perfil_proprio` |
| `logActivity(ctx, texto, tom)` | feed "Atividades recentes" | — |

Precisa de um serviço novo ou de outra regra? **Não crie armazenamento próprio.** Componha os serviços existentes em `src/modules/<m>/` ou abra um pedido (§9).

---

## 4. Hooks compartilhados (leitura e ações)

```ts
import {
  useSession, useAccessContext, useCan, useQuery, useAction, useDb,
  useAppointments, useAppointment, useDayOverview,
  usePatients, usePatient, useMyPatients,
  useProfessionals, useProfessional, useUsers, useSpecialties, useServices, useRooms,
  useAttendances, useClinicalRecords,
  useFinancialEntries, useFinanceTotals, useMyPayouts,
  useConversations, useMessages, useUnreadCount,
  useBlockRequests, useActivity, useAiConfig, useClinicSettings,
} from '@core';
import { useAppNavigate } from '@app/navigation';
```

| Hook | Retorna |
|---|---|
| `useAccessContext()` | `AccessContext` do usuário logado |
| `useCan(feature, min)` | `boolean` para mostrar/ocultar (UI) |
| `useQuery((state, ctx) => …, deps)` | leitura com escopo customizada (re-render só quando o banco muda) |
| `useAction(service, { success })` | `{ run(...args), loading, error, clearError }` com toast automático |
| `useAppointments(filtros)` | agendamentos no escopo (agenda geral ou só os próprios) |
| `useMyPatients()` | `PortalPatient[]` do profissional logado |
| `useFinanceTotals(mes?)` | totais calculados (mesma regra para Financeiro, Dashboard e Relatórios) |
| `useAppNavigate()` | `go(route: AppRoute, param?)` |

Seletores puros equivalentes (`selectAppointments`, `selectDayOverview`, `selectMyPatients`, `selectFinanceTotals`, `selectClinicalRecords`…) estão em `@core` para testes e composições.

---

## 5. Estado global, rotas e permissões

- **Estado**: único `db: Store<Database>` + `session`. Proibido: `useState` como fonte de verdade de entidades compartilhadas, `localStorage` próprio, contexts que dupliquem entidades. Estado de **interface** (aba, filtro, modal aberto) continua local na tela.
- **Rotas**: cada agente mantém `src/modules/<m>/routes.tsx` (`ModuleDefinition`). Pode acrescentar sub-rotas desde que o `path` comece pelo caminho do seu `AppRoute` (ver tabela em [ARCHITECTURE.md §5](ARCHITECTURE.md#5-roteamento)). Novo item de menu ou novo `AppRoute` = pedido ao Integrador.
- **Permissões**: `design_system/access/permissions.ts` é a matriz. Nenhum agente decide permissão por conta própria. Os limites de LGPD (prontuário, financeiro do profissional) são fixos no core.

---

## 6. Responsabilidades por agente

Comum a todos: **migrar a tela de `design_system/mocks/*` para `@core`** (hooks para ler, `useAction` + serviços para escrever), sem mudar a aparência; implementar estados carregando/vazio/erro/sucesso; manter `XxxScreen` exportado sem `AppShell`; passar callbacks de navegação pelo container em `src/modules/<m>/`.

| Agente | Entregas desta etapa | Depende de |
|---|---|---|
| **01 · Dashboard** | KPIs do dia por `useDayOverview`; feed por `useActivity`; receita só se `useCan('financeiro','ver')`; atalhos via `onNavigate`. | core |
| **02 · Agenda** | Dia/semana/mês por `useAppointments(filtros)`; novo/editar/reagendar/cancelar/confirmar via `appointmentService` com conflito (`CONFLICT`) e bloqueios aprovados; filtros por profissional/sala/especialidade; somente leitura para `financeiro` (`agenda_clinica = ver`). | core |
| **03 · Pacientes** | Lista/ficha por `usePatients`/`usePatient`; CRUD via `patientService`; agendamentos do paciente por `useAppointments({ patientId })`; saldo só com `pacientes_financeiro ≥ ver`; nada de prontuário. | core |
| **04 · Profissionais & Portal** | Cadastro de profissionais (`upsertProfessional`); **Portal**: trocar `@ds/mocks/portal` por `useAppointments`/`useMyPatients`/`useClinicalRecords`/`useBlockRequests`/`useMyPayouts`; `requestBlock`/`withdrawBlockRequest`; `startAttendance`/`finishAttendance` no Portal; remover textos fixos da Dra. Lauren (ex.: `INITIAL_FORM` em Meu Perfil, `MY_PAYOUT_SUMMARY`, tratamento global) usando a sessão. | core, 02 (regras de agenda), 05 (ciclo de atendimento) |
| **05 · Atendimentos** | Visão da clínica por `useAttendances` + `useAppointments` do dia; check-in/falta via `attendanceService`; **sem** conteúdo clínico para admin/recepção/financeiro. | core |
| **06 · Financeiro** | Lançamentos por `useFinancialEntries`; totais por `useFinanceTotals`; `createEntry`/`registerPayment`/`deleteEntry`; repasses com `professionalId`. | core |
| **07 · WhatsApp & IA** | Conversas/mensagens por `useConversations`/`useMessages`; envio, assumir/devolver para IA, vincular paciente via `messagingService`; Assistente: `useAiConfig` + `updateAiConfig`; simulação da IA só local (`appendAiMessage`); agendamento pela IA usa `appointmentService` com contexto da recepção. | core, 02 |
| **08 · Relatórios & Configurações** | Relatórios a partir dos seletores do core (sem números paralelos); Configurações: clínica, horários, serviços, salas, especialidades, usuários (com `professionalId` obrigatório para profissional), matriz via `setPermission`, aprovação de bloqueios (`decideBlockRequest`). | core |

---

## 7. Dependências

- Runtime aprovadas: `react`, `react-dom`, `react-router-dom`, `lucide-react`. Dev: `vite`, `typescript`, `tailwindcss`, `vitest`.
- **Nenhum agente adiciona dependência.** Precisa de uma? Pedido em `docs/change-requests/` com justificativa, tamanho e alternativa sem dependência. Só o Integrador altera `package.json`/`package-lock.json`.

---

## 8. Critérios de aceitação (por PR de agente)

1. `npm run verify` passa (typecheck strict + testes + build).
2. `npm run check:boundaries` passa (nenhum arquivo fora da área).
3. A tela não importa mais `@ds/mocks/clinical|business|portal` para **dados** (constantes de rótulo/formatadores, como `formatCurrency` e `SPECIALTY_NAMES`, podem continuar).
4. Leitura via hooks do core, escrita via serviços; nenhum store/`localStorage` novo.
5. Visual idêntico ao artboard `design/*.dc.html` do módulo; só tokens e componentes do DS (checklist do `DESIGN_HANDOFF.md §4`).
6. Testado com os 4 perfis e, no portal, com **pelo menos dois profissionais diferentes** (ex.: Dra. Lauren e Dra. Helena).
7. Ações negadas mostram toast/estado coerente com 403; rotas fora do perfil mostram `AccessDenied`.
8. Estados carregando/vazio/erro/sucesso presentes; toda escrita termina em toast.
9. Testes do módulo em `tests/modules/<m>/` cobrindo ao menos um caminho feliz e uma negação de permissão.
10. Copy pt-BR; dados marcados como demonstração.

---

## 9. Procedimento de integração

1. Integrador cria os branches/worktrees: `npm run agents:worktrees` (ver [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)).
2. Agente trabalha **só** no próprio worktree/branch, faz commits pequenos (`feat(agenda): …`).
3. Precisa mudar algo compartilhado? Cria `docs/change-requests/<id>-<assunto>.md` (modelo no INTEGRATION_GUIDE) **e continua** com uma solução local no próprio módulo até a resposta.
4. Antes de pedir integração: `git fetch && git rebase main` (ou merge de `main`), `npm run verify`, `npm run check:boundaries`.
5. Integrador revisa e mescla em `main` com `--no-ff`, rodando `npm run verify` após cada merge. Ordem recomendada: 02 → 05 → 03 → 01 → 06 → 07 → 08 → 04 (Portal por último, pois reaproveita as regras de agenda e de atendimento já integradas). Como as áreas não se sobrepõem, a ordem só afeta a revisão, não gera conflito de arquivo.
6. Mudanças do core aprovadas são feitas pelo Integrador em `main`; os agentes fazem rebase.
