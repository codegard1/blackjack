import netlify from '@netlify/vite-plugin';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // The Netlify plugin runs the functions in netlify/functions inside the dev server.
  // They read MONGODB_URI and MONGODB_DB from process.env, so load those from a local
  // .env file (ignored by git; see .env.example). In production Netlify provides them.
  const isDevServer = command === 'serve' && !process.env.VITEST;
  if (isDevServer) Object.assign(process.env, loadEnv(mode, process.cwd(), 'MONGODB_'));

  return {
    plugins: [
      react(),
      legacy({ targets: ['>0.2%', 'not dead', 'not op_mini all'] }),
      ...(isDevServer ? [netlify()] : []),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
});
