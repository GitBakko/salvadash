import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    TanStackRouterVite({
      // Ignore compiled .js/.d.ts artifacts that tsc -b emits alongside sources.
      // Without this, the generator chokes on .d.ts files (which export `Route`
      // as a type, not a CallExpression) and silently skips routeTree regeneration —
      // breaking lazy-route discovery.
      routeFileIgnorePattern: '\\.(js|d\\.ts|js\\.map|d\\.ts\\.map)$',
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        importScripts: ['sw-push.js', 'sw-sync.js'],

        // Precache: auto-generated from build output
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],

        // ── Runtime caching ────────────────────────────────
        runtimeCaching: [
          // Google Fonts stylesheets (cache-first, 30 days)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Google Fonts files (cache-first, 1 year)
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API GET requests (network-first, 5 min)
          {
            urlPattern: /\/api\/.*$/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // SPA navigation fallback
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'SalvaDash',
        short_name: 'SalvaDash',
        description: 'Personal savings tracker',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'utilities'],
        icons: [
          { src: '/pwa-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: '/pwa-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/pwa-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/pwa-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/pwa-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-router': ['@tanstack/react-router'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
