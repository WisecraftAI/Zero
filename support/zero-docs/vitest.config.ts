import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Vitest owns its own Vite instance internally, so we intentionally keep this
// file minimal and let vite.config.ts stay purely production-facing.
// Path alias is duplicated here on purpose (single-source lives in vite.config.ts + tsconfig).
const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': src },
  },
  css: {
    preprocessorOptions: { scss: { api: 'modern-compiler' } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
    },
  },
});
