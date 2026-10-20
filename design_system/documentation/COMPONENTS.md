# Humanittá Gestão — Catálogo de componentes

Referência dos componentes de `design_system/components` e dos layouts de `design_system/layouts`.
Props, padrões e variantes foram extraídos do código-fonte atual. Em caso de divergência, o código vale.

> Ambiente de demonstração: todos os pacientes, valores e conversas usados nos exemplos são fictícios.

## Índice

**Convenções** · [Importação](#importação) · [cn](#cn) · [Tokens](#tokens) · [Estados obrigatórios](#estados-visuais-obrigatórios) · [Acessibilidade geral](#acessibilidade-geral)

**Formulário** · [Button](#button) · [IconButton](#iconbutton) · [Input](#input) · [Textarea](#textarea) · [Select](#select) · [Checkbox](#checkbox) · [Switch](#switch) · [SearchInput](#searchinput) · [FormField, FieldLabel, FieldFeedback](#formfield-fieldlabel-fieldfeedback)

**Selos e identidade** · [Badge](#badge) · [StatusBadge](#statusbadge) · [PaymentStatusBadge](#paymentstatusbadge) · [SpecialtyTag](#specialtytag) · [Avatar](#avatar)

**Estrutura e dados** · [Card](#card) · [KpiCard](#kpicard) · [DataTable](#datatable) · [Pagination](#pagination) · [Tabs](#tabs) · [SegmentedControl](#segmentedcontrol) · [FilterChip](#filterchip)

**Sobreposições** · [Modal](#modal) · [Drawer](#drawer) · [ConfirmDialog](#confirmdialog) · [ToastProvider e useToast](#toastprovider-e-usetoast) · [DropdownMenu](#dropdownmenu) · [Tooltip](#tooltip)

**Feedback e marca** · [EmptyState](#emptystate) · [Skeleton](#skeleton) · [Spinner](#spinner) · [ProgressBar](#progressbar) · [Logo e LogoMark](#logo-e-logomark) · [PageHeader](#pageheader) · [SectionTitle](#sectiontitle)

**Gráficos** · [BarChart](#barchart) · [HorizontalBarList](#horizontalbarlist) · [LineChart](#linechart) · [DonutChart](#donutchart)

**Agenda** · [AppointmentCard](#appointmentcard) · [MiniCalendar](#minicalendar) · [TimeSlot](#timeslot)

**Layouts** · [AppShell](#appshell) · [Sidebar](#sidebar) · [Header](#header) · [MobileNav](#mobilenav) · [AuthLayout](#authlayout) · [NAV_ITEMS, MOBILE_NAV_IDS, DEMO_USER](#nav_items-mobile_nav_ids-demo_user)

---

## Convenções

### Importação

```tsx
import { Button, Card, useToast } from '@ds/components';
import type { DataTableColumn } from '@ds/components';
import { AppShell } from '@ds/layouts';
import type { Appointment } from '@ds/mocks/types';
```

- Sempre pelo barrel `@ds/components` / `@ds/layouts` (alias `@ds/*` → `design_system/*`). Não importe arquivos internos (`./internal`, `./Button`).
- Somente exportações nomeadas; não há default export.
- Ícones: `lucide-react`. Props que recebem ícone esperam o **componente** (`LucideIcon`), não o elemento: `leftIcon={Plus}`, e não `leftIcon={<Plus />}`.
- Todos os componentes aceitam `className` (exceto onde indicado) para ajustes de layout (margem, largura). Não use `className` para trocar cores da marca.

### cn

```ts
import { cn } from '@ds/foundations/cn';
cn('h-10 px-4', active && 'bg-gold-50', undefined); // "h-10 px-4 bg-gold-50"
```

Une classes condicionais (ignora `false`, `null`, `undefined`). Não resolve conflitos do Tailwind: a última classe não "vence" automaticamente. Evite passar classes conflitantes.

### Tokens

Definidos em `foundations/tokens.css` (variáveis `--hm-*`), `tokens.json`, `tokens.ts` (`tokens`, `SPECIALTY_COLORS`, `STATUS_COLORS`) e expostos no Tailwind:

| Grupo | Classes |
|---|---|
| Fundo da app | `bg-ivory` (#FAF8F4); superfícies `bg-white` |
| Neutros | `graphite-50 … 900` (texto principal 900, secundário 500, bordas 200, divisores 100) |
| Marca | `gold-50 … 800` (preenchimento 500; texto/links e botão primário 600; hover 700) |
| Estados | `success`, `warning`, `danger`, `info`, `ai`, `violet` + `*-bg` |
| Especialidades | `spec-odontologia`, `spec-fonoaudiologia`, `spec-estetica`, `spec-psicologia`, `spec-quiropraxia`, `spec-podologia`, `spec-fisioterapia`, `spec-nutricao` |
| Fontes | `font-display` (Cormorant Garamond), `font-sans` (Manrope, padrão), `font-brand` (Josefin Sans, só wordmark) |
| Tamanhos | `text-display-xl/lg/md`, `text-kpi`, `text-overline`, `text-body`, `text-body-sm`, `text-caption` |
| Raios | `rounded-xs` 6 · `rounded-sm` 8 (inputs/botões) · `rounded-md` 12 (cards) · `rounded-lg` 16 (modais) · `rounded-xl` 24 |
| Sombras | `shadow-sm` (cards) · `shadow-md` (menus/toasts) · `shadow-lg` (modais) · `shadow-focus` (anel de foco dourado) |

Gradiente dourado só no logo e em ilustrações — nunca em fundos.

### Estados visuais obrigatórios

Todo interativo cobre: hover, `focus-visible` (`shadow-focus` + `border-gold-500`), disabled (`opacity-50`, `cursor-not-allowed`), erro, carregamento e selecionado, quando se aplicam.

### Acessibilidade geral

- Contraste mínimo de 4.5:1. Texto dourado sobre branco usa `gold-600`, nunca `gold-500`.
- Status nunca só por cor: sempre ícone e texto.
- Alvos de toque ≥ 40px no desktop e ≥ 44px no celular.
- Botão só-ícone sempre com rótulo acessível (`IconButton.label`).
- Diálogos (Modal, Drawer, ConfirmDialog) prendem o foco, fecham com Esc e devolvem o foco ao gatilho.

---

## Formulário

### Button

Ação principal ou secundária. Tamanhos sm 36px, md 40px, lg 48px; raio 8.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'link'` | `'primary'` | Estilo visual |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Altura e tamanho do ícone (16/18/20) |
| `loading` | `boolean` | `false` | Mostra spinner, desabilita e define `aria-busy` |
| `leftIcon` | `LucideIcon` | — | Ícone à esquerda (trocado pelo spinner durante o carregamento) |
| `rightIcon` | `LucideIcon` | — | Ícone à direita (oculto durante o carregamento) |
| `fullWidth` | `boolean` | `false` | Ocupa 100% da largura |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Padrão seguro: não envia formulários sem querer |
| …`ButtonHTMLAttributes` | | | `onClick`, `disabled`, `aria-*` etc. Aceita `ref` |

**Variantes:** primary (fundo gold-600, texto branco, hover gold-700), secondary (branco, borda graphite-200), ghost (sem borda, hover graphite-50), danger (fundo danger), link (texto gold-600 sublinhado no hover, sem altura fixa).
**Estados:** hover, active, focus-visible, disabled, loading (`cursor-progress` e texto "Carregando" para leitores de tela).

```tsx
<Button leftIcon={Plus} onClick={() => setOpen(true)}>Novo agendamento</Button>
<Button variant="secondary" loading={saving}>Salvar</Button>
```

**Acessibilidade:** `<button>` real; foco visível; `aria-busy` durante o carregamento. Se o texto for ambíguo em listas ("Iniciar"), passe `aria-label` com contexto ("Iniciar atendimento de Carla Menegatti").
**Não faça:** usar mais de um `primary` por área de ação; usar `link` para navegação externa (use `<a>`); passar `<Plus />` em vez de `Plus`.

### IconButton

Botão só-ícone de 40×40 (md) ou 36×36 (sm).

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `icon` | `LucideIcon` | **obrigatório** | Ícone |
| `label` | `string` | **obrigatório** | Vira `aria-label` |
| `variant` | `'ghost' \| 'secondary' \| 'dark'` | `'ghost'` | `dark` para a sidebar |
| `size` | `'sm' \| 'md'` | `'md'` | |
| `badge` | `boolean` | `false` | Ponto de notificação vermelho |
| `selected` | `boolean` | — | Estado pressionado (`aria-pressed`) com fundo gold-50 |
| …`ButtonHTMLAttributes` | | | Aceita `ref` |

**Estados:** hover, active, focus-visible, disabled, selected.

```tsx
<IconButton icon={Bell} label="Notificações (3 novas)" badge />
```

**Acessibilidade:** `label` descreve a ação, não o ícone ("Fechar painel", não "X"). O `badge` é decorativo: informe a contagem no `label`.
**Não faça:** omitir `label` ou usar texto genérico ("botão"); usar a variante `dark` em fundo claro.

### Input

Campo de texto de 40px com rótulo, ajuda, erro, ícone e slot à direita.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | — | Rótulo acima (13px/600) |
| `hint` | `string` | — | Texto de ajuda (oculto quando há erro) |
| `error` | `string` | — | Mensagem de erro; ativa borda danger e `aria-invalid` |
| `leftIcon` | `LucideIcon` | — | Ícone decorativo à esquerda |
| `rightSlot` | `ReactNode` | — | Conteúdo à direita (ex.: botão "mostrar senha") |
| `wrapperClassName` | `string` | — | Classe do wrapper (rótulo + campo) |
| `id` | `string` | gerado (`useId`) | |
| …`InputHTMLAttributes` | | | `className` vai no `<input>`. Aceita `ref` |

**Estados:** hover (borda graphite-300), focus (anel dourado), erro (anel danger), disabled (fundo graphite-50), read-only.

```tsx
<Input label="Telefone" placeholder="(54) 99999-0000" leftIcon={Phone} required error={errors.phone} />
```

**Acessibilidade:** `<label for>` automático; `aria-describedby` aponta para ajuda/erro; `required` mostra `*` e "(obrigatório)" para leitores de tela.
**Não faça:** usar `placeholder` como rótulo; mostrar erro sem texto (só borda vermelha).

### Textarea

Área multilinha (mín. 96px) com o mesmo visual do Input.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | — | |
| `hint` | `string` | — | |
| `error` | `string` | — | |
| `rows` | `number` | `4` | |
| `wrapperClassName` | `string` | — | |
| …`TextareaHTMLAttributes` | | | Aceita `ref` |

**Estados:** iguais ao Input; redimensionável verticalmente.

```tsx
<Textarea label="Observações" hint="Visível para a recepção." rows={3} />
```

**Acessibilidade:** mesma ligação rótulo/ajuda/erro do Input. Campos bloqueados por perfil (registro clínico) devem ficar dentro de `<fieldset disabled>` com `legend` explicando o motivo.
**Não faça:** usar para dados clínicos sem controle de acesso; esconder o motivo de um campo desabilitado.

### Select

Select nativo estilizado.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `options` | `SelectOption[]` (`{ value; label; disabled? }`) | **obrigatório** | |
| `label` | `string` | — | |
| `hint` / `error` | `string` | — | |
| `placeholder` | `string` | — | Primeira opção vazia (desabilitada se `required`) |
| `controlSize` | `'sm' \| 'md'` | `'md'` | 36px (filtros) ou 40px |
| `wrapperClassName` | `string` | — | |
| …`SelectHTMLAttributes` | | | `value`, `onChange`, `defaultValue`. Aceita `ref` |

**Estados:** hover, focus, erro, disabled.

```tsx
<Select
  label="Profissional"
  controlSize="sm"
  value={prof}
  onChange={(e) => setProf(e.target.value)}
  options={[{ value: '', label: 'Todos os profissionais' }, ...opcoes]}
/>
```

**Acessibilidade:** controle nativo (teclado e leitores de tela funcionam sem esforço extra).
**Não faça:** usar para mais de ~15 opções sem busca; usar quando há só 2 ou 3 opções visíveis (prefira `SegmentedControl`).

### Checkbox

Caixa de seleção com rótulo clicável (alvo ≥ 40px).

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | **obrigatório** | |
| `description` | `string` | — | Texto auxiliar (ligado por `aria-describedby`) |
| `error` | `string` | — | |
| …`InputHTMLAttributes` | | | `checked`, `onChange`, `disabled`. `type` é ignorado. Aceita `ref` |

**Estados:** hover (borda dourada), checked e indeterminate (gold-600), focus-visible, disabled, erro.

```tsx
<Checkbox label="Termo LGPD assinado" description="Autoriza o tratamento de dados de saúde." checked={ok} onChange={() => setOk(!ok)} />
```

**Acessibilidade:** `<input type="checkbox">` real dentro de `<label>`.
**Não faça:** usar para ligar/desligar um recurso com efeito imediato (use `Switch`).

### Switch

Interruptor liga/desliga com efeito imediato.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `checked` | `boolean` | **obrigatório** | |
| `onChange` | `(checked: boolean) => void` | **obrigatório** | Recebe o novo valor |
| `label` | `string` | **obrigatório** | |
| `description` | `string` | — | |
| `disabled` | `boolean` | `false` | |
| `hideLabel` | `boolean` | `false` | Esconde o rótulo visualmente (vira `aria-label`) |
| `className` | `string` | — | |

**Estados:** ligado (gold-600), desligado (graphite-200), hover, focus-visible, disabled.

```tsx
<Switch label="Lembrete 24h antes" checked={on} onChange={setOn} />
```

**Acessibilidade:** `role="switch"` + `aria-checked`; alvo de 48×40.
**Não faça:** usar em formulários que só valem após "Salvar" sem deixar isso claro; usar `hideLabel` sem contexto visual próximo.

### SearchInput

Campo de busca com lupa e atalho opcional.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `shortcut` | `string` | — | Atalho exibido (ex.: `"⌘K"`). Só visual; quem usa registra o atalho |
| `inputClassName` | `string` | — | Classe do `<input>` interno |
| `placeholder` | `string` | `'Buscar…'` | |
| `aria-label` | `string` | `'Buscar'` | Rótulo acessível |
| `className` | `string` | — | Aplicado ao wrapper (largura/altura) |
| …`InputHTMLAttributes` | | | `type` fixo `search`. Aceita `ref` |

**Estados:** hover, focus-within (fundo branco + anel), disabled.

```tsx
<SearchInput aria-label="Buscar pacientes" placeholder="Nome, telefone ou cidade…" value={q} onChange={(e) => setQ(e.target.value)} />
```

**Acessibilidade:** passe um `aria-label` específico. Anuncie a quantidade de resultados em uma região `aria-live` próxima.
**Não faça:** exibir `shortcut` sem registrar o atalho.

### FormField, FieldLabel, FieldFeedback

Agrupador rótulo + controle + ajuda/erro para controles customizados (Input/Select/Textarea já embutem o próprio rótulo).

| Prop (`FormField`) | Tipo | Padrão |
|---|---|---|
| `label` | `string` | **obrigatório** |
| `htmlFor` | `string` | — |
| `hint` / `error` | `string` | — |
| `required` | `boolean` | — |
| `children` | `ReactNode` | **obrigatório** |
| `className` | `string` | — |

`FieldLabel`: `{ htmlFor?; id?; required?; children }`. `FieldFeedback`: `{ hintId?; errorId?; hint?; error? }` (erro tem prioridade e vem com ícone).

```tsx
<FormField label="Cor da especialidade" htmlFor="cor" hint="Usada nos blocos da agenda.">
  <input id="cor" type="color" />
</FormField>
```

**Acessibilidade:** ligue `htmlFor` ao `id` do controle. Os ids de ajuda/erro seguem `${htmlFor}-hint` / `${htmlFor}-error`; aponte `aria-describedby` do controle para eles.
**Não faça:** envolver `Input`/`Select` em `FormField` (rótulo duplicado).

---

## Selos e identidade

### Badge

Selo informativo, não interativo. Altura 24 (md) ou 20 (sm), raio full.

| Prop | Tipo | Padrão |
|---|---|---|
| `tone` | `'neutral' \| 'gold' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'ai' \| 'violet'` | `'neutral'` |
| `dot` | `boolean` | `false` (ignorado quando há `icon`) |
| `icon` | `LucideIcon` | — |
| `size` | `'sm' \| 'md'` | `'md'` |
| `children` | `ReactNode` | **obrigatório** |
| `className` | `string` | — |

Exporta também `BADGE_TONE` (classes por tom). Tom `ai` é reservado ao Assistente IA e às automações.

```tsx
<Badge tone="ai" icon={Bot}>Atendido pela IA</Badge>
```

**Acessibilidade:** o texto carrega o significado; ícone e ponto são decorativos.
**Não faça:** usar como botão ou filtro (use `FilterChip`); usar só o ponto colorido sem texto.

### StatusBadge

Status de consulta com ícone, texto e cor padronizados.

| Prop | Tipo | Padrão |
|---|---|---|
| `status` | `AppointmentStatus` | **obrigatório** |
| `size` | `'sm' \| 'md'` | `'md'` |
| `className` | `string` | — |

| Status | Rótulo | Tom | Ícone |
|---|---|---|---|
| `agendada` | Agendada | info | CalendarClock |
| `confirmada` | Confirmada | success | CheckCircle2 |
| `em_atendimento` | Em atendimento | gold | Activity |
| `concluida` | Concluída | neutral | CheckCheck |
| `cancelada` | Cancelada | danger | XCircle |
| `faltou` | Faltou | warning | UserX |
| `reagendada` | Reagendada | violet | RefreshCw |

Exporta `STATUS_LABEL`, `STATUS_TONE`, `STATUS_ICON` para reuso.

```tsx
<StatusBadge status="em_atendimento" />
```

**Não faça:** recriar status com `Badge` e cores próprias; traduzir rótulos de outra forma em telas diferentes.

### PaymentStatusBadge

| Prop | Tipo | Padrão |
|---|---|---|
| `status` | `PaymentStatus` (`'pago' \| 'pendente' \| 'atrasado' \| 'estornado'`) | **obrigatório** |
| `size` | `'sm' \| 'md'` | `'md'` |
| `className` | `string` | — |

Pago = success, Pendente = warning, Atrasado = danger, Estornado = neutral. Exporta `PAYMENT_STATUS_LABEL`.

```tsx
<PaymentStatusBadge status="pendente" size="sm" />
```

**Não faça:** usar para status de consulta.

### SpecialtyTag

Marcador de especialidade: a cor fica só no ponto, o texto é sempre grafite (contraste AA).

| Prop | Tipo | Padrão |
|---|---|---|
| `specialty` | `Specialty` | **obrigatório** |
| `variant` | `'dot' \| 'chip'` | `'dot'` |
| `className` | `string` | — |

Exporta `SPECIALTY_LABEL` e `SPECIALTY_COLOR` (hex por especialidade).

```tsx
<SpecialtyTag specialty="fonoaudiologia" variant="chip" />
```

**Não faça:** pintar o texto com a cor da especialidade; usar cores de especialidade como cor de status.

### Avatar

Foto ou iniciais (ignora "Dr."/"Dra."). Se a imagem falhar, mostra as iniciais.

| Prop | Tipo | Padrão |
|---|---|---|
| `name` | `string` | **obrigatório** |
| `src` | `string` | — |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` (24/32/36/48/64px) | `'md'` |
| `ring` | `boolean` | `false` (anel dourado fino: perfil em destaque) |
| `status` | `'online' \| 'offline'` | — |
| `tone` | `'gold' \| 'neutral' \| 'dark'` | `'gold'` |
| `className` | `string` | — |

```tsx
<Avatar name="Dra. Lauren Bertocchi" size="lg" ring />
```

**Acessibilidade:** `role="img"` com `aria-label={name}`; status tem texto `sr-only`. Se o nome já aparece ao lado, o anúncio duplicado é aceitável, mas evite em listas longas.
**Não faça:** usar fotos reais de pacientes na demonstração.

---

## Estrutura e dados

### Card

Superfície branca com borda graphite-200, raio 12 e sombra sm.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `ReactNode` | — | Renderizado como `<h3>` (15px/700) |
| `description` | `ReactNode` | — | |
| `action` | `ReactNode` | — | Ação à direita do cabeçalho (geralmente `Button variant="ghost"`) |
| `padding` | `'none' \| 'md' \| 'lg'` | `'lg'` | 0 / 20px / 24px. Com `none`, o cabeçalho ganha padding próprio (tabelas) |
| `as` | `'div' \| 'section' \| 'article'` | `'div'` | Elemento semântico |
| …`HTMLAttributes<HTMLDivElement>` (sem `title`) | | | |

```tsx
<Card title="Próximas consultas" action={<Button variant="ghost" size="sm">Ver agenda</Button>}>
  …
</Card>
```

**Não faça:** usar borda esquerda colorida para indicar categoria; aninhar cards com sombra dentro de cards.

### KpiCard

Indicador com overline, número em Cormorant e delta ou progresso.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | **obrigatório** | Overline |
| `value` | `string` | **obrigatório** | Já formatado (ex.: `"R$ 48.920,00"`) |
| `icon` | `LucideIcon` | — | Ícone em quadrado tingido |
| `tone` | `'gold' \| 'warning' \| 'success' \| 'ai'` | `'gold'` | Cor do quadrado do ícone |
| `delta` | `{ value: string; trend: 'up' \| 'down'; caption?: string }` | — | Ex.: `{ value: '12%', trend: 'up', caption: 'vs. set/2026' }` |
| `invertDelta` | `boolean` | `false` | Queda é boa (ex.: faltas) |
| `progress` | `number` (0–100) | — | Barra abaixo do número |
| `meta` | `string` | — | Texto à direita do rótulo quando não há ícone |
| `footer` | `ReactNode` | — | |
| `loading` | `boolean` | `false` | Shimmer no lugar do número + `aria-busy` |
| `className` | `string` | — | |

```tsx
<KpiCard label="Faltas no mês" value="4,4%" icon={UserX} tone="warning" delta={{ value: '1,2 p.p.', trend: 'down', caption: 'vs. set/2026' }} invertDelta />
```

**Acessibilidade:** a tendência é anunciada ("Alta de"/"Queda de") além da cor.
**Não faça:** passar números sem formatação pt-BR; usar mais de 4–5 KPIs por linha.

### DataTable

Tabela genérica: cabeçalho graphite-50 em caixa alta, linhas de 56px, hover graphite-50, sem zebra.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `columns` | `DataTableColumn<T>[]` | **obrigatório** | Ver abaixo |
| `rows` | `T[]` | **obrigatório** | |
| `rowKey` | `(row: T) => string` | **obrigatório** | |
| `onRowClick` | `(row: T) => void` | — | Linha fica focável e ativa com Enter/Espaço |
| `loading` | `boolean` | `false` | 5 linhas skeleton + `aria-busy` |
| `empty` | `ReactNode` | `'Nenhum registro encontrado.'` | Conteúdo do estado vazio (use `EmptyState compact`) |
| `caption` | `string` | — | `<caption>` só para leitores de tela |
| `isRowSelected` | `(row: T) => boolean` | — | Destaque gold-50 + `aria-current` |
| `minWidth` | `number` | `640` | Largura mínima antes de rolar horizontalmente |
| `className` | `string` | — | |

`DataTableColumn<T>`: `{ key: string; header: string; render?: (row: T) => ReactNode; align?: 'left' \| 'right' \| 'center'; width?: string; hideBelow?: 'md' \| 'lg'; srOnlyHeader?: boolean }`. Sem `render`, mostra `row[key]` quando é string/número. Colunas `align: 'right'` usam `tabular-nums`.

```tsx
const columns: DataTableColumn<Patient>[] = [
  { key: 'name', header: 'Paciente' },
  { key: 'city', header: 'Cidade', hideBelow: 'md' },
  { key: 'balance', header: 'Saldo', align: 'right', render: (p) => formatCurrency(p.balance) },
];
<DataTable columns={columns} rows={rows} rowKey={(p) => p.id} onRowClick={(p) => abrir(p.id)} caption="Lista de pacientes" />
```

**Acessibilidade:** sempre passe `caption`. Botões dentro de linhas clicáveis devem interromper a propagação (`onClick` e `onKeyDown` com `stopPropagation`) e ter `aria-label` com o nome do registro.
**Não faça:** esconder com `hideBelow` a coluna que identifica a linha; usar zebra ou cor de fundo por status.

### Pagination

| Prop | Tipo | Padrão |
|---|---|---|
| `page` | `number` (começa em 1) | **obrigatório** |
| `pageCount` | `number` | **obrigatório** |
| `onChange` | `(p: number) => void` | **obrigatório** |
| `total` | `number` | — (mostra "N registros") |
| `className` | `string` | — |

Números com reticências a partir de 8 páginas; abaixo de `sm` mostra só anterior/próxima e "Página X de Y".

```tsx
<Pagination page={page} pageCount={pages} onChange={setPage} total={filtered.length} />
```

**Acessibilidade:** `<nav aria-label="Paginação">`, página atual com `aria-current="page"`.
**Não faça:** paginar listas com menos de ~10 itens.

### Tabs

Abas com sublinhado gold-500 de 2px e contador opcional.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `items` | `TabItem[]` (`{ id; label; count?; icon?; disabled? }`) | **obrigatório** | |
| `value` | `string` | **obrigatório** | id ativo |
| `onChange` | `(id: string) => void` | **obrigatório** | |
| `ariaLabel` | `string` | **obrigatório** | |
| `idPrefix` | `string` | `'tabs'` | Gera `${idPrefix}-tab-${id}` e `${idPrefix}-panel-${id}` |
| `className` | `string` | — | |

```tsx
<Tabs items={[{ id: 'todos', label: 'Todos', count: 12 }, { id: 'fila', label: 'Aguardando', count: 3 }]} value={tab} onChange={setTab} ariaLabel="Filtrar por status" idPrefix="att" />
<div role="tabpanel" id={`att-panel-${tab}`} aria-labelledby={`att-tab-${tab}`}>…</div>
```

**Acessibilidade:** `role="tablist"`/`tab`, roving tabindex, setas, Home e End. Quem usa precisa renderizar o `tabpanel` com os ids corretos. Rolagem horizontal em telas estreitas.
**Não faça:** usar abas para navegar entre páginas (use links); usar mais de ~6 abas.

### SegmentedControl

Alternador compacto (Dia/Semana/Mês, 3M/6M/12M).

| Prop | Tipo | Padrão |
|---|---|---|
| `options` | `{ value: string; label: string }[]` | **obrigatório** |
| `value` | `string` | **obrigatório** |
| `onChange` | `(v: string) => void` | **obrigatório** |
| `ariaLabel` | `string` | **obrigatório** |
| `size` | `'sm' \| 'md'` | `'md'` |
| `className` | `string` | — |

```tsx
<SegmentedControl ariaLabel="Visualização da agenda" options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }]} value={view} onChange={setView} />
```

**Acessibilidade:** `role="radiogroup"`, setas trocam a opção.
**Não faça:** usar com mais de 4 opções ou rótulos longos.

### FilterChip

Chip de filtro alternável, com contador e remoção opcionais.

| Prop | Tipo | Padrão |
|---|---|---|
| `label` | `string` | **obrigatório** |
| `active` | `boolean` | `false` |
| `onClick` | `() => void` | — |
| `onRemove` | `() => void` | — (mostra botão ×) |
| `count` | `number` | — |
| `disabled` | `boolean` | — |
| `className` | `string` | — |

**Estados:** ativo (gold-50, borda gold-300, ícone de check), hover, focus-visible, disabled.

```tsx
<div role="group" aria-label="Filtros rápidos">
  <FilterChip label="Saldo em aberto" count={3} active={f === 'saldo'} onClick={() => setF('saldo')} />
</div>
```

**Acessibilidade:** `aria-pressed`; botão de remoção com `aria-label="Remover filtro …"`. Agrupe chips em `role="group"` com rótulo.
**Não faça:** usar como selo informativo (use `Badge`).

---

## Sobreposições

### Modal

Diálogo centralizado (bottom sheet abaixo de `md`). Renderiza em portal no `document.body`.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `open` | `boolean` | **obrigatório** | |
| `onClose` | `() => void` | **obrigatório** | |
| `title` | `string` | **obrigatório** | Cormorant 24 |
| `description` | `string` | — | |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 440 / 640 / 880px |
| `footer` | `ReactNode` | — | Alinhado à direita: secundário + primário |
| `dismissible` | `boolean` | `true` | `false` impede fechar por Esc/overlay e oculta o × |
| `children` | `ReactNode` | **obrigatório** | |
| `className` | `string` | — | |

```tsx
<Modal open={open} onClose={fechar} title="Novo paciente" footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button type="submit" form="novo">Salvar</Button></>}>
  <form id="novo">…</form>
</Modal>
```

**Acessibilidade:** `role="dialog"`, `aria-modal`, título/descrição ligados, foco preso, Esc fecha, foco volta ao gatilho, scroll do body travado. Modais empilhados respeitam a ordem (só o do topo reage a Esc).
**Não faça:** abrir modal sobre modal sem necessidade; usar `dismissible={false}` fora de operações em andamento.

### Drawer

Painel lateral direito para detalhes e formulários longos.

| Prop | Tipo | Padrão |
|---|---|---|
| `open` | `boolean` | **obrigatório** |
| `onClose` | `() => void` | **obrigatório** |
| `title` | `string` | **obrigatório** |
| `description` | `string` | — |
| `width` | `number` | `480` (100% em telas menores) |
| `footer` | `ReactNode` | — |
| `children` | `ReactNode` | **obrigatório** |
| `className` | `string` | — |

```tsx
<Drawer open={!!sel} onClose={() => setSel(null)} title="Detalhes do atendimento" width={520} footer={<Button>Finalizar atendimento</Button>}>…</Drawer>
```

**Acessibilidade:** mesmo comportamento de foco do Modal; botão "Fechar painel".
**Não faça:** usar para confirmações curtas (use `ConfirmDialog`).

### ConfirmDialog

Confirmação de ação (tamanho sm), baseada no Modal.

| Prop | Tipo | Padrão |
|---|---|---|
| `open` | `boolean` | **obrigatório** |
| `onClose` | `() => void` | **obrigatório** |
| `onConfirm` | `() => void` | **obrigatório** |
| `title` | `string` | **obrigatório** |
| `description` | `string` | **obrigatório** |
| `confirmLabel` | `string` | `'Confirmar'` |
| `cancelLabel` | `string` | `'Voltar'` |
| `tone` | `'danger' \| 'primary'` | `'primary'` |
| `loading` | `boolean` | `false` (bloqueia o fechamento) |

```tsx
<ConfirmDialog open={open} onClose={fechar} onConfirm={excluir} tone="danger" title="Excluir paciente?" description="O cadastro de Paulo Brum será removido desta demonstração." confirmLabel="Excluir" />
```

**Não faça:** usar rótulos genéricos ("Sim"/"Não"); confirmar ações reversíveis e triviais.

### ToastProvider e useToast

Notificações no canto inferior direito (acima da bottom-nav no celular). No máximo 4 visíveis.

`ToastProvider`: `{ children: ReactNode }` — envolva o App uma vez.
`useToast()` → `{ toast(t: ToastOptions) }`.

| `ToastOptions` | Tipo | Padrão |
|---|---|---|
| `title` | `string` | **obrigatório** |
| `description` | `string` | — |
| `tone` | `'success' \| 'danger' \| 'info' \| 'warning'` | `'success'` |
| `duration` | `number` (ms; `0` = não some) | `5000` |

```tsx
const { toast } = useToast();
toast({ tone: 'success', title: 'Atendimento finalizado', description: 'Carla Menegatti · 42 minutos.' });
```

**Acessibilidade:** lista `aria-live="polite"`; tom `danger` usa `role="alert"`. Botão "Fechar notificação".
**Não faça:** usar toast para erros que exigem ação (mostre no formulário); chamar `useToast` fora do provider (vira no-op com aviso no console).

### DropdownMenu

Menu de ações suspenso.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `trigger` | `ReactNode` | **obrigatório** | `<button>`, `Button` ou `IconButton` recebem os atributos ARIA; outro conteúdo é envolvido num botão |
| `items` | `DropdownMenuItem[]` (`{ label; icon?; onSelect; danger?; disabled? }`) | **obrigatório** | |
| `label` | `string` | **obrigatório** | Rótulo do menu (e do botão gerado) |
| `align` | `'start' \| 'end'` | `'end'` | |
| `className` | `string` | — | |

```tsx
<DropdownMenu label={`Ações para ${p.name}`} trigger={<IconButton icon={MoreHorizontal} label={`Ações para ${p.name}`} size="sm" />} items={[{ label: 'Editar', icon: Pencil, onSelect: editar }, { label: 'Excluir', icon: Trash2, danger: true, onSelect: excluir }]} />
```

**Acessibilidade:** `role="menu"`/`menuitem`, setas, Home, End, Esc fecha e devolve o foco, Tab fecha, clique fora fecha.
**Não faça:** colocar navegação principal em menus; usar mais de ~7 itens.

### Tooltip

Dica curta em hover e foco (portal com `position: fixed`, não é cortada por `overflow`).

| Prop | Tipo | Padrão |
|---|---|---|
| `content` | `string` | **obrigatório** |
| `children` | `ReactNode` | **obrigatório** (um elemento focável) |
| `side` | `'top' \| 'right' \| 'bottom'` | `'top'` |
| `disabled` | `boolean` | `false` |

```tsx
<Tooltip content="Agendado pelo Assistente IA"><IconButton icon={Bot} label="Origem: Assistente IA" /></Tooltip>
```

**Acessibilidade:** o filho recebe `aria-describedby`; Esc fecha.
**Não faça:** colocar informação essencial só no tooltip; envolver elementos não focáveis.

---

## Feedback e marca

### EmptyState

Estado vazio com anel dourado + ícone, título Cormorant 22, texto e CTA.

| Prop | Tipo | Padrão |
|---|---|---|
| `icon` | `LucideIcon` | **obrigatório** |
| `title` | `string` | **obrigatório** |
| `description` | `string` | **obrigatório** |
| `action` | `ReactNode` | — |
| `compact` | `boolean` | `false` (para tabelas e cards) |
| `className` | `string` | — |

```tsx
<EmptyState compact icon={UserRoundSearch} title="Nenhum paciente encontrado" description="Ajuste a busca ou os filtros." action={<Button variant="secondary" onClick={limpar}>Limpar filtros</Button>} />
```

**Não faça:** usar ilustrações coloridas ou emoji; deixar o vazio sem orientar o próximo passo.

### Skeleton

Bloco de carregamento graphite-100 com shimmer (decorativo, `aria-hidden`).

| Prop | Tipo | Padrão |
|---|---|---|
| `className` | `string` | — (padrão interno `h-4 w-full rounded-xs`) |

```tsx
<div aria-busy="true"><Skeleton className="h-6 w-40" /><Skeleton className="mt-2 h-4 w-64" /></div>
```

**Acessibilidade:** marque o contêiner com `aria-busy`.
**Não faça:** usar skeleton por mais de alguns segundos sem mensagem.

### Spinner

Anel dourado giratório (respeita `prefers-reduced-motion`, girando mais devagar).

| Prop | Tipo | Padrão |
|---|---|---|
| `size` | `number` | `20` |
| `label` | `string` | `'Carregando'` |
| `decorative` | `boolean` | `false` (não anuncia; use dentro de botões com `aria-busy`) |
| `className` | `string` | — |

```tsx
<Spinner label="Carregando conversas" />
```

**Não faça:** usar spinner em página inteira quando o layout é conhecido (prefira `Skeleton`).

### ProgressBar

| Prop | Tipo | Padrão |
|---|---|---|
| `value` | `number` (0–100, limitado e arredondado) | **obrigatório** |
| `label` | `string` | — |
| `tone` | `'gold' \| 'success' \| 'warning'` | `'gold'` |
| `showValue` | `boolean` | `true` quando há `label` |
| `size` | `'sm' \| 'md'` | `'md'` (6px / 8px) |
| `className` | `string` | — |

```tsx
<ProgressBar label="Ocupação da Sala 1" value={91} />
```

**Acessibilidade:** `role="progressbar"` com `aria-valuenow`/`min`/`max` e `aria-label`.
**Não faça:** passar frações (0–1); use porcentagem.

### Logo e LogoMark

| Prop (`Logo`) | Tipo | Padrão |
|---|---|---|
| `variant` | `'full' \| 'mark'` | `'full'` |
| `tone` | `'light' \| 'dark'` | `'light'` (`dark` para sidebar) |
| `size` | `number` | `40` (tamanho do símbolo) |
| `subtitle` | `string` | `'Gestão'` (use "Saúde Integral" em contextos institucionais) |
| `className` | `string` | — |

`LogoMark`: `{ size?: number = 40; title?: string = 'Humanittá'; decorative?: boolean = false }`.

```tsx
<Logo tone="dark" />
<LogoMark size={28} decorative />
```

**Acessibilidade:** no `full` o símbolo é decorativo e o wordmark é texto; no `mark` o SVG tem `role="img"` e `aria-label`.
**Não faça:** recolorir, distorcer ou aplicar o gradiente da marca em fundos.

### PageHeader

Cabeçalho do conteúdo: breadcrumb, título display, subtítulo e ações.

| Prop | Tipo | Padrão |
|---|---|---|
| `title` | `string` | **obrigatório** |
| `subtitle` | `string` | — |
| `actions` | `ReactNode` | — |
| `breadcrumb` | `string[]` | — |
| `as` | `'h1' \| 'h2'` | `'h2'` (o h1 fica no Header do AppShell) |
| `className` | `string` | — |

```tsx
<PageHeader title="Pacientes" subtitle="12 ativos · dados fictícios" breadcrumb={['Início', 'Pacientes']} actions={<Button leftIcon={UserPlus}>Novo paciente</Button>} />
```

**Não faça:** usar `as="h1"` dentro do AppShell (h1 duplicado).

### SectionTitle

| Prop | Tipo | Padrão |
|---|---|---|
| `title` | `string` | **obrigatório** |
| `overline` | `string` | — (caixa alta, gold-600) |
| `action` | `ReactNode` | — |
| `as` | `'h2' \| 'h3' \| 'h4'` | `'h3'` |
| `className` | `string` | — |

```tsx
<SectionTitle overline="Hoje" title="Fila de espera" action={<Button variant="ghost" size="sm">Ver todos</Button>} />
```

**Não faça:** pular níveis de título (h2 → h4).

---

## Gráficos

Todos são SVG/divs puros, sem dependências. Cores vêm dos tokens (gold para a marca, `SPECIALTY_COLOR` para especialidades). Valores em pt-BR.

### BarChart

Barras verticais; a barra em destaque usa gold-500 e as demais gold-200. Responsivo (mede a largura do contêiner).

| Prop | Tipo | Padrão |
|---|---|---|
| `data` | `BarChartDatum[]` (`{ label; value; highlight? }`) | **obrigatório** |
| `ariaLabel` | `string` | **obrigatório** |
| `formatValue` | `(v: number) => string` | `toLocaleString('pt-BR')` |
| `formatAxis` | `(v: number) => string` | `compactNumber` ("40 mil") |
| `height` | `number` | `240` |
| `className` | `string` | — |

Exporta `compactNumber(v)`.

```tsx
<BarChart ariaLabel="Faturamento mensal de 2026 (fictício)" data={meses.map((m) => ({ label: m.month, value: m.value, highlight: m.month === 'out' }))} formatValue={formatCurrency} />
```

**Acessibilidade:** `role="img"` + `aria-label`. Descreva o período e a unidade no `ariaLabel`; ofereça os números também em texto ou tabela quando forem decisivos.
**Não faça:** destacar mais de uma barra; usar cores de status nas barras.

### HorizontalBarList

Lista ranqueada com barras horizontais; o valor aparece sempre em texto e a barra é decorativa.

| Prop | Tipo | Padrão |
|---|---|---|
| `data` | `{ label: string; value: number; color: string }[]` | **obrigatório** |
| `formatValue` | `(v: number) => string` | pt-BR |
| `className` | `string` | — |

```tsx
<HorizontalBarList data={porEspecialidade.map((d) => ({ label: SPECIALTY_LABEL[d.specialty], value: d.count, color: SPECIALTY_COLOR[d.specialty] }))} />
```

**Não faça:** passar dados desordenados quando a leitura é de ranking.

### LineChart

Linhas com grade tracejada, legenda e tooltip ao passar o mouse.

| Prop | Tipo | Padrão |
|---|---|---|
| `labels` | `string[]` | **obrigatório** |
| `series` | `LineChartSeries[]` (`{ name; color; points: number[]; dashed? }`) | **obrigatório** |
| `ariaLabel` | `string` | **obrigatório** |
| `height` | `number` | `240` |
| `formatValue` | `(v: number) => string` | pt-BR |
| `formatAxis` | `(v: number) => string` | `compactNumber` |
| `showLegend` | `boolean` | quando há mais de uma série |
| `className` | `string` | — |

```tsx
<LineChart ariaLabel="Consultas por mês: 2026 vs. 2025" labels={reportMonths} series={[{ name: '2026', color: '#B5832F', points: atual }, { name: '2025', color: '#9E998F', points: anterior, dashed: true }]} />
```

**Acessibilidade:** `role="img"`; diferencie séries também por `dashed`, não só por cor.
**Não faça:** usar mais de 3 séries.

### DonutChart

Rosca com valor central (Cormorant) e legenda com valores e porcentagens.

| Prop | Tipo | Padrão |
|---|---|---|
| `data` | `{ label: string; value: number; color: string }[]` | **obrigatório** |
| `centerLabel` | `string` | **obrigatório** |
| `centerValue` | `string` | **obrigatório** |
| `size` | `number` | `180` |
| `showLegend` | `boolean` | `true` |
| `formatValue` | `(v: number) => string` | pt-BR |
| `className` | `string` | — |

```tsx
<DonutChart centerLabel="Receita" centerValue="R$ 48,9 mil" data={porMetodo} formatValue={formatCurrency} />
```

**Acessibilidade:** o `aria-label` do SVG é montado com todas as fatias e valores.
**Não faça:** usar com mais de 6 fatias ou valores negativos.

---

## Agenda

### AppointmentCard

Consulta em três formatos.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `appointment` | `Appointment` | **obrigatório** | |
| `variant` | `'block' \| 'row' \| 'compact'` | `'row'` | `block`: bloco na grade (fundo tingido pela especialidade); `row`: linha de lista; `compact`: uma linha (mês) |
| `onClick` | `() => void` | — | Vira `<button>` com rótulo completo |
| `selected` | `boolean` | `false` | Anel gold-500 |
| `className` | `string` | — | |

Exporta `formatTime(iso)` ("09:00") e `roomLabel(roomId)` ("Sala 3").
**Estados:** canceladas riscadas; canceladas e faltas com opacidade reduzida; ícone de IA quando `channel === 'assistente_ia'`.

```tsx
<AppointmentCard appointment={a} variant="block" onClick={() => abrir(a.id)} />
```

**Acessibilidade:** quando interativo, `aria-label` com horário, paciente, especialidade, profissional, sala e status.
**Não faça:** usar borda esquerda colorida para a especialidade; colocar botões dentro de um card interativo.

### MiniCalendar

Calendário mensal compacto (máx. 320px).

| Prop | Tipo | Padrão |
|---|---|---|
| `month` | `Date` (qualquer dia do mês) | **obrigatório** |
| `selected` | `Date` | — |
| `onSelect` | `(d: Date) => void` | — |
| `markedDays` | `number[]` (1–31) | `[]` |
| `onMonthChange` | `(d: Date) => void` | — (exibe as setas de mês) |
| `today` | `Date` | `new Date()` (passe `DEMO_TODAY` na demonstração) |
| `className` | `string` | — |

Exporta `MONTHS_PT` e `WEEKDAYS_PT`.

```tsx
<MiniCalendar month={DEMO_TODAY} today={DEMO_TODAY} selected={dia} onSelect={setDia} markedDays={[19, 20, 21]} onMonthChange={setMes} />
```

**Acessibilidade:** dias são botões com `aria-pressed`, `aria-current="date"` e rótulo "19 de outubro, com consultas".
**Não faça:** usar como único seletor de data em formulários (ofereça também `<input type="date">`).

### TimeSlot

Horário selecionável no novo agendamento.

| Prop | Tipo | Padrão |
|---|---|---|
| `time` | `string` | **obrigatório** |
| `state` | `'livre' \| 'ocupado' \| 'bloqueado' \| 'selecionado'` | **obrigatório** |
| `onClick` | `() => void` | — |
| `className` | `string` | — |

**Estados:** livre (hover dourado), selecionado (gold-600 + check), ocupado (riscado, desabilitado), bloqueado (listrado + cadeado, desabilitado).

```tsx
<TimeSlot time="10:30" state={sel === '10:30' ? 'selecionado' : 'livre'} onClick={() => setSel('10:30')} />
```

**Acessibilidade:** `aria-pressed` e rótulo "10:30 — livre".
**Não faça:** esconder horários ocupados (mostre como indisponíveis para dar contexto).

---

## Layouts

Importe de `@ds/layouts`. As telas (`screens/*`) não incluem o shell; o App envolve cada tela com `AppShell`.

### AppShell

Estrutura global das telas internas.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `active` | `AppRoute` | **obrigatório** | Item ativo da navegação (`RouteId` admin ou `PortalRouteId`) |
| `title` | `string` | **obrigatório** | Título do Header (h1) |
| `breadcrumb` | `string[]` | — | |
| `onNavigate` | `(id: AppRoute) => void` | — | Intercepta os links `#/rota` |
| `role` | `Role` | `'admin'` | Perfil logado: define sidebar, bottom-nav, usuário e busca. **Só apresentação** (ver `PERMISSIONS.md`) |
| `user` | `DemoUser` | `DEMO_USERS[role]` | Nome, cargo e iniciais exibidos |
| `onSignOut` | `() => void` | — | Item "Sair" do menu do usuário |
| `bleed` | `boolean` | `false` | Remove padding/max-width do `<main>` (telas full-bleed, ex.: WhatsApp) |
| `children` | `ReactNode` | **obrigatório** | |

**Comportamento:** lg+ sidebar fixa de 264px, recolhível para 76px (estado salvo no navegador); abaixo de lg a sidebar vira drawer; abaixo de md há bottom-nav e header compacto. Conteúdo com max-width 1440 e padding 32/24/16.

```tsx
<AppShell active="atendimentos" title="Atendimentos" breadcrumb={['Operação', 'Atendimentos']} onNavigate={setRoute}>
  <AttendancesScreen />
</AppShell>
```

**Acessibilidade:** landmarks `nav`, `header` e `main`; o menu móvel é um diálogo (`aria-modal`).
**Não faça:** colocar outro h1 na tela; aninhar AppShell.

### Sidebar

| Prop | Tipo | Padrão |
|---|---|---|
| `active` | `AppRoute` | **obrigatório** |
| `collapsed` | `boolean` | **obrigatório** |
| `onToggle` | `() => void` | **obrigatório** |
| `onNavigate` | `(id: AppRoute) => void` | — |
| `role` | `Role` | `'admin'` (itens de `NAV_BY_ROLE`; no perfil profissional exibe a pílula "Portal do Profissional") |
| `user` | `DemoUser` | usuário demo do perfil |
| `mode` | `'docked' \| 'overlay'` | `'docked'` (`overlay`: dentro do drawer móvel; botão vira "Fechar menu") |
| `className` | `string` | — |

Fundo graphite-900; item ativo com fundo dourado translúcido e ponto dourado à direita (sem barra lateral). Recolhida, mostra tooltips.

```tsx
<Sidebar active="agenda" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
```

**Acessibilidade:** `aria-current="page"` no item ativo; recolhida, cada link tem `aria-label` (com a contagem de novas mensagens, quando houver).
**Não faça:** usar fora do AppShell sem gerenciar o estado `collapsed`.

### Header

| Prop | Tipo | Padrão |
|---|---|---|
| `title` | `string` | **obrigatório** |
| `breadcrumb` | `string[]` | — |
| `onOpenMenu` | `() => void` | — (botão de menu abaixo de lg) |
| `date` | `Date` | hoje |
| `onSearch` | `(q: string) => void` | — |
| `className` | `string` | — |

Header branco de 72px (64px no celular), fixo no topo: título Cormorant, busca global (⌘K/Ctrl+K), selo "Ambiente de demonstração", data longa, notificações e menu do usuário. Exporta `formatLongDate(d)` → "Segunda, 19 de outubro de 2026".

```tsx
<Header title="Agenda" breadcrumb={['Operação', 'Agenda']} date={DEMO_TODAY} onSearch={buscar} />
```

**Não faça:** remover o selo de demonstração.

### MobileNav

| Prop | Tipo | Padrão |
|---|---|---|
| `active` | `RouteId` | **obrigatório** |
| `onNavigate` | `(id: RouteId) => void` | — |
| `onOpenMenu` | `() => void` | **obrigatório** |
| `className` | `string` | — |

Barra inferior abaixo de md: Dashboard, Agenda, Pacientes, WhatsApp e Menu (`MOBILE_NAV_IDS`). Alvos ≥ 44px.

```tsx
<MobileNav active="pacientes" onOpenMenu={() => setMenuOpen(true)} />
```

**Acessibilidade:** `<nav aria-label="Navegação rápida">`, `aria-current` no ativo.
**Não faça:** colocar mais de 5 itens.

### AuthLayout

| Prop | Tipo | Padrão |
|---|---|---|
| `children` | `ReactNode` | **obrigatório** |

lg+: painel de marca grafite à esquerda (anel e quarto-de-círculo dourados) e formulário à direita. Abaixo de lg: logo no topo e formulário centralizado. Inclui o selo de demonstração.

```tsx
<AuthLayout><LoginScreen /></AuthLayout>
```

**Não faça:** usar em telas internas.

### NAV_ITEMS, MOBILE_NAV_IDS, DEMO_USER

- `RouteId`: `'dashboard' | 'agenda' | 'pacientes' | 'profissionais' | 'atendimentos' | 'financeiro' | 'whatsapp' | 'assistente' | 'relatorios' | 'configuracoes'`.
- `NAV_ITEMS: NavItem[]` (`{ id; label; icon; badge? }`): ordem e ícones da sidebar (WhatsApp com `badge: 4`).
- `MOBILE_NAV_IDS: RouteId[]`: itens da bottom-nav.
- `DEMO_USER`: `{ name: 'Camila S.', role: 'Administradora', initials: 'CS' }` (fictício).

**Não faça:** duplicar a lista de navegação em outro arquivo; altere `nav.ts` para incluir rotas.


---

## Perfis e acesso (`@ds/access`)

Detalhes completos em `PERMISSIONS.md`.

| Export | Tipo | Uso |
|---|---|---|
| `Role` | `'admin' \| 'recepcao' \| 'profissional' \| 'financeiro'` | Perfil autenticado |
| `ROLES`, `ROLE_LABEL`, `ROLE_DESCRIPTION` | constantes | Rótulos e descrições |
| `Feature`, `FEATURES` | recursos agrupados (Operação, Clínico, Gestão, Sistema) | Linhas da matriz |
| `AccessLevel`, `ACCESS_LABEL` | `'nenhum' \| 'proprio' \| 'ver' \| 'editar' \| 'solicitar'` | Níveis |
| `PERMISSIONS` | `Record<Role, Record<Feature, AccessLevel>>` | Matriz padrão |
| `canAccess(role, feature, min?)` | `boolean` | Mostrar/ocultar na UI. **Nunca** usar como barreira de segurança |
| `inOwnScope(role, recordProfessionalId, currentProfessionalId?)` | `boolean` | Conferência de escopo na UI. Filtre também no servidor |

Navegação por perfil (`@ds/layouts`): `NAV_BY_ROLE`, `MOBILE_NAV_BY_ROLE`, `HOME_BY_ROLE`, `PORTAL_NAV_ITEMS`, `getNavItems(role)`, `getMobileNavItems(role)`, `DEMO_USERS`.

```tsx
const role: Role = session.role; // vem do servidor
<AppShell role={role} user={session.user} active={route} title={title} onNavigate={go}>
  {canAccess(role, 'financeiro', 'ver') ? <FinanceScreen /> : <AccessDenied onBack={() => go(HOME_BY_ROLE[role])} />}
</AppShell>
```

## Componentes do Portal do Profissional (`@ds/screens/professional-portal`)

| Componente | Props principais | Uso |
|---|---|---|
| `AccessDenied` | `onBack`, `title?`, `description?`, `backLabel?`, `showCode?` | Estado 403 (anel dourado + `ShieldAlert`) |
| `ScopeBadge` | — | Selo "Somente seus registros" (tom IA) nos cabeçalhos de lista |
| `ScopeInfoCard` | — | Explica por que o profissional vê só dados mínimos (LGPD) |
| `RequestChangeButton` | `enabled`, `onClick`, `label?`, `icon?`, `variant?` | Botão de solicitação. Desabilitado mostra tooltip com `REQUEST_DISABLED_REASON` |
| `RequestBlockModal` | `open`, `onClose`, `onSubmit(req)`, `appointments?`, `existingRequests?` | Solicitação de bloqueio ou alteração de disponibilidade com detecção de conflito |
| `BlockRequestList` / `BlockRequestStatusBadge` | `requests`, `limit?` | Lista de solicitações: enviada (warning), aprovada (success), recusada com motivo (danger) |
| `DayTimeline`, `WeekStrip` | ver código | Agenda do dia com livres tracejados; semana compacta com ocupação |
| `PortalAppointmentDrawer` | ver código | Detalhes da consulta **sem valores financeiros** |
| `FinishAttendanceModal` | `open`, `onClose`, `appointment`, `elapsedMin`, `onConfirm` | Finalizar atendimento com retorno sugerido |

**Não faça:** mostrar preço, saldo, CPF ou endereço completo em componentes do portal; reutilizar componentes administrativos que exibem dados financeiros.
