/**
 * Testes E2E (Agente 09): rodam contra o BUILD DE PRODUÇÃO servido como no GitHub Pages
 * (subcaminho /humanitta-gestao/, sem fallback de SPA) — valida roteamento por hash e caminhos relativos.
 *
 *   npm run test:e2e
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4180;
export const BASE_PATH = '/humanitta-gestao/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true }, grep: /@responsivo/ },
    { name: 'smartphone', use: { ...devices['Pixel 5'] }, grep: /@responsivo/ },
  ],
  webServer: {
    command: `npm run build && node scripts/serve-pages.mjs --port ${PORT} --base ${BASE_PATH}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
