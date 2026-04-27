import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update silently on next nav (Phase 9 decision).
      registerType: 'autoUpdate',
      // We already have a manifest in public/; let the plugin own it instead
      // (avoid drift). The plugin will inject <link rel="manifest"> automatically.
      injectRegister: 'auto',
      includeAssets: ['logo/trajectory.png'],
      manifest: {
        name: 'Trajectory',
        short_name: 'Trajectory',
        description:
          'Track medical, dental, and vision appointments and growth metrics for your kids.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f5f5',
        theme_color: '#2563eb',
        categories: ['health', 'medical', 'lifestyle'],
        icons: [
          {
            src: '/logo/trajectory.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo/trajectory.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Precache the app shell (HTML, JS, CSS, fonts, icons).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Allow precaching the lazy-loaded route chunks too.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // SPA navigation fallback so deep links work offline.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Read-only API GETs for core entities — stale-while-revalidate
          // gives instant offline reads while refreshing in the background.
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /^\/api\/(children|visits|illnesses|measurements|families)(\/|\?|$)/.test(
                url.pathname,
              ),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-core-entities',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Avatar/attachment images — cache-first, opaque-OK.
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /^\/api\/(avatars|attachments)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Disable SW in dev to avoid HMR/cache surprises.
        enabled: false,
      },
    }),
  ],
  // Base path for assets and routing (set via VITE_BASE_PATH env var)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5017,
    proxy: {
      '/api': {
        target: 'http://localhost:5018',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@features': resolve(__dirname, 'src/features'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@lib': resolve(__dirname, 'src/shared/lib'),
      '@visit-form': resolve(__dirname, 'src/features/visits/visit-form'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into their own chunks so the main
        // app chunk stays small and vendor chunks can be cached separately.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-recharts';
          if (
            id.includes('/react-icons/') ||
            id.includes('/@hugeicons/')
          ) return 'vendor-icons';
          if (id.includes('/react-easy-crop/')) return 'vendor-crop';
          if (id.includes('/date-fns/')) return 'vendor-date-fns';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/scheduler/')
          ) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true,
  },
});
