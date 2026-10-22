/**
 * Ensaio contra o SITE PUBLICADO (antes de uma apresentação):
 *   npm run demo:check            → só o roteiro da apresentação (≈1 min)
 *   npm run demo:check:full       → suíte E2E completa no site publicado (≈3 min)
 * URL padrão: https://laitarttech.com.br/Humanitta_Demo/ (sobrescreva com DEMO_URL=...).
 */
import { defineConfig, devices } from '@playwright/test';

const url = process.env.DEMO_URL ?? 'https://laitarttech.com.br/Humanitta_Demo/';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  use: { baseURL: url.endsWith('/') ? url : `${url}/`, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'smartphone', use: { ...devices['Pixel 5'] }, grep: /@responsivo/ },
  ],
});
