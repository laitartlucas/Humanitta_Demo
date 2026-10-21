# Humanittá Gestão — Modelos de dados

Fonte de código: `src/core/domain/entities.ts` (importe de `@core`). Tipos-base da Etapa 1 continuam em `design_system/mocks/types.ts` e são estendidos — nunca duplicados.

## 1. Regras gerais

- **IDs estáveis** (string) com prefixo por entidade. Gerados por `newId(prefixo)` para registros novos.
- **Relacionamentos sempre por ID.** Campos de nome (`patientName`, `professionalName`) são **desnormalizados** para as telas; os serviços os mantêm sincronizados (`updatePatient`, `upsertProfessional`).
- **Evolução**: só acrescente campos **opcionais**. Renomear/remover exige pedido ao Integrador e incremento de `SCHEMA_VERSION`.
- Datas: `"AAAA-MM-DD"` (dia) e `"AAAA-MM-DDTHH:mm:00"` (horário local, sem fuso — mesmo formato dos mocks).
- Valores monetários em reais (`number`). `price: null` = ainda não definido pela clínica (exibir "R$ [definir]").

## 2. Entidades

| Entidade | Coleção (`Database`) | Prefixo | Tipo | Relacionamentos |
|---|---|---|---|---|
| Paciente | `patients` | `pac-` | `PatientRecord` (estende `Patient`) | — |
| Profissional | `professionals` | `prof-` | `Professional` | `roomId → rooms`, `specialty → specialties` |
| Usuário | `users` | `u-` | `UserRecord` | `professionalId → professionals` (obrigatório se `role='profissional'`) |
| Especialidade | `specialties` | código (`odontologia`…) | `SpecialtyRecord` | — |
| Serviço | `services` | `sv-` | `ServiceRecord` | `specialty` |
| Sala | `rooms` | `sala-` | `RoomRecord` | `specialty?` |
| Agendamento | `appointments` | `ag-` / `pl-` | `AppointmentRecord` | `patientId`, `professionalId`, `roomId`, `serviceId?`, `rescheduledFrom?` |
| Atendimento | `attendances` | `at-<appointmentId>` | `Attendance` | 1:1 com `appointmentId` |
| Registro clínico | `clinicalRecords` | `cr-<appointmentId>` | `ClinicalRecord` | `attendanceId`, `professionalId` (**sigiloso**) |
| Movimentação financeira | `financialEntries` | `fe-` | `FinancialEntryRecord` | `patientId?`, `professionalId?`, `appointmentId?` |
| Conversa | `conversations` | `cv-` | `ConversationRecord` | `patientId? → patients` |
| Mensagem | `messages` | `m-` | `MessageRecord` | `conversationId` |
| Solicitação de bloqueio | `blockRequests` | `req-` | `BlockRequestRecord` | `professionalId` |
| Atividade (feed) | `activity` | `ev-` | `ActivityEvent` | — |
| Configuração da IA | `aiConfig` (documento único) | — | `AiConfig` | — |
| Configuração da clínica | `clinicSettings` (documento único) | — | `ClinicSettings` | — |

### 2.1 Campos acrescentados nesta etapa

```ts
PatientRecord      = Patient & { adminNote?; alerts?: PortalAlert[]; carePlans?: Record<professionalId, string> }
AppointmentRecord  = Appointment & { serviceId?; createdAt?; updatedAt?; cancelReason?; rescheduledFrom? }
FinancialEntryRecord = FinancialEntry & { patientId?; professionalId?; appointmentId?; paidAt? }
UserRecord   { id; name; email; role: Role; title; initials; status; professionalId?; lastAccess?; isDemo }
Attendance   { id; appointmentId; patientId; professionalId; status: 'aguardando'|'em_andamento'|'finalizado'|'faltou'|'cancelado';
               checkInAt?; startedAt?; finishedAt?; note? }
ClinicalRecord { id; attendanceId; appointmentId; patientId; professionalId; summary; createdAt; updatedAt? }
ClinicSettings { info; hours; notifications; integrations; visualIdentity;
                 permissionOverrides: Partial<Record<Role, Partial<Record<Feature, AccessLevel>>>>;
                 blockApproverRole: Role }
```

### 2.2 DTOs de escopo (Portal)

Definidos em `design_system/mocks/portal.ts` e produzidos pelos seletores do core:

| DTO | Produzido por | O que **não** contém |
|---|---|---|
| `PortalAppointment` | `toPortalAppointment()` | `price` e metadados administrativos |
| `PortalPatient` | `selectMyPatients()` | saldo, e-mail, CPF, endereço, telefone completo |
| `BlockRequest` | `selectBlockRequests()` | solicitações de outros profissionais |

