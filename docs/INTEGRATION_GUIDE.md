# Humanittá Gestão — Guia de Integração e Execução Paralela

Como preparar, executar e integrar os 8 agentes trabalhando ao mesmo tempo sobre esta base.

## 1. Pré-requisitos

- Node 20+ (testado com Node 22.17 / npm 10.9) e Git 2.40+.
- Repositório inicializado com o branch `main` contendo a base (já feito nesta entrega).

```bash
npm install
npm run verify          # typecheck + testes de contrato + build
npm run dev             # http://localhost:5173
```

## 2. Criar um worktree por agente

```bash
npm run agents:worktrees
```

Cria `../humanitta-worktrees/<id>-<slug>/`, cada um no branch do agente (`agent/01-dashboard` … `agent/08-relatorios-config`), a partir de `main`. Alternativas:

```bash
npm run agents:worktrees -- --only 02,05        # só alguns
npm run agents:worktrees -- --dir D:/humanitta-wt
```

Em cada worktree:

```bash
npm install
npm run dev -- --port 5101    # 01 → 5101, 02 → 5102, … 08 → 5108 (evita conflito de porta)
```

> Sem worktrees? Use só branches: `git switch -c agent/03-pacientes main`. Worktrees são preferíveis porque permitem 8 agentes ao mesmo tempo na mesma máquina, cada um com seu `node_modules` e servidor.

Cada worktree tem o próprio `localStorage` por porta (origem diferente), então os dados de demonstração de um agente não interferem nos de outro.

## 3. Prompt de lançamento de cada agente

Copie, troque `{{ID}}`, `{{NOME}}` e `{{PASTA}}`, e inicie o agente **dentro do worktree dele**:

```text
Você é o Agente {{ID}} — {{NOME}} da Humanittá Gestão.
Diretório de trabalho: ../humanitta-worktrees/{{PASTA}} (branch agent/{{PASTA}}).

Leia antes de tudo: docs/AGENT_CONTRACT.md, docs/ARCHITECTURE.md, docs/DATA_MODELS.md,
docs/DEVELOPMENT_RULES.md, design_system/documentation/DESIGN_SYSTEM.md, COMPONENTS.md, PERMISSIONS.md
e o artboard design/*.dc.html do seu módulo.

Sua tarefa é a linha "{{ID}}" da tabela §6 do AGENT_CONTRACT.md.
Regras inegociáveis:
- Edite SOMENTE os caminhos do agente {{ID}} em agents.config.json.
- Não altere o visual: use apenas tokens e componentes do design system.
- Leia dados com hooks de '@core' e escreva com serviços via useAction. Não crie store nem localStorage.
- Precisa de mudança compartilhada? Crie docs/change-requests/{{ID}}-<assunto>.md e siga com solução local.
- Antes de concluir: npm run verify && npm run check:boundaries. Não declare testes que não rodou.
- Teste com os 4 perfis (e, se tocar o Portal, com 2 profissionais diferentes).
Faça commits pequenos no formato "feat({{PASTA}}): …".
```

| ID | Nome | Pasta / branch |
|---|---|---|
| 01 | Dashboard | `01-dashboard` |
| 02 | Agenda | `02-agenda` |
| 03 | Pacientes | `03-pacientes` |
| 04 | Profissionais e Portal do Profissional | `04-profissionais-portal` |
| 05 | Atendimentos | `05-atendimentos` |
| 06 | Financeiro | `06-financeiro` |
| 07 | WhatsApp e Assistente IA | `07-whatsapp-ia` |
| 08 | Relatórios e Configurações | `08-relatorios-config` |

(As pastas de worktree usam `<id>-<slug>`; os branches são `agent/<id>-<slug>`.)

## 4. Padrão de migração de uma tela (exemplo)

Antes (Etapa 1, dado fixo):

```tsx
import { appointments, getAppointmentsByDate } from '@ds/mocks/clinical';
const [items, setItems] = useState(appointments);
// …cancelar: setItems(items.map(a => a.id === id ? { ...a, status: 'cancelada' } : a));
```

Depois (base compartilhada):

```tsx
import { appointmentService, todayKey, useAction, useAppointments, useCan } from '@core';

const items = useAppointments({ from: todayKey(), to: todayKey() });
const canEdit = useCan('agenda_clinica', 'editar');
const cancel = useAction(appointmentService.cancelAppointment, { success: 'Consulta cancelada' });

<Button variant="danger" loading={cancel.loading} disabled={!canEdit}
        onClick={() => cancel.run(appt.id, motivo)}>Cancelar consulta</Button>
{cancel.error?.fields?.reason && <p className="text-xs text-danger">{cancel.error.fields.reason}</p>}
```

- Leituras re-renderizam sozinhas quando qualquer módulo altera o banco (ex.: a recepção cancela → o Portal do profissional atualiza).
- Filtros/abas/modais continuam como estado local da tela.
- Componentes que hoje recebem dados por props não mudam; só a origem dos dados muda.

## 5. Pedido de mudança compartilhada (change request)

Arquivo `docs/change-requests/<id>-<assunto>.md`:

```markdown
# CR <id>-<assunto>
- Agente: 0X · Módulo
- Arquivo(s) compartilhado(s): src/core/…
- O que preciso: (ex.: campo opcional `Appointment.insurancePlan?: string`)
- Por quê / qual tela usa:
- Alternativa local enquanto aguardo:
- Impacto em outros agentes:
```

O Integrador responde no próprio arquivo (Aprovado / Recusado / Alternativa), implementa em `main` e avisa os agentes para fazer rebase.

## 6. Checklist do Integrador ao receber um branch

```bash
git fetch
git switch main && git pull
git switch agent/0X-… && git rebase main          # ou: git merge main
npm ci && npm run verify
npm run check:boundaries -- --agent 0X
npm run dev   # navegar com os 4 perfis; portal com 2 profissionais
git switch main && git merge --no-ff agent/0X-…
npm run verify
```

Rejeite o branch se: `check:boundaries` falhar; houver import de mocks para dados; existir store/`localStorage` novo; cor/fonte/sombra fora dos tokens; `any`, `default export` ou teste declarado e não executado.

## 7. Fluxo de dados entre módulos (contratos de integração)

| Evento | Quem escreve (serviço) | Quem reage (leitura) |
|---|---|---|
| Novo agendamento | Agenda / Assistente IA → `createAppointment` | Dashboard, Portal (Minha Agenda), Pacientes (ficha) |
| Cancelamento / reagendamento | Agenda / WhatsApp → `cancelAppointment` / `rescheduleAppointment` | Portal, Atendimentos, Dashboard |
| Check-in | Atendimentos → `checkIn` | Portal (paciente aguardando) |
| Início / fim de atendimento | Portal → `startAttendance` / `finishAttendance` | Atendimentos, Dashboard, Agenda |
| Solicitação de bloqueio | Portal → `requestBlock` | Configurações (aprovação), Agenda (pendente) |
| Aprovação de bloqueio | Configurações → `decideBlockRequest` | Portal, Agenda (`findConflicts`) |
| Pagamento registrado | Financeiro → `registerPayment` | Pacientes (saldo), Dashboard, Relatórios |
| Mudança de matriz | Configurações → `setPermission` | Todos (`useCan`, serviços) |

## 8. Restaurar dados

- Navegador: abra `http://localhost:5173/?reset-demo`.
- Código/teste: `resetDemoData()`.
- Mudou o formato do banco (Integrador): incremente `SCHEMA_VERSION` em `src/core/data/seed.ts`.
