# Humanittá Gestão — Guia de Responsividade

A prioridade é o **desktop**, onde acontece a administração da clínica no dia a dia. As outras larguras precisam continuar completas e utilizáveis.
Referência visual: `layouts/design/Responsivo.dc.html` (tablet 834, notebook 1024, smartphone 390).

## Faixas

| Dispositivo | Largura | Tailwind | Sidebar | Padding | Colunas |
|---|---|---|---|---|---|
| Smartphone | < 768 | base / `sm` | Oculta. Bottom-nav (Dashboard, Agenda, Pacientes, WhatsApp, Menu) + drawer | 16px | 4 |
| Tablet | 768–1023 | `md` | Drawer pelo botão de menu no header | 24px | 8 |
| Notebook | 1024–1279 | `lg` | Fixa e recolhível (76px, ícones com tooltip); a preferência fica salva no navegador | 24px | 12 |
| Desktop (alvo) | 1280–1535 | `xl` | Expandida (264px) | 32px | 12 |
| Desktop amplo | ≥ 1536 | `2xl` | Expandida | 32–40px, conteúdo máx. 1440px | 12 |

O `AppShell` cuida disso sozinho. As telas só ajustam o próprio conteúdo.

## Regras por componente

> A tabela abaixo é a **especificação** para os agentes de desenvolvimento.
> O pacote de referência já implementa o shell (sidebar, drawer, bottom-nav), modais como bottom sheet, drawers, toasts, tabelas com rolagem e colunas ocultáveis, WhatsApp em etapas no celular e Configurações com select.
> Os demais itens (como cards de lista no celular e a visão Dia padrão na agenda móvel) devem ser concluídos pelo agente de cada módulo, conforme o artboard `Responsivo.dc.html`.

| Componente | Desktop | Tablet | Smartphone |
|---|---|---|---|
| **Header** | Título, busca de 360px, selo demo, data, sino, usuário | Busca encolhe; data some | Menu + título + sino + avatar; busca vira ícone; selo "Demo" curto |
| **KPIs** | 4–5 por linha (`auto-fit minmax(210px)`) | 2–3 | 1 por linha (ou carrossel horizontal) |
| **Layouts 2:1** | `flex-wrap` com `flex: 2 1 560px` / `1 1 320px` | Empilha quando falta espaço | Empilhado |
| **Tabelas** (`DataTable`) | Tabela completa | Colunas com `hideBelow="lg"` saem | Rolagem horizontal dentro do próprio contêiner, com colunas secundárias ocultas (`hideBelow="md"`). Listas longas de uso móvel (pacientes, agenda do dia) devem ter versão em cards, como no artboard Responsivo |
| **Agenda** | Semana com 6 colunas e barra lateral de 300px | Semana com rolagem horizontal; barra lateral vai para baixo | **Dia** por padrão, seletor de dias horizontal, lista de cards por horário, botão "+" fixo |
| **Calendário mensal** | Até 3 consultas por dia + "mais" | Até 2 | Só pontos de ocupação; tocar abre o dia |
| **Formulários** | 2 colunas (`grid sm:grid-cols-2`) | 2 colunas | 1 coluna; botões do footer com largura total |
| **Modais** | Centralizados: sm 440 / md 640 / lg 880 | Iguais, com margem de 24px | **Bottom sheet** de largura total, header fixo e corpo rolável |
| **Drawers** | 480px à direita | 480px | Tela cheia |
| **WhatsApp** | 3 colunas (340 / flex / 320) | 2 colunas; painel do paciente vira drawer | Etapas: lista → conversa → painel |
| **Assistente IA** | Config + prévia lado a lado | Prévia abaixo | Abas roláveis; prévia recolhível |
| **Configurações** | Navegação vertical de 240px | Select no topo | Select no topo |
| **Gráficos** | Largura total do card | Igual | Legenda abaixo; barras com rolagem horizontal quando passam de 6 categorias |
| **Abas** (`Tabs`) | Linha completa | Rolagem horizontal | Rolagem horizontal, sem quebra |
| **Toasts** | Canto inferior direito (380px) | Igual | Largura total, logo acima da bottom-nav |

## Portal do Profissional
O portal é usado no consultório. Por isso o **tablet é cidadão de primeira classe**. Referência: `screens/professional-portal/design/PortalResponsivo.dc.html`.

| Elemento | Desktop | Tablet | Smartphone |
|---|---|---|---|
| Sidebar | 5 itens + pílula "Portal do Profissional" | Recolhida (76px) em paisagem; drawer em retrato | Bottom-nav: Início · Agenda · Pacientes · Atendimentos · Perfil (o 5º slot é o Menu, que abre o drawer com Meu Perfil) |
| Meu Dashboard | Próximo atendimento + KPIs + agenda do dia + calendário em 2 colunas | Próximo atendimento no topo; KPIs 2×2 | Card de próximo atendimento com Iniciar; KPIs 2×2; lista do dia |
| Minha Agenda | Dia/Semana/Mês + painel de solicitações | Dia com detalhes lado a lado (paisagem) | Visão Dia, seletor de dias horizontal, detalhes em tela cheia |
| Atendimento em andamento | Registro clínico + checklist lado a lado | Painel do atendimento à direita da lista (paisagem) | Tela de foco: cronômetro, checklist, campos e botão "Finalizar" fixo no rodapé |
| Modais (bloqueio, finalizar) | Centralizados (md) | Centralizados | Bottom sheet |

## Alvos e legibilidade
- Alvos de toque: **≥ 40px** no desktop e **≥ 44px** em `< md` (bottom-nav, chips, linhas de lista).
- Texto mínimo de 12px (caption). Corpo de 14px em todas as larguras.
- Sem `100vh` em seções internas. Só o shell usa altura de viewport (`min-h-screen` / `h-dvh`).
- Nada de rolagem horizontal na página: o que é largo rola **dentro** do próprio contêiner.

## Como testar
1. `npm run dev` e redimensione em 390, 768, 1024, 1280 e 1440.
2. Navegue só pelo teclado (Tab/Shift+Tab/Esc) em modais e drawers: o foco fica preso no painel e volta ao gatilho ao fechar.
3. Confira se nenhuma tabela, grade de agenda ou gráfico estoura a largura da página.
