import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
        background_color: '#F6F1E7',
        theme_color: '#F6F1E7',
        // Placeholder leaf-mark icons come with 01's design phase; the real
        // branded set lands in 08.
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
