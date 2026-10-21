# Humanittá Gestão — Publicação da demonstração (GitHub Pages)

> Esta é uma **demonstração comercial estática**: sem backend, sem autenticação real e com dados fictícios
> gravados no navegador. **Não use para dados reais de pacientes.**

## 1. Como o build está preparado

| Item | Configuração | Por quê |
|---|---|---|
| Caminhos | `vite.config.ts` → `base: './'` | Funciona em qualquer subcaminho (`https://<usuario>.github.io/<repositorio>/`) sem saber o nome do repositório |
| Rotas | `createHashRouter` (`#/agenda`) em `src/app/router.tsx` | GitHub Pages não tem fallback de SPA; com hash, recarregar qualquer tela funciona |
| Chunks | um por módulo + `vendor-react`, `vendor-router`, `vendor-icons` | Sem aviso de 500 kB; melhor cache entre publicações |
| Dados | `localStorage` (`humanitta:demo:db`, versão `SCHEMA_VERSION`) | Persistência local por navegador; nada é enviado a servidor |
| Externo | Somente Google Fonts (fontes do design) | Nenhuma API/backend é chamado |

## 2. Testar localmente como no GitHub Pages

```bash
npm ci
npm run build
npm run pages:serve        # http://localhost:4180/humanitta-gestao/  (404 fora do subcaminho, sem fallback)
npm run test:e2e           # Playwright contra esse servidor (desktop, tablet, smartphone)
```

## 3. Publicar (requer autorização do responsável)

1. Crie o repositório no GitHub e envie o código (o nome do repositório não precisa ser configurado no projeto):
   ```bash
   git remote add origin https://github.com/<usuario-ou-org>/<repositorio>.git
   git push -u origin integracao/agent-09    # ou main, depois de aprovado o merge
   ```
2. No repositório: **Settings › Pages › Build and deployment › Source = GitHub Actions**.
3. **Actions › "Deploy GitHub Pages" › Run workflow** e escolha a branch aprovada.
   O workflow (`.github/workflows/deploy-pages.yml`) só roda manualmente: `npm ci` → `npm run verify` → publica `dist/`.
4. Acesse `https://<usuario-ou-org>.github.io/<repositorio>/`.

Alternativa sem Actions: publicar o conteúdo de `dist/` em uma branch `gh-pages` (qualquer subcaminho funciona por causa de `base: './'`).

## 4. Informações ainda necessárias

- **Conta/organização e nome do repositório no GitHub** (não configurados neste repositório local — não há `remote`).
- **Repositório público ou privado**: GitHub Pages em repositório privado exige plano pago; a URL publicada é pública.
- **Domínio próprio** (opcional): exigiria `CNAME` e configuração de DNS.
- **Autorização** para o primeiro push e para executar o workflow de publicação.

## 5. Restaurar a demonstração

- Qualquer URL com `?reset-demo` antes do `#` (ex.: `https://.../<repositorio>/?reset-demo#/login`) recarrega a semente.
- Mudou o formato dos dados? Incremente `SCHEMA_VERSION` em `src/core/data/seed.ts`: todos os navegadores recarregam a semente na próxima visita.

## 6. Limitações do ambiente estático

- Os dados ficam **no navegador de quem acessa** (cada visitante tem sua própria cópia; limpar o navegador apaga).
- Não há login real: o seletor de perfil é parte da demonstração.
- WhatsApp e Assistente IA são **simulados** (nenhuma mensagem sai do navegador).
- O relógio da demo começa em 19/10/2026 10:24 e avança enquanto a página está aberta (até 8 h); recarregar volta para 10:24.
