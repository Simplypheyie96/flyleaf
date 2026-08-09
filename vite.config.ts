import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  /* TEMPORARY, with src/data/seed.ts — a link is no use if it opens on an
     empty library, so preview and dev builds lay down five books to look at.

     Production is exempt again, and this time it stays exempt. For a stretch
     every build seeded, live included, because the live link was what was
     being reviewed and nobody was using Flyleaf yet. Test users are being let
     in now, and a stranger's first shelf has to be their own — five invented
     books arriving in someone's library on the day they install the app is
     not a demo, it is somebody else's shelf in their house.

     Vercel sets VERCEL_ENV on every build it runs, so this is false only in
     the production build and true in dev and preview deployments. Turning the
     seed off does nothing for devices that already have the demo rows;
     src/data/unseed.ts is what takes those back off. */
  define: {
    __PREVIEW_SEED__: JSON.stringify(process.env.VERCEL_ENV !== 'production'),
  },
  /* Listen on the network, not just on loopback.

     This is a mobile-first app and it is reviewed on a phone, but `npm run dev`
     binds to localhost only — which resolves to the phone itself, so the phone
     gets nothing. Binding to every interface lets the phone open the dev server
     over the same wifi at http://<this-mac>:5173. Dev server only; it has no
     bearing on what Vercel builds or serves. */
  server: { host: true },
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate', not 'prompt'. Prompt was the polite choice and it did not
      // work: a new build reaches `waiting` and then sits there until someone
      // taps a toast, and on an installed iOS copy that toast is easy to never
      // see — the app is resumed rather than loaded, so the reader gets no
      // obvious moment where a refresh is being offered. The result was fixes
      // shipping to a device that stayed on a months-old build and a reader
      // reasonably concluding nothing had been fixed.
      //
      // autoUpdate swaps the new worker in as soon as one is found and reloads.
      // Cost: a reload can land mid-scroll. That cost is bounded because the
      // service worker owns only its own Cache Storage — every keep, book and
      // draft lives in IndexedDB, which an update never touches, so a reload
      // loses position on a page and nothing else.
      registerType: 'autoUpdate',
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
        /* Deliberately no mp3 here. The ambience beds are a quarter of a
           megabyte, and precaching makes every reader pay for them at install
           — including the ones who never turn the sound on. They are fetched
           the first time somebody actually plays a layer and cached from then
           on by the rule below, so the cost lands only on the readers who
           wanted it and offline still works from the second play onwards. */
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/ambience\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'flyleaf-ambience',
              expiration: { maxEntries: 8 },
              /* Audio is served with a 206 when the browser range-requests it;
                 without this workbox refuses to cache the partial and the file
                 is refetched on every single play. */
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
})