## 3. Diagrama de relacionamentos

```
users ──(professionalId)──► professionals ──(roomId)──► rooms
                                 │  ▲
                 (professionalId)│  │(specialty) specialties ◄── services
                                 ▼  │
patients ◄──(patientId)── appointments ──1:1──► attendances ──1:0..1──► clinicalRecords (sigiloso)
   ▲                           ▲
   │(patientId)                │(appointmentId?)
conversations ◄── messages    financialEntries ──(professionalId)──► professionals
                              blockRequests ──(professionalId)──► professionals
```

## 4. Ciclos de vida

**Agendamento**: `agendada → confirmada → em_atendimento → concluida` · desvios: `cancelada`, `faltou`, `reagendada` (o original fica `reagendada` e um novo é criado com `rescheduledFrom`).

**Atendimento**: `aguardando → (check-in) → em_andamento → finalizado` · ou `faltou`. Só o profissional responsável inicia/finaliza; um atendimento em andamento por profissional.

**Solicitação de bloqueio**: `enviada → aprovada | recusada (com motivo)`. Só aprovadas bloqueiam a agenda (`findConflicts`).

**Lançamento financeiro**: `pendente → pago` (com `paidAt`, `method`) · `atrasado` · `estornado`. Pagamento de receita abate `patient.balance`.

## 5. Dados fictícios (semente)

`src/core/data/seed.ts` → `createSeed()` monta o banco a partir de `design_system/mocks/*`:

- 12 pacientes, 8 profissionais, 11 usuários (3 administrativos + 8 profissionais), 8 especialidades, 10 serviços, 7 salas;
- **Semente v3 (`SCHEMA_VERSION = 3`, Agente 09):** 419 agendamentos — os da Etapa 1 (12–24/10/2026), as consultas extras da Dra. Lauren e um **histórico determinístico** de 01/09 a 17/10/2026 (`src/core/data/history.ts`, sem conflitos de horário);
- 345 atendimentos e 320 prontuários demonstrativos derivados das consultas;
- 365 lançamentos: os 30 da Etapa 1, uma receita paga por consulta concluída do histórico (com `appointmentId`), despesas de set/26 detalhadas no calendário de outubro e fechamentos consolidados nov/25–ago/26 (`monthlyCashFlow`);
- 9 conversas com 25 mensagens, 4 solicitações de bloqueio, 6 eventos de atividade, configuração da IA e da clínica;
- `createSeed({ history: false })` devolve só a semente base (64 agendamentos, 30 lançamentos), usada em testes de regra exata.

Usuários de demonstração:

| ID | Nome | Perfil | professionalId |
|---|---|---|---|
| `u-admin` | Camila S. | admin | — |
| `u-recepcao` | Juliana P. | recepcao | — |
| `u-financeiro` | Marcelo T. | financeiro | — |
| `u-prof-lauren` | Dra. Lauren Bertocchi | profissional | `prof-lauren` |
| `u-prof-helena` … `u-prof-ana` | demais profissionais | profissional | `prof-helena` … `prof-ana` |

Somente a Dra. Lauren Bertocchi é profissional real (informação pública). Todo o resto é fictício.

## 6. Decisões de consistência (divergências dos mocks da Etapa 1)

| Divergência encontrada | Decisão na semente |
|---|---|
| "Agora" diferente: clínica 09:10 × portal 10:24 | Relógio único `DEMO_NOW = 19/10/2026 10:24` (`core/clock.ts`); `ag-103` passa a `concluida` |
| Consultas extras da Dra. Lauren existiam só no portal (sem preço) | Entram na agenda geral com preço demonstrativo por serviço |
| Conversas com `patientId: 'p-01'` e telefones diferentes do cadastro | Ligadas por nome a `pac-xx`; telefone alinhado ao cadastro |
| Lançamentos financeiros ligados só por nome | `patientId`/`professionalId` resolvidos por nome |
| `appUsers` (Configurações) com papéis `administrador`… e nomes diferentes do shell | `users` usa `Role` de `@ds/access` e os nomes do shell; Dra. Lauren é **profissional** |
| `permissionMatrix` (Configurações) × `PERMISSIONS` (@ds/access) | `PERMISSIONS` é a fonte única; ajustes vão para `permissionOverrides` |
| Tratamento em curso (`TREATMENT`) aplicado a qualquer profissional | `carePlans[professionalId]` — por profissional |

As telas ainda leem `design_system/mocks/*` diretamente; ao migrarem para `@core`, essas divergências desaparecem. Ver o plano de migração no [AGENT_CONTRACT.md §6](AGENT_CONTRACT.md#6-responsabilidades-por-agente).
