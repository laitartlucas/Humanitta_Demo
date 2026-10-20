# Humanittá Gestão — Design System (v1.0 · Etapa 1)

> Plataforma de Saúde Integral desenvolvida para a **Humanittá Saúde Integral** (Ronda Alta/RS).
> Demonstração comercial: pacientes, valores, conversas e métricas são **fictícios**.

Fontes da implementação: `foundations/tokens.ts`, `foundations/tokens.css`, `foundations/tokens.json`,
`tailwind.config.ts` (raiz) e o artboard de referência `foundations/design/Main.dc.html`.
Os quatro arquivos de tokens carregam os mesmos valores. Se um deles mudar, os outros três precisam ser atualizados junto.

---

## 1. Pesquisa de identidade (fontes públicas)

| Item | O que foi confirmado | Fonte |
|---|---|---|
| Nome | Humanittá Saúde Integral — "Clínica Multiprofissional" | Instagram @humanittasaudeintegral, Linktree |
| Especialidades | Odontologia, Fonoaudiologia, Estética Avançada, Psicologia, Quiropraxia, Podologia (bio); Fisioterapia e Nutrição (post institucional) | Instagram |
| Endereço | R. Rio Branco, 185 – Centro, Ronda Alta – RS, 99670-000 | Linktree (Google Maps), registro CNPJ |
| WhatsApp | (54) 99292-0770 | Linktree |
| Profissional divulgada | Dra. Lauren Bertocchi — Ortodontista, Clínica Geral, Responsável Técnica, CRO/RS 15630 | Post do Instagram |
| Salas | Placa da recepção: Sala 1 a 7 (Odontologia, Fonoaudiologia, Podologia/Quiropraxia, Fonoaudiologia, Estética Avançada, Psicologia; Sala 7 sem leitura) | Vídeo do Instagram |
| Logo | Anel dourado fino com duas figuras humanas em gradiente bronze; wordmark "Humanittá" em sans geométrica fina e cinza; "Saúde Integral" embaixo | Foto de perfil |
| Linguagem dos posts | Fundo branco, blocos grafite, quartos de círculo dourados, títulos serifados finos em dourado, tom acolhedor ("Acesse o link da bio e agende seu horário") | Feed |

**O que ficou como placeholder ou ficção** (não foi possível confirmar):
- Arquivo oficial do logo. `assets/humanitta-symbol.svg` é uma **aproximação vetorial** e precisa ser trocado pelo original da clínica.
- Nome exato das fontes da marca. Josefin Sans foi escolhida por se aproximar do wordmark.
- Preços, formas de pagamento, horários de funcionamento, CNPJ, e-mail e razão social: aparecem como `[a definir]` / `[a confirmar]`.
- Demais profissionais: nomes fictícios com selo **Demo**.

---

## 2. Cor

O dourado funciona como acento: anéis, item ativo, ação primária e série principal dos gráficos. A estrutura da interface fica no grafite quente e no marfim.

### Neutros (grafite quente)
| Token | Hex | Uso |
|---|---|---|
| `ivory` | #FAF8F4 | Fundo da aplicação |
| `white` | #FFFFFF | Superfícies (cards, modais, header) |
| `graphite-50` | #F5F3EF | Cabeçalho de tabela, controles segmentados, fundos sutis |
| `graphite-100` | #ECE9E3 | Divisores, skeleton |
| `graphite-200` | #DFDBD3 | Bordas padrão |
| `graphite-300` | #C7C2B9 | Bordas de hover, desabilitado |
| `graphite-400` | #9E998F | Placeholder (**nunca** em texto informativo) |
| `graphite-500` | #77736B | Texto secundário (4.6:1 sobre branco) |
| `graphite-600` | #5B5852 | Ícones, texto de apoio |
| `graphite-700` | #43413C | Texto de corpo secundário |
| `graphite-800` | #2E2C29 | Texto de botão secundário |
| `graphite-900` | #1E1D1B | Texto principal, sidebar |

### Dourado (marca)
| Token | Hex | Uso |
|---|---|---|
| `gold-50` | #FBF6EC | Fundo de destaque, status "Em atendimento" |
| `gold-100` | #F5E9D0 | Seleção, avatar do usuário |
| `gold-200` | #EBD4A6 | Bordas ativas, barras secundárias |
| `gold-300` | #DDB872 | Ícones e indicadores sobre a sidebar escura |
| `gold-400` | #CC9B47 | Ícones de marca |
| `gold-500` | #B5832F | **Cor da marca**: anéis, gráficos, foco. Texto branco sobre ela só ≥ 18px bold |
| `gold-600` | #8F6425 | **Botão primário**, links, texto dourado (5.4:1) |
| `gold-700` | #6F4D1D | Hover do primário |
| `gold-800` | #4E3615 | Texto sobre fundos dourados claros |

