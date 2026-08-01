import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  /* TEMPORARY, with src/data/seed.ts — a preview link is no use if it opens on
     an empty library, but a real reader must never be handed somebody else's
     books. Vercel sets VERCEL_ENV on every build it runs ('production',
     'preview' or 'development'), so the production deployment is the one build
     that comes out with the seed compiled away. Locally the variable is unset,
     which reads as not-production, and `npm run dev` seeds too. */
  define: {
    __PREVIEW_SEED__: JSON.stringify(process.env.VERCEL_ENV !== 'production'),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': new versions download in the background and wait for the
      // user's "tap to refresh" — no forced reload. The service worker only
      // manages its own Cache Storage; IndexedDB is never touched by updates.
      registerType: 'prompt',
      manifest: {
        name: 'Flyleaf',
        short_name: 'Flyleaf',
        description:
          'A private companion for preserving your journey through every book you read.',
        start_url: '/',
        display: 'standalone',
        background_color: '#c2e4f8',
        theme_color: '#c2e4f8',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
