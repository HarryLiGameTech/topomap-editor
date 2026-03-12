// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': {
//         target: 'http://topomap-store.hnrobert.space/',
//         changeOrigin: true,
//       },
//       // Proxy the GitHub OAuth initiation so browser navigation to /auth/github
//       // reaches the backend in development.
//       '/auth': {
//         target: 'http://topomap-store.hnrobert.space/',
//         changeOrigin: true,
//       },
//     },
//     host: '0.0.0.0'
//   },
// });

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://topomap-store.hnrobert.space'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Backend routes — proxied to Spring Boot
      '/auth/github': BACKEND,
      '/oauth2': BACKEND,
      '/login/oauth2': BACKEND,
      '/api': BACKEND,

      // ❌ /auth/callback is intentionally NOT proxied
      // It is a frontend route handled by React Router → AuthCallbackPage
    },
  },
})