Gradiente de marca (`--hm-gradient-brand`, 135° #DDB872 → #B5832F → #7A5220): **só no símbolo**. Nunca em fundos.

### Semânticas
| Papel | Texto/ícone | Fundo |
|---|---|---|
| Sucesso | `success` #2E7351 | `success-bg` #E6F2EB |
| Atenção | `warning` #9A5F0E | `warning-bg` #FBF0DA |
| Erro | `danger` #A93B30 | `danger-bg` #FAE7E4 |
| Informação | `info` #2D5F88 | `info-bg` #E5EEF6 |
| IA ativa | `ai` #2F6F68 | `ai-bg` #E3F0EE |
| Reagendada | `violet` #5B4E8C | `violet-bg` #EEEBF6 |

### Status de consulta
Agendada (info) · Confirmada (success) · Em atendimento (gold-600/gold-50) · Concluída (graphite-600/graphite-100) ·
Cancelada (danger, texto riscado) · Faltou (warning) · Reagendada (violet).

### Níveis de acesso e solicitações
Editar (`gold-600`/`gold-50`) · Visualizar (`info`) · Somente os próprios (`ai`) · Solicitar (`warning`) · Sem acesso (`graphite-600`/`graphite-100`).
Solicitação: Enviada/aguardando aprovação (`warning`, ícone `Hourglass`) · Aprovada (`success`) · Recusada (`danger`, sempre com motivo).
Bloqueio na agenda: hachura sutil em `graphite-100`. Bloqueio pendente: hachura em `warning-bg` + badge "Aguardando aprovação".
O status sempre aparece como **ícone ou ponto + texto**. Cor sozinha não basta (`StatusBadge`).

### Especialidades (`spec-*`)
Odontologia #B5832F · Fonoaudiologia #3E7CA8 · Estética Avançada #B0607A · Psicologia #6E62A6 ·
Quiropraxia #3F8A72 · Podologia #8A7A3F · Fisioterapia #C0703A · Nutrição #5E8A3A.
Essas cores marcam a agenda, as legendas e os gráficos por categoria. Em cards de consulta aparecem como **faixa superior de 3px** sobre uma tinta de 8% (`AppointmentCard`).

---

## 3. Tipografia

| Família | Papel | Tailwind |
|---|---|---|
| **Cormorant Garamond** 500–700 | Títulos de página, números-herói (KPI), login, estados vazios | `font-display` |
| **Manrope** 400–800 | Toda a interface | `font-sans` (padrão) |
| **Josefin Sans** 300 | Só no wordmark "Humanittá" | `font-brand` |

As fontes carregam pelo Google Fonts em `foundations/global.css`. Fallbacks: Georgia/serif e system-ui/sans-serif.

| Token | Spec | Uso |
|---|---|---|
| `text-display-xl` | 48/52 · 600 · Cormorant | Login, capa |
| `text-display-lg` | 36/40 · 600 · Cormorant | Saudação do dashboard, nome no perfil |
| `text-display-md` | 28/34 · 600 · Cormorant | Título de página no header |
| `text-kpi` | 34–40/1 · 600 · Cormorant | Números de KPI |
| `h3` | 20/28 · 700 · Manrope | Título de seção |
| `h4` | 16/24 · 700 | Título de card |
| `body` | 14/22 · 500 | Texto padrão |
| `text-body-sm` | 13/20 · 500 | Metadados |
| `text-caption` | 12/16 · 600 | Legendas, badges |
| `text-overline` | 12/16 · 700 · uppercase · tracking .08em | Rótulos de KPI e de seção |

Números em tabelas e KPIs usam `tabular-nums`.

---

## 4. Espaço, forma e profundidade

- **Grade de 4px**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (escala padrão do Tailwind: `p-1` … `p-16`).
- **Padding de página**: 32px no desktop, 24px no notebook e no tablet, 16px no celular. Gap entre cards: 16px. Padding interno de card: 20–24px.
- **Raios**: `rounded-xs` 6 (chips, inputs pequenos) · `rounded-sm` 8 (botões, inputs) · `rounded-md` 12 (cards) ·
  `rounded-lg` 16 (modais, painéis) · `rounded-xl` 24 · `rounded-full`.
- **Bordas**: 1px `graphite-200`. Divisores internos em `graphite-100`.
- **Sombras**: `shadow-sm` (cards) · `shadow-md` (hover, toasts, popovers) · `shadow-lg` (modais e drawers) ·
  `shadow-focus` (anel dourado de 3px a 35% + borda `gold-500`).
- **Overlay de modal**: rgba(30,29,27,.45) com blur leve.

---

## 5. Breakpoints

| Nome | Min | Comportamento |
|---|---|---|
| `sm` | 640 | Botões e filtros deixam de ocupar a largura toda |
| `md` | 768 | Tablet: some a bottom-nav, tabelas voltam a ser tabelas |
| `lg` | 1024 | Notebook: sidebar fixa (recolhível, 76px) |
| `xl` | 1280 | **Desktop alvo**: sidebar expandida (264px), layouts de 2–3 colunas |
| `2xl` | 1536 | Desktop amplo: conteúdo limitado a 1440px |

Detalhes por componente estão no `RESPONSIVE_GUIDE.md`.

---

## 6. Iconografia

- **Lucide** (`lucide-react`), `strokeWidth={1.75}`, 20px na navegação e nos botões, 16px em chips e tabelas, 14px em badges.
- Ícones decorativos levam `aria-hidden`. Botão só com ícone usa `IconButton`, que exige `label`.
- Ícones da navegação: Dashboard `LayoutDashboard`, Agenda `CalendarDays`, Pacientes `Users`, Profissionais `Stethoscope`,
  Atendimentos `ClipboardList`, Financeiro `Wallet`, WhatsApp `MessageCircle`, Assistente IA `Bot`, Relatórios `BarChart3`,
  Configurações `Settings`.
- Status: `CalendarClock` (agendada), `CircleCheck` (confirmada), `Activity` (em atendimento), `CheckCheck` (concluída),
  `CircleX` (cancelada), `UserX` (faltou), `CalendarSync` (reagendada). IA: `Bot` / `Sparkles`.
- **Sem emoji** na interface.

---

## 7. Estados visuais (obrigatórios em todo componente interativo)

| Estado | Tratamento |
|---|---|
| Padrão | Borda `graphite-200`, fundo branco |
| Hover | Fundo `graphite-50` (ghost/linhas) ou um tom mais escuro (primário `gold-700`) |
| Foco (`:focus-visible`) | `shadow-focus` + borda `gold-500`, sem outline nativo |
| Erro | Borda `danger`, mensagem `text-danger` com ícone `CircleAlert`, `aria-invalid` e `aria-describedby` |
| Sucesso | Borda `success` e ícone `CircleCheck`, ou toast de sucesso |
| Carregando | Spinner em anel dourado, botão com `aria-busy`, largura preservada; skeleton com shimmer em `graphite-100` |
| Selecionado | Fundo `gold-50` com borda `gold-200`, ou `ring-2 ring-gold-500` em cards |
| Desabilitado | `opacity-50`, `cursor-not-allowed`, sem hover |

---

## 8. Motivos de marca (usar com parcimônia)

1. **Anel dourado fino** (1.5px) do símbolo: avatar com anel, ícone do Assistente IA, estados vazios, foto do profissional.
2. **Quarto de círculo dourado** dos posts: canto do login e cabeçalho do perfil do paciente. No máximo um por tela.
3. **Serifa Cormorant** em títulos e números: dá o tom acolhedor e premium.

### Não faça
- Gradiente em fundos de página ou de card.
- Card com borda esquerda colorida. Para categoria, use faixa superior, ponto ou chip.
- Dourado em mais de uma ação primária por área.
- `graphite-400` em texto, ou texto dourado mais claro que `gold-600` sobre branco.
- Emoji, ilustração genérica ou foto de banco de imagem.
- Dado clínico fora de uma área marcada como **restrita**.

---

## 8.1 Portal do Profissional
Mesma identidade, menos ruído: sidebar com 5 itens e a pílula dourada "Portal do Profissional", saudação em Cormorant, próximo atendimento como card-herói e o selo "Somente seus registros" (tom IA) em toda lista com escopo. Não existe um tema separado para o portal.

## 9. Princípios

1. **Acolher antes de informar.** Pessoas antes de registros: nome e avatar vêm antes do número.
2. **Dourado é exceção.** Uma ação primária por área.
3. **Ritmo de balcão.** Agendar, confirmar e receber em no máximo 3 cliques a partir da agenda.
4. **Sigilo visível.** Prontuário só aparece em áreas com cadeado, para os perfis autorizados.
