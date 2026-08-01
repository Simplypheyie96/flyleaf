import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  /* TEMPORARY, with src/data/seed.ts — a link is no use if it opens on an
     empty library. This used to exempt production (Vercel sets VERCEL_ENV on
     every build it runs), so the live deployment came out with the seed
     compiled away.

     Every build seeds for now, production included, because the live app is
     what is being looked at and an empty shelf shows nothing. Nobody is using
     Flyleaf yet, so the only person who can be handed these five books is
     whoever is reviewing it.

     THIS MUST GO BEFORE ANYONE REAL SIGNS UP. Restore the guard by putting
     `process.env.VERCEL_ENV !== 'production' &&` back in front of the true
     below, or delete the seed outright — src/data/seed.ts says how. */
  define: {
    __PREVIEW_SEED__: JSON.stringify(true),
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
