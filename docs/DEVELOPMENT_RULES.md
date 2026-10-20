# Humanittá Gestão — Regras de Desenvolvimento

Valem para todos os agentes. O que não estiver aqui segue `design_system/documentation/DESIGN_HANDOFF.md §3–4`.

## 1. Fronteiras

1. Edite só a sua área (`agents.config.json`). `npm run check:boundaries` precisa passar.
2. Arquivos compartilhados (`package.json`, `src/App.tsx`, `src/app/**`, `src/core/**`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `design_system/{foundations,components,layouts,access,mocks}/**`) só via change request ao Integrador.
3. Precisa de um componente que não existe? Crie-o **local** em `design_system/screens/<m>/components/` usando tokens/componentes do DS e proponha a promoção depois.
4. Não copie código de outro módulo; se for comum, peça para virar seletor/serviço do core.

## 2. Dados e estado

1. **Um só armazenamento**: leia com hooks de `@core`, escreva com serviços via `useAction`. Proibido: `localStorage`/`sessionStorage` próprios, stores/contexts que dupliquem entidades, arrays de mock como fonte de verdade.
2. Estado de interface (aba ativa, filtro, modal aberto, rascunho de formulário) pode e deve ser local.
3. Nunca gere IDs à mão; o serviço gera (`newId`). Relacione por ID, nunca por nome.
4. Datas de "hoje/agora" vêm de `now()`/`todayKey()` (`@core`), nunca de `new Date()` solto.
5. Valores monetários: `formatCurrency`. Preço `null` = "R$ [definir]"; nunca invente preço oficial.

## 3. TypeScript

- `strict`, sem `any`, sem `@ts-ignore`, sem `default export`.
- Tipos de domínio vêm de `@core` (ou `@ds/mocks/types`). Não redeclare `Patient`, `Appointment` etc.
- Props de tela documentadas com JSDoc curto em pt-BR, como nas telas existentes.

## 4. Visual (preservação do design)

- Somente tokens (`bg-ivory`, `text-graphite-900`, `bg-gold-600`…) e componentes de `@ds/components`. Nada de `bg-[#…]`, `style={{ color }}`, outras fontes, sombras ou raios.
- Compare lado a lado com o `design/*.dc.html` do módulo. Nenhuma tela, componente ou funcionalidade visual pode ser removida.
- Um `variant="primary"` por área; `<button>` para ações; ícones só Lucide; `aria-label` em botões só de ícone.
- Responsivo 390 / 768 / 1024 / 1280 / 1440 sem rolagem horizontal (`RESPONSIVE_GUIDE.md`).

## 5. Estados e erros

- Toda tela: carregando (`Skeleton`), vazio (`EmptyState`), erro (toast + inline), sucesso (toast).
- Erros de serviço chegam como `AppError`. Use `error.message` (pt-BR) no toast e `error.fields` nos campos.
- Não engula erros com `catch {}` silencioso; não use `alert()`.

## 6. Segurança

> A demonstração **não tem** autenticação nem autorização de produção.

- O seletor de perfil/profissional do login é só para a apresentação. Não o descreva nem o use como login real.
- `useCan` e a ocultação de menus são conveniência de interface. Os serviços do core **espelham** o 403 do servidor; o backend real terá de revalidar tudo a partir da sessão autenticada (role e `professional_id` do token, nunca do cliente).
- Portal do Profissional: nunca exibir preço, saldo, CPF, e-mail, endereço completo ou financeiro da clínica. `professionalId` vem da sessão, nunca da URL.
- Prontuário: só `useClinicalRecords()` (já filtrado ao profissional responsável). Nenhum outro perfil vê conteúdo clínico.
- Não coloque dado pessoal em query string. Não registre dado pessoal em `console.log`.
- `localStorage` guarda os dados fictícios em texto puro: **nunca** use dados reais de pacientes nesta base.

## 7. Testes

- Testes de módulo em `tests/modules/<m>/*.test.ts` (vitest). Use `resetDemoData()` no `beforeEach` e contextos de `db.getState().users` (ver `tests/core.contract.test.ts`).
- Cubra ao menos: um caminho feliz e uma negação de permissão do seu fluxo principal.
- `npm run verify` antes de qualquer pedido de integração. **Não declare teste executado que não foi executado.**

## 8. Git

- Branch `agent/<id>-<slug>`; commits pequenos: `feat(agenda): reagendamento com detecção de conflito`.
- Rebase/merge de `main` com frequência. Nunca force-push em `main`. Nunca faça commit de `node_modules` ou `dist`.
- Line endings LF (`.gitattributes`).

## 9. Copy

- pt-BR, tom acolhedor e direto; sem jargão técnico para a recepção.
- Dados fictícios marcados como demonstração enquanto não houver backend.
