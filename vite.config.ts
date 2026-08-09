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
     src/data/reset.ts is what takes those back off. */
  define: {
    __PREVIEW_SEED__: JSON.stringify(process.env.VERCEL_ENV !== 'production'),
    /* WHICH BUILD AM I LOOKING AT. Stamped in at build time and shown at the
       foot of Settings, because "I can't confirm if it hasn't synced or the fix
       is not working" is not a question anyone should have to answer by
       guessing. Two devices showing two different stamps is a delivery problem;
       two devices showing the same stamp and different behaviour is a bug. The
       readout is what tells them apart.

       The commit SHA when Vercel builds it — VERCEL_GIT_COMMIT_SHA is set on
       every Vercel build — and the date otherwise, so a local build still says
       something true rather than "unknown". */
    __BUILD__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
        `dev ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    ),
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
      // AUTOUPDATE. This line has been changed twice before, and the history is
      // the argument for why it stays here now — read it before changing it a
      // fourth time.
      //
      // It began as autoUpdate: a new worker takes over as soon as it is found
      // and the page reloads. That was changed to prompt on the owner's report,
      // "I can't seem to see the changes, and I can't confirm if it hasn't
      // synced or the fix is not working." A fair objection, and the real cost
      // of a silent swap: a reader hunting for a fix cannot tell "it has not
      // reached me" from "it reached me and did not work" — two problems with
      // completely different answers, made indistinguishable.
      //
      // Prompt answered that and bought a worse problem. A build reaches
      // `waiting` and sits there until a toast is tapped, and the toast can
      // only be tapped if it is on screen at the moment the worker settles. The
      // owner's report this time: "I refreshed and refreshed and refreshed
      // several times before I got the prompt, and that is not cool at all."
      // She is right. A delivery mechanism that depends on the reader being on
      // the right screen at the right instant is not a delivery mechanism.
      //
      // What breaks the deadlock is not a third guess at the default — it is
      // that the ORIGINAL objection now has its own answer, and does not need
      // this setting to carry it. settings/Recheck.tsx puts the version on the
      // page and a button beside it that asks the server outright. "Am I on the
      // fix yet" is answerable on demand, in words, whether or not anything
      // swapped quietly. So the reason prompt existed is served elsewhere, and
      // updates can go back to arriving by themselves.
      //
      // The remaining cost is a reload landing mid-scroll, and it is bounded:
      // the worker owns only its own Cache Storage. Every book, keep and draft
      // is in IndexedDB, which an update never touches. A reload loses your
      // place on a page and nothing else.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Flyleaf',
        short_name: 'Flyleaf',
        description:
          'A private companion for preserving your journey through every book you read.',
        /* Pinned rather than inferred. Without an explicit id the browser
           derives the app's identity from start_url, so the day start_url
           changes an installed copy is treated as a different app — a second
           icon on the home screen and the reader's journey apparently gone
           (it is not; it is in the other origin-scoped copy). Naming it once
           means start_url can move and the installed app stays the same app. */
        id: '/',
        start_url: '/',
        scope: '/',
        lang: 'en-GB',
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
