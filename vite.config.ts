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
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
