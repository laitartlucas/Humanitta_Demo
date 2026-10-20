# Humanittá Gestão — Arquitetura (Etapa 2 · base multiagente)

> Público: os 8 agentes de desenvolvimento e o Integrador (Agente 0).
> Leia junto com [AGENT_CONTRACT.md](AGENT_CONTRACT.md), [DATA_MODELS.md](DATA_MODELS.md), [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) e [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md).

## 1. Princípios

1. **O design é a fonte da verdade visual.** Telas, componentes, tokens e layouts da Etapa 1 foram preservados sem alteração visual. Nada foi recriado.
2. **Um único armazenamento.** Todos os módulos leem e escrevem no mesmo `Database` (`src/core`). Nenhum módulo cria store, `localStorage` ou cópia própria de entidades.
3. **Leitura por seletores, escrita por serviços.** Telas nunca escrevem no store diretamente.
4. **Permissões espelham o servidor.** Serviços e seletores aplicam a matriz de `@ds/access` (403 / escopo `proprio`) para que o comportamento da demo seja o mesmo do produto. **Não é segurança**: a autorização real será do backend.
5. **Fronteiras de pasta = fronteiras de agente.** Cada agente edita só as próprias pastas (`agents.config.json`). Arquivos compartilhados são do Integrador.

## 2. Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| UI | React 18.3 · TypeScript 5.5 (strict) · Tailwind 3.4 · lucide-react | Inalterado da Etapa 1 |
| Build | Vite 5.4 | Aliases `@ds`, `@core`, `@app`, `@modules` |
| Roteamento | **react-router-dom 6.26.2** (data router) | Única dependência de runtime adicionada |
| Estado | Store próprio (`useSyncExternalStore`) | Sem dependência; ~40 linhas |
| Persistência | `localStorage` (demonstrativo) | Chave `humanitta:demo:db` versionada |
| Testes | **vitest 2.1.9** (dev) | Testes de contrato do core |

## 3. Visão em camadas

