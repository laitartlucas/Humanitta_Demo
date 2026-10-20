# Humanittá Gestão — Design Handoff para desenvolvimento multiagente

Este documento é o **contrato** entre o design (Etapa 1) e os oito agentes de desenvolvimento que vão trabalhar em paralelo.
Regra principal: **ninguém altera a identidade visual.** Tokens, componentes e layouts são compartilhados e só mudam via pull request do agente responsável pelo Design System (A1), com revisão.

---

## 1. O que está pronto

```
humanitta-design-system/
├── package.json · tsconfig.json · vite.config.ts · tailwind.config.ts · postcss.config.js · index.html
├── src/                      ← app de pré-visualização (roteador em memória)
└── design_system/
    ├── foundations/          ← tokens.ts · tokens.css · tokens.json · global.css · cn.ts · design/Main.dc.html
    ├── components/           ← 40+ componentes React + index.ts · design/Componentes.dc.html, Modais.dc.html
    ├── layouts/              ← AppShell, Sidebar, Header, MobileNav, AuthLayout, nav.ts (menus por perfil) · design/Responsivo.dc.html
    ├── access/               ← permissions.ts (perfis, matriz, canAccess) · design/Perfis.dc.html
    ├── screens/
    │   ├── login/ dashboard/ agenda/ patients/ professionals/ attendances/
    │   ├── finance/ messaging/ ai-assistant/ reports/ settings/
    │   │   └── <Tela>Screen.tsx · components/ · modals/ · sections/ · design/*.dc.html · index.ts
    │   └── professional-portal/  ← Portal do Profissional
    │       ├── dashboard/ calendar/ patients/ attendances/ profile/   (tela + design/ + modals/ + index.ts)
    │       ├── shared/       ← AccessDenied, ScopeBadge, BlockRequestList, RequestChangeButton, DayTimeline…
    │       └── design/PortalResponsivo.dc.html
    ├── mocks/                ← types.ts (domínio) · clinical.ts · business.ts · portal.ts (seletores de escopo) — dados fictícios
    ├── assets/               ← humanitta-symbol.svg · humanitta-logo-light.svg · humanitta-logo-dark.svg
    └── documentation/        ← DESIGN_SYSTEM · COMPONENTS · SCREENS · RESPONSIVE_GUIDE · DESIGN_HANDOFF · PERMISSIONS · canvas.json
```

- `npm install && npm run dev` abre a demonstração navegável. No login, escolha o **Perfil de demonstração** (Administrador, Recepcionista, Profissional ou Financeiro) e preencha qualquer senha.
- `npm run typecheck` deve passar sem erros. É o portão mínimo de todo PR.
- O canvas publicado no claude.ai ("Humanittá Gestão — Design System") traz os mesmos artboards em tamanho real.
  Os arquivos `design/*.dc.html` são cópias deles e **só abrem no editor Design** (dependem do runtime `support.js`).

---

## 2. Divisão sugerida entre os 8 agentes

> **Substituída na Etapa 2.** A divisão vigente, as pastas permitidas e o procedimento de integração estão em
> [`docs/AGENT_CONTRACT.md`](../../docs/AGENT_CONTRACT.md) e em `agents.config.json`. A tabela abaixo fica como histórico do design.

| Agente | Escopo (pastas que pode editar) | Depende de |
|---|---|---|
| **A1 · Design System & Shell** | `foundations/`, `components/`, `layouts/`, `assets/`, `tailwind.config.ts`, convenções do cliente de API (`services/http`) | — (dono dos tokens) |
| **A2 · Autenticação, perfis & Configurações** | `screens/login/`, `access/`, `screens/settings/`, guarda de rotas e sessão em `src/`, **autorização no servidor** (middleware de perfil, políticas/RLS, auditoria) | A1 |
| **A3 · Agenda** | `screens/agenda/` | A1, A2, A4, A5 |
| **A4 · Pacientes** | `screens/patients/` | A1, A2 |
| **A5 · Profissionais & Atendimentos** | `screens/professionals/`, `screens/attendances/` | A1, A2, A3 |
| **A6 · Dashboard, Financeiro & Relatórios** | `screens/dashboard/`, `screens/finance/`, `screens/reports/` | A1, A2 |
| **A7 · WhatsApp & Assistente IA** | `screens/messaging/`, `screens/ai-assistant/` | A1, A2, A3 |
| **A8 · Portal do Profissional** | `screens/professional-portal/`, `mocks/portal.ts` → serviços com escopo por `professional_id` | A1, A2, A3, A5 |

