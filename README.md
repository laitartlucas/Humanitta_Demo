# Humanittá Gestão — Plataforma de Saúde Integral · Design System (Etapa 1)

Design completo e base de componentes do sistema de gestão da **Humanittá Saúde Integral** (Ronda Alta/RS).
É uma demonstração comercial: todos os pacientes, valores, conversas e métricas são **fictícios**.

## Rodar
```bash
npm install
npm run dev        # demonstração navegável (login: escolha o perfil de demonstração e preencha qualquer senha)
npm run typecheck  # TypeScript strict
npm run build
```
Stack: React 18 · TypeScript (strict) · Tailwind CSS 3.4 · lucide-react · Vite. Alias `@ds/*` → `design_system/*`.

## Estrutura
- `design_system/foundations` — tokens (TS, CSS, JSON), estilos globais, artboard de fundamentos
- `design_system/components` — componentes reutilizáveis + artboards de componentes, estados e modais
- `design_system/layouts` — AppShell, Sidebar retrátil, Header, navegação móvel + artboard responsivo
- `design_system/access` — perfis (Administrador, Recepcionista, Profissional, Financeiro) e matriz de permissões de interface
- `design_system/screens/professional-portal` — Portal do Profissional (Meu Dashboard, Minha Agenda, Meus Pacientes, Meus Atendimentos, Meu Perfil)
- `design_system/screens/*` — 11 módulos administrativos (login, dashboard, agenda, patients, professionals, attendances, finance, messaging, ai-assistant, reports, settings), cada um com tela, componentes, modais e artboard de design
- `design_system/mocks` — tipos de domínio e dados fictícios
- `design_system/assets` — símbolo e logotipos (aproximação vetorial; substituir pelos arquivos oficiais)
- `design_system/documentation` — **DESIGN_SYSTEM.md · COMPONENTS.md · SCREENS.md · RESPONSIVE_GUIDE.md · DESIGN_HANDOFF.md · PERMISSIONS.md**

> Ocultar menus por perfil não é segurança: o controle de acesso efetivo deve ser implementado no servidor (ver `PERMISSIONS.md`).

Para dividir o trabalho entre os agentes de desenvolvimento, comece pelo `DESIGN_HANDOFF.md`.

Desenvolvido por Laitart Tech.
