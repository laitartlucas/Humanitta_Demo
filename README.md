# Humanittá Gestão — Plataforma de Saúde Integral · Base multiagente (Etapa 2)

Design completo **e** base técnica compartilhada do sistema de gestão da **Humanittá Saúde Integral** (Ronda Alta/RS),
pronta para o desenvolvimento paralelo de oito agentes.
É uma demonstração comercial: todos os pacientes, valores, conversas e métricas são **fictícios**.

## Rodar
```bash
npm install
npm run dev        # http://localhost:5173 — login: escolha o perfil (e o profissional) de demonstração, qualquer senha
npm run verify     # typecheck strict + testes de contrato + build
npm test           # unitários, contrato e integração (vitest)
npm run test:e2e   # E2E Playwright no build servido como GitHub Pages
npm run pages:serve  # serve dist/ em http://localhost:4180/humanitta-gestao/ (como no Pages)
npm run typecheck
npm run build
```
Stack: React 18 · TypeScript (strict) · Tailwind CSS 3.4 · lucide-react · Vite · react-router-dom 6 (hash) · vitest · Playwright.
Aliases: `@ds/*` → `design_system/*` · `@core` → `src/core` · `@app/*` → `src/app/*` · `@modules/*` → `src/modules/*`.

Restaurar os dados de demonstração: abra qualquer URL com `?reset-demo`.

## Documentação técnica (comece aqui)
| Documento | Conteúdo |
|---|---|
| [docs/AGENT_CONTRACT.md](docs/AGENT_CONTRACT.md) | Pastas por agente, interfaces, serviços, hooks, rotas, permissões, critérios de aceitação, integração |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Camadas, roteamento, estado global, persistência, sessão demo, erros |
| [docs/DATA_MODELS.md](docs/DATA_MODELS.md) | Entidades, IDs, relacionamentos, ciclos de vida, semente e decisões de consistência |
| [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) | Worktrees, prompt de cada agente, migração de telas, change requests, checklist do integrador |
| [docs/DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) | Regras de código, visual, dados, segurança, testes e Git |
| [docs/agents/AGENT_09.md](docs/agents/AGENT_09.md) | **Relatório da integração das 8 branches, QA e deploy** |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Publicação no GitHub Pages |
| [docs/SECURITY.md](docs/SECURITY.md) | Limites de segurança da demo e `npm audit` |

Propriedade de arquivos executável: [`agents.config.json`](agents.config.json) · `npm run check:boundaries` · `npm run agents:worktrees`.

## Estrutura
- `src/app` — roteador (hash, compatível com GitHub Pages), shell autenticado com guarda de rota, login de demonstração
- `src/core` — modelo de dados único, store + persistência local, repositórios, serviços tipados, seletores, hooks, permissões, erros
- `src/modules/<módulo>` — rotas e containers de cada agente (ligam URL e dados às telas do design system)
- `design_system/foundations` — tokens (TS, CSS, JSON), estilos globais
- `design_system/components` — componentes reutilizáveis + artboards
- `design_system/layouts` — AppShell, Sidebar, Header, navegação móvel
- `design_system/access` — perfis (Administrador, Recepcionista, Profissional, Financeiro) e matriz de permissões
- `design_system/screens/*` — telas dos módulos administrativos e do Portal do Profissional (preservadas da Etapa 1)
- `design_system/mocks` — tipos de domínio e dados fictícios de origem (a semente do core é montada a partir deles)
- `design_system/documentation` — DESIGN_SYSTEM · COMPONENTS · SCREENS · RESPONSIVE_GUIDE · DESIGN_HANDOFF · PERMISSIONS
- `tests` — testes de contrato do core e testes dos módulos

> **Segurança:** o seletor de perfil do login e a ocultação de menus são apenas demonstração. Não há autenticação real;
> o controle de acesso efetivo deve ser implementado no servidor (ver `docs/DEVELOPMENT_RULES.md §6` e `PERMISSIONS.md`).

Desenvolvido por Laitart Tech.
