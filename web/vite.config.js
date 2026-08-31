import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './vite-plugin-seo.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));

// S7: the SPA is its own origin. Fetch calls go straight to the API host
// via web/src/apiBase.js (VITE_API_BASE_URL). No dev proxy needed.
export default defineConfig(({ mode }) => ({
  // Only VITE_-prefixed values are read, so server secrets never reach the bundle.
  plugins: [react(), seoPlugin(loadEnv(mode, HERE, 'VITE_'))],
  root: '.',
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler', charset: false },
    },
  },
  server: {
    port: 5173,
    // Without this Vite hops to 5174 and shadows the docs container on localhost.
    strictPort: true,
  },
}));
