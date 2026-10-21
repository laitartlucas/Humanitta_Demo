import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Caminhos relativos: o build funciona em qualquer subcaminho (ex.: https://<usuario>.github.io/<repositorio>/)
  // sem precisar conhecer o nome do repositório. Exige roteamento por hash (src/app/router.tsx).
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@ds', replacement: r('./design_system') },
      { find: /^@core$/, replacement: r('./src/core/index.ts') },
      { find: '@core', replacement: r('./src/core') },
      { find: '@app', replacement: r('./src/app') },
      { find: '@modules', replacement: r('./src/modules') },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas em chunks próprios: o código da aplicação muda a cada PR, os vendors não (melhor cache).
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          // Um chunk por área de módulo (telas do DS + container em src/modules).
          const screen = /design_system\/screens\/([^/]+)\//.exec(norm)?.[1];
          if (screen) return `mod-${screen}`;
          const mod = /src\/modules\/([^/]+)\//.exec(norm)?.[1];
          if (mod) return `mod-${mod}`;
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/.test(id)) return 'vendor-router';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