Cada agente é dono dos **serviços de dados do próprio módulo** (`services/<módulo>`), mantendo a forma dos tipos de `mocks/types.ts`.

Regras de convivência:
1. Cada agente edita **só as próprias pastas**. Precisa de algo novo em `components/`? Peça ao A1 (issue/PR) ou crie primeiro um componente **local** em `screens/<módulo>/components/` e proponha a promoção depois.
2. `mocks/types.ts` é o modelo de domínio compartilhado. Para estender, **acrescente** campos opcionais, nunca renomeie nem remova. Mudanças passam por revisão do A1 e do A2.
3. Os dados fictícios (`mocks/*.ts`) vão ser substituídos por uma camada `services/` (cada agente no seu módulo; convenções do A1) com a **mesma forma** dos tipos. As telas não podem importar `mocks/` diretamente depois da Etapa 2: use os hooks/serviços.
4. Toda tela continua exportando `XxxScreen` sem `AppShell`. O shell é responsabilidade do roteador (`src/`), que passa `role` e `user` ao `AppShell`.
5. **Permissões**: a matriz em `access/permissions.ts` e `documentation/PERMISSIONS.md` é a fonte única. Nenhum agente decide permissões por conta própria. Mudanças passam pelo A2.

---

## 2.1 Perfis, Portal do Profissional e controle de acesso

- **Um login, quatro interfaces.** O `AppShell` recebe `role` (`admin` | `recepcao` | `profissional` | `financeiro`) e monta sidebar, bottom-nav e header a partir de `NAV_BY_ROLE` / `MOBILE_NAV_BY_ROLE`. A tela inicial vem de `HOME_BY_ROLE`.
- **Portal do Profissional** (`role="profissional"`): sidebar simplificada (Meu Dashboard, Minha Agenda, Meus Pacientes, Meus Atendimentos, Meu Perfil) com a pílula "Portal do Profissional". Nenhum módulo administrativo aparece.
- **Mesma identidade visual**: o portal usa os mesmos tokens e componentes. É proibido criar um "tema" separado para o portal.
- **Escopo visível**: listas do portal exibem `ScopeBadge` ("Somente seus registros"). Telas que mostram dados mínimos explicam o motivo com `ScopeInfoCard`.
- **Ações sujeitas a aprovação** (bloqueio de horário, alteração de disponibilidade) usam `RequestChangeButton` + `RequestBlockModal` + `BlockRequestList`, com os estados enviada (warning), aprovada (success) e recusada com motivo (danger). Com a permissão desativada, o botão fica desabilitado e o tooltip explica o motivo.
- **403**: rota fora do perfil renderiza `AccessDenied`. O servidor precisa responder 403 do mesmo jeito.
- **Segurança de verdade é do servidor.** `canAccess()` e a ocultação de menus servem só para a interface. Toda API valida perfil e vínculo (`professional_id`), o prontuário tem política e auditoria próprias, e o escopo é aplicado **na consulta**. Detalhes e checklist em `PERMISSIONS.md` §5.

---

## 3. Como usar sem quebrar a identidade

### Importações
```tsx
import { Button, Card, KpiCard, DataTable, Modal, useToast, StatusBadge } from '@ds/components';
import { AppShell, type RouteId } from '@ds/layouts';
import { tokens, SPECIALTY_COLORS } from '@ds/foundations';
import type { Appointment, Patient } from '@ds/mocks/types';
```

### Use sempre
- **Classes de token do Tailwind**: `bg-ivory`, `text-graphite-900`, `border-graphite-200`, `bg-gold-600`, `text-success`, `rounded-md`, `shadow-sm`, `font-display`, `text-overline`…
- **Componentes da biblioteca** para botões, campos, badges, tabelas, modais, drawers, toasts, abas, filtros, gráficos e estados vazios.
- `StatusBadge` / `PaymentStatusBadge` / `SpecialtyTag` para status e especialidades. Nunca recrie esses mapeamentos de cor.
- `PageHeader` / `SectionTitle` / `Card` para montar a hierarquia de página: título Cormorant, seções Manrope 700 e cards brancos de raio 12.

