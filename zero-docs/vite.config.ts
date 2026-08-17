import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import { fileURLToPath, URL } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "src/**/*.{ts,tsx}"',
        useFlatConfig: true,
      },
      overlay: { initialIsOpen: false },
    }),
  ],
  resolve: {
    alias: { '@': src },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
  server: {
    host: true,
    port: 5174,
    strictPort: false,
    open: false,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === '1',
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
});
