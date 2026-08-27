import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// S7: the SPA is its own origin. Fetch calls go straight to the API host
// via web/src/apiBase.js (VITE_API_BASE_URL). No dev proxy needed.
export default defineConfig({
  plugins: [react()],
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
  },
});