```
┌──────────────────────────────────────────────────────────────────────────┐
│ src/main.tsx → src/App.tsx (ToastProvider + RouterProvider)    [Agente 0] │
├──────────────────────────────────────────────────────────────────────────┤
│ src/app/          router · ProtectedLayout (AppShell + guarda) · LoginPage │
│                   routes.ts (AppRoute ↔ URL) · moduleRegistry   [Agente 0] │
├──────────────────────────────────────────────────────────────────────────┤
│ src/modules/<m>/  routes.tsx + containers (páginas)        [Agentes 1–8]  │
│                   ligam a URL e os hooks do core às telas do DS           │
├──────────────────────────────────────────────────────────────────────────┤
│ design_system/screens/<m>/  telas, componentes locais, modais [1–8]       │
│ design_system/{components,layouts,foundations,access}         [Agente 0]  │
├──────────────────────────────────────────────────────────────────────────┤
│ src/core/   hooks → selectors (leitura) / services (escrita + 403)        │
│             → repositories → store (db) → persistence (localStorage)      │
│             session (perfil demo) · access (matriz + LGPD) · errors · clock│
│             data/seed.ts (monta o banco a partir de design_system/mocks)  │
│                                                               [Agente 0]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de leitura
`Tela → hook (useAppointments, useMyPatients…) → useQuery → seletor puro (state, ctx) → db`

O seletor aplica o escopo do perfil: profissional recebe só os próprios registros; quem não tem permissão recebe lista vazia.

### Fluxo de escrita
`Tela → useAction(service) → service(ctx, …) → assertCan / validação / conflito → repository → db → persistência`

Erros são `AppError` (`FORBIDDEN`, `VALIDATION`, `CONFLICT`, `NOT_FOUND`…) com mensagem pronta em pt-BR. `useAction` transforma o erro em `toast` e expõe `error.fields` para mensagens inline.

## 4. Estrutura de pastas

```
humanitta-design-system/
├── agents.config.json          ← propriedade de arquivos por agente (fonte única)
├── docs/                       ← esta documentação + change-requests/
├── scripts/
│   ├── check-boundaries.mjs    ← falha se o branch tocar arquivo de outro agente
│   └── setup-worktrees.mjs     ← cria 1 git worktree por agente
├── tests/
│   ├── core.contract.test.ts   ← contrato do core (Integrador)
│   └── modules/<m>/            ← testes de cada agente
├── src/
│   ├── main.tsx · App.tsx
│   ├── app/                    ← roteador, shell autenticado, login, mapa de rotas
│   ├── core/
│   │   ├── domain/             ← entidades e tipo Database
│   │   ├── data/seed.ts        ← semente coerente (IDs estáveis)
│   │   ├── store/              ← createStore, useStoreSelector, database, persistence
│   │   ├── repositories/       ← CRUD tipado por coleção
│   │   ├── access/             ← AccessContext, can, assertCan, scopeByProfessional
│   │   ├── session/            ← sessão demo (signInDemo / signOutDemo)
│   │   ├── selectors/          ← leituras compartilhadas com escopo
│   │   ├── services/           ← escrita com permissão e validação
│   │   ├── hooks/              ← useQuery, useAction, useCan e hooks por domínio
│   │   ├── errors/             ← AppError, Result, ErrorBoundary
│   │   ├── clock.ts            ← "agora" único da demo (19/10/2026 10:24)
│   │   └── index.ts            ← barrel: import { … } from '@core'
│   └── modules/
│       ├── dashboard/ agenda/ patients/ professionals/ portal/
│       └── attendances/ finance/ messaging/ ai-assistant/ reports/ settings/
│           └── routes.tsx      ← ModuleDefinition (rotas + containers)
└── design_system/              ← Etapa 1 (preservado)
```

## 5. Roteamento

URLs reais (antes era um roteador em memória). Mapa único em `src/app/routes.ts`:

| AppRoute | URL | Módulo |
|---|---|---|
| dashboard | `/dashboard` | dashboard |
| agenda | `/agenda` | agenda |
| pacientes | `/pacientes`, `/pacientes/:patientId` | patients |
| profissionais | `/profissionais`, `/profissionais/:professionalId` | professionals |
| atendimentos | `/atendimentos` | attendances |
| financeiro | `/financeiro` | finance |
| whatsapp | `/whatsapp` (full-bleed) | messaging |
| assistente | `/assistente` | ai-assistant |
| relatorios | `/relatorios` | reports |
| configuracoes | `/configuracoes` | settings |
| meu-dashboard | `/portal/dashboard` | portal |
| minha-agenda | `/portal/agenda` | portal |
| meus-pacientes | `/portal/pacientes`, `/portal/pacientes/:patientId` | portal |
| meus-atendimentos | `/portal/atendimentos`, `/portal/atendimentos/:appointmentId` | portal |
| meu-perfil | `/portal/perfil` | portal |
| — | `/login`, `/` (→ início do perfil), `*` (não encontrada) | app |

- Cada módulo exporta um `ModuleDefinition` em `src/modules/<m>/routes.tsx`. **Novas sub-rotas** do módulo (ex.: `/financeiro/repasses`) são adicionadas pelo próprio agente nesse arquivo, desde que comecem pelo prefixo do seu `AppRoute`. O roteador não precisa mudar.
- `ProtectedLayout` exige sessão, monta o `AppShell` do perfil e checa `NAV_BY_ROLE[role].includes(routeId)`. Fora do perfil → `AccessDenied` (403). Rota inexistente → "Página não encontrada".
- Cada rota roda dentro de um `ErrorBoundary` (falha de um módulo não derruba o shell).
- Navegação entre módulos: `useAppNavigate()('pacientes', 'pac-01')`. Nunca monte URL à mão.

## 6. Estado global e persistência

- `db` (`src/core/store/database.ts`) é um `Store<Database>` imutável. `setState` substitui a referência → `useSyncExternalStore` re-renderiza só quem lê a fatia alterada.
- A persistência grava o estado inteiro em `localStorage` (`humanitta:demo:db`) com debounce de 150 ms.
- **Versão de esquema**: `SCHEMA_VERSION` em `seed.ts`. Mudou o formato do `Database`? Incremente → navegadores recarregam a semente.
- **Restaurar a demonstração**: abrir qualquer URL com `?reset-demo` ou chamar `resetDemoData()`.
- Sessão demo: store separado (`humanitta:demo:session`) que guarda só `userId`.

## 7. Perfis, sessão e Portal do Profissional

- Login de **demonstração**: escolhe perfil e, no perfil Profissional, **qual profissional** (8 usuários individuais, um por profissional, cada um com `professionalId`).
- `AccessContext = { userId, role, professionalId? }` é derivado do usuário. No produto ele vem do token no servidor; **o cliente nunca informa role nem professionalId**.
- Portal: o container (`src/modules/portal`) obtém `professionalId` da sessão — nunca da URL. Trocar de profissional no login muda agenda, pacientes, atendimentos e perfil exibidos.
- Seletores com escopo (`selectAppointments`, `selectMyPatients`, `selectClinicalRecords`, `selectMyPayouts`) são a referência de como o backend deve filtrar **na consulta** (RLS).

> ⚠️ Isto **não** é autenticação nem autorização de produção. Ver [DEVELOPMENT_RULES.md §6](DEVELOPMENT_RULES.md#6-segurança).

## 8. Matriz de permissões

Fonte: `design_system/access/permissions.ts` (`PERMISSIONS`). O core calcula o nível efetivo em três camadas:

1. matriz de fábrica (`PERMISSIONS`);
2. ajustes da clínica (`clinicSettings.permissionOverrides`, editados em Configurações › Permissões via `settingsService.setPermission`);
3. **limites fixos de LGPD** (`LOCKED` em `core/access`): prontuário só do profissional responsável; profissional nunca vê financeiro geral/relatórios financeiros/financeiro do paciente.

Use `useCan(feature, min)` para mostrar/ocultar e confie nos serviços para negar (403).

## 9. Tratamento de erros

| Situação | Mecanismo |
|---|---|
| Ação negada / fora do escopo | `AppError('FORBIDDEN')` → toast "Não foi possível concluir" |
| Dados inválidos | `AppError('VALIDATION', msg, fields)` → `error.fields.<campo>` no `FormField` |
| Horário ocupado / estado inválido | `AppError('CONFLICT')` |
| Registro inexistente | `AppError('NOT_FOUND')` → tela usa `EmptyState` |
| Erro de renderização | `ErrorBoundary` por rota com "Tentar novamente" |
| `localStorage` indisponível | persistência vira no-op; app segue em memória |

## 10. Caminho para o backend (fora do escopo desta etapa)

Os repositórios são a costura: `createCollectionRepository` passará a chamar a API com a mesma assinatura; seletores com escopo viram filtros SQL/RLS; `assertCan` vira middleware de perfil; `session` vira sessão autenticada. As telas e os módulos não mudam.
