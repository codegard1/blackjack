import netlify from '@netlify/vite-plugin';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // The Netlify plugin runs the functions in netlify/functions inside the dev server.
  // They read MONGODB_URI and MONGODB_DB from process.env, so load those from a local
  // .env file (ignored by git; see .env.example). In production Netlify provides them.
  const isDevServer = command === 'serve' && !process.env.VITEST;
  if (isDevServer) Object.assign(process.env, loadEnv(mode, process.cwd(), ['MONGODB_', 'OWNER_ID_', 'VITE_GOOGLE_']));

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        includeAssets: ['manifest.json'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/\.netlify\//],
        },
      }),
      ...(isDevServer ? [netlify({ edgeFunctions: { enabled: false } })] : []),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      outDir: 'dist',
      // The Fluent UI vendor chunk is about 560 kB minified (150 kB gzipped) and is cached
      // separately from the app, so warn only when a chunk grows well past that
      chunkSizeWarningLimit: 650,
      rolldownOptions: {
        output: {
          // Keep the libraries out of the app chunk: they change less often than the game,
          // so browsers can keep them cached across deploys
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 2 },
              { name: 'fluent', test: /node_modules[\\/](@fluentui|@griffel|tabster|keyborg|@floating-ui|@swc)[\\/]/, priority: 1 },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      pool: 'vmThreads',
      setupFiles: './src/setupTests.ts',
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}', 'netlify/**/*.ts'],
        exclude: ['**/*.test.{ts,tsx}', 'src/setupTests.ts', 'src/vite-env.d.ts'],
        reporter: ['text-summary', 'html'],
        // a little under the figures when coverage was first measured (93% of statements,
        // 87% of branches), so a change that leaves a lot untested fails the run
        thresholds: { statements: 90, branches: 85, functions: 88, lines: 90 },
      },
    },
  };
});
