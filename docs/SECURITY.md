# Humanittá Gestão — Segurança e riscos (estado da demonstração)

## 1. O que esta demonstração NÃO é

- **Não é autenticação.** O login escolhe um perfil fictício; qualquer senha entra. Não há token, sessão de servidor ou expiração.
- **Não é autorização de produção.** `useCan`, a guarda de rotas e o 403 dos serviços rodam **no navegador** e podem ser contornados por quem editar o `localStorage` ou o código. Eles **espelham** as regras que o backend deverá aplicar.
- **Não é armazenamento seguro.** Os dados ficam em texto puro no `localStorage`. **Nunca use dados reais de pacientes.**
- **Não está pronta para produção clínica.**

## 2. Regras aplicadas (espelho do futuro servidor)

| Regra | Onde | Teste |
|---|---|---|
| Menu e rotas por perfil; URL fora do perfil → 403; rota inexistente → página não encontrada | `src/app/ProtectedLayout.tsx` | `tests/e2e/routes.spec.ts` |
| Profissional vê só a própria agenda, pacientes (dados mínimos), atendimentos e repasses | `src/core/selectors`, `src/core/access` | `tests/core.contract.test.ts`, `tests/integration/main-flow.test.ts`, `tests/e2e/main-flow.spec.ts` |
| Prontuário: só o profissional responsável; admin/recepção/financeiro nunca (limite fixo de LGPD) | `core/access` (`LOCKED`), `selectClinicalRecords` | idem |
| Iniciar/finalizar atendimento: só o responsável, consulta pendente, no dia | `core/services/attendances.ts` | `tests/integration` |
| Escritas exigem nível `editar` do recurso (403) | todos os serviços do core | `tests/integration` (perfis sem permissão) |
| Sem cobrança duplicada por atendimento; sem pagamento duplicado | `core/services/finance.ts` | `tests/integration`, E2E |
| IA não responde em conversa assumida por humano | `core/services/messaging.ts` | `tests/integration`, `tests/e2e/whatsapp-ia.spec.ts` |
| Nenhuma chamada de rede além das fontes do design | — | `tests/e2e/whatsapp-ia.spec.ts` |

## 3. Requisitos para produção (pendentes, fora do escopo)

1. Backend com autenticação real (sessão httpOnly ou OIDC), 2FA opcional, expiração por inatividade.
2. Autorização no servidor em toda rota, derivando `role` e `professional_id` do token (nunca do cliente).
3. Políticas no banco (ex.: RLS `professional_id = auth.professional_id()`); prontuário em tabela própria com log de auditoria por leitura.
4. Criptografia em trânsito e em repouso; backups; política de retenção (LGPD).
5. Integrações reais (WhatsApp Business API, IA) somente no backend, com segredos fora do front-end.
6. Hospedar as fontes do design localmente (hoje vêm do Google Fonts, o que expõe o IP do visitante ao Google).

## 4. Dependências — `npm audit` (20/10/2026, após as atualizações)

Atualizações aplicadas sem mudança de versão major: `react-router-dom` 6.26.2 → **6.30.6**, `vite` 5.4.3 → **5.4.21**, `postcss` → **8.5.31**,
`@vitejs/plugin-react` → **4.7.0**, `@playwright/test` → **1.64.1**. Antes: 18 vulnerabilidades (3 altas em produção). Depois:

| Escopo | Resultado | Pacotes | Risco residual |
|---|---|---|---|
| **Produção** (`npm audit --omit=dev`) | **2 moderadas** | `react-router` / `react-router-dom` 6.30.6 (open redirect com barra invertida em `<Link>`/`useNavigate`; injeção em hidratação SSR) | Baixo: a app só navega para caminhos internos constantes e não usa SSR. Correção completa só na v7 (major) |
| Desenvolvimento | 2 críticas | `vitest` 2.1.9 → `tinypool` (prototype pollution nas opções do worker) | Só no executor de testes local/CI; corrigido no vitest 5 (major) |
| Desenvolvimento | altas/moderadas | `tailwindcss` 3.4.10 → `braces`, `micromatch`, `chokidar`, `fast-glob`, `postcss-selector-parser`; `vite`/`esbuild` (servidor de dev) | Só em tempo de build/dev; correções exigem Tailwind 4 / Vite 8 (major). **Tailwind mantido em 3.4.10**: a 3.4.19 não reduzia os alertas e alterava o CSS gerado |

Recomendação: planejar a migração para `vitest` 5, `vite` 6+ e `react-router` 7 numa etapa própria, com regressão visual; não usar `npm audit fix --force`.

## 5. Segredos e dados

- O repositório não contém credenciais, tokens nem chaves. Os e-mails `*@humanitta.demo` são fictícios.
- Todos os pacientes, valores, conversas e registros clínicos são fictícios. Apenas o nome e o registro profissional da Dra. Lauren Bertocchi são informação pública.
