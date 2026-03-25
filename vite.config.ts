import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const mainHtml = fileURLToPath(new URL('./src/index.html', import.meta.url));
const identifyHtml = fileURLToPath(new URL('./src/identify.html', import.meta.url));

export default defineConfig({
  root: 'src',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: mainHtml,
        identify: identifyHtml,
      },
    },
  },
});
