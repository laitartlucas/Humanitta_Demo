import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
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
