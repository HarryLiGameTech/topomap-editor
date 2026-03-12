import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://topomap-store.hnrobert.space/',
        changeOrigin: true,
      },
      // Proxy the GitHub OAuth initiation so browser navigation to /auth/github
      // reaches the backend in development.
      '/auth': {
        target: 'http://topomap-store.hnrobert.space/',
        changeOrigin: true,
      },
    },
  },
});
