import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const SERVER = 'http://localhost:4318';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 4319,
    proxy: {
      '/api': SERVER,
      '/preview': SERVER,
      '/ws': { target: SERVER, ws: true },
    },
  },
});