### Nunca
- Valores arbitrários de cor (`bg-[#…]`, `style={{ color: '#…' }}`). Se faltar um token, peça ao A1.
- Outras fontes, sombras ou raios fora da escala.
- Gradiente de fundo, card com borda-esquerda colorida, emoji, ícone fora do Lucide.
- Mais de um botão `variant="primary"` por área. As ações secundárias usam `secondary` ou `ghost`.
- `<div onClick>`: use `<button>` ou `<a>`. Botão só de ícone sem `label`/`aria-label`.
- Exibir dado clínico fora de uma área restrita (veja Atendimentos). Prontuário só para o perfil Profissional.

### Padrões de tela (receita)
```tsx
export function ExemploScreen() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Título da seção" subtitle="Contexto curto" actions={<Button leftIcon={Plus} onClick={() => setOpen(true)}>Novo</Button>} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-4">{/* KpiCard… */}</div>
      <div className="flex flex-wrap gap-4">
        <Card className="min-w-0 flex-[2_1_560px]" title="Principal">…</Card>
        <Card className="min-w-0 flex-[1_1_320px]" title="Lateral">…</Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo item" size="md"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                 <Button onClick={() => { setOpen(false); toast({ tone: 'success', title: 'Salvo' }); }}>Salvar</Button></>}>
        …
      </Modal>
    </div>
  );
}
```

### Modais e drawers
- `Modal` (sm 440 / md 640 / lg 880): título Cormorant, footer alinhado à direita com **Cancelar (secondary) + ação (primary/danger)**. Vira bottom sheet abaixo de `md`.
- `Drawer` (480px) para pré-visualização e filtros avançados. `ConfirmDialog` para exclusões, com `tone="danger"`.
- Todo fluxo que altera dados termina com `toast()` de sucesso ou erro.
- Botões em operação assíncrona: `loading` (spinner + `aria-busy`), sem mudar a largura.

### Estados obrigatórios por tela
Carregando (`Skeleton`) · vazio (`EmptyState` com ícone + título Cormorant + CTA) · erro (toast + mensagem inline) · sucesso (toast).

---

## 4. Checklist de PR (todos os agentes)

- [ ] `npm run typecheck` sem erros. Sem `any`, sem default export.
- [ ] Nenhuma cor, fonte, raio ou sombra fora dos tokens.
- [ ] Testado em 390 / 768 / 1024 / 1280 / 1440 (ver `RESPONSIVE_GUIDE.md`), sem rolagem horizontal na página.
- [ ] Navegação completa por teclado. Foco visível dourado. Esc fecha modais.
- [ ] Contraste ≥ 4.5:1 em todo texto. Status com ícone ou ponto + texto.
- [ ] Copy em pt-BR, tom acolhedor e direto, sem jargão técnico para a recepção.
- [ ] Dados fictícios marcados como demonstração enquanto não houver backend.
- [ ] Comparado lado a lado com o artboard `design/*.dc.html` do módulo.
- [ ] Testado com os 4 perfis: menus corretos, rota proibida mostra `AccessDenied`, **e a API correspondente responde 403** para o perfil sem permissão.
- [ ] Portal: nenhuma informação financeira da clínica, CPF ou endereço completo em telas do perfil profissional.

---

## 5. Pendências que dependem da clínica

| Item | Onde aparece | Situação |
|---|---|---|
| Logo oficial em vetor | `assets/`, `Logo` | Hoje é uma aproximação vetorial |
| Fotos dos profissionais | `Avatar` / cards de Profissionais | Placeholder com iniciais |
| Lista oficial de profissionais | `mocks/clinical.ts` | Só a Dra. Lauren Bertocchi é confirmada |
| Serviços, durações e preços | Configurações › Serviços, agendamento | `[definir]` / `price: null` |
| Formas de pagamento e políticas de cancelamento | Financeiro, Assistente IA | `[a confirmar]` |
| Horário de funcionamento | Configurações › Horários, Assistente IA | Exemplo, a confirmar |
| Uso da Sala 7 | Configurações › Salas, filtros da agenda | `[a definir]` |
| CNPJ, razão social, e-mail | Configurações › Dados da clínica | Placeholders |
| Matriz de permissões por perfil | `PERMISSIONS.md`, Configurações › Permissões | Proposta padrão; validar com a clínica |
| Quem aprova bloqueios de horário | Portal › Minha Agenda, Admin | Proposto: Administrador |

## 6. Fora do escopo da Etapa 1
Backend, banco de dados, autenticação real, integração real com WhatsApp (API oficial), IA real no assistente, APIs pagas e dados reais de pacientes.
Toda interação nas telas é simulada em memória.
