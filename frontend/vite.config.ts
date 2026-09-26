import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/my-shop-list/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/logo.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'My Shop List',
        short_name: 'Shop List',
        description: 'A shopping list backed by your own Google Drive.',
        start_url: '/my-shop-list/',
        scope: '/my-shop-list/',
        display: 'standalone',
        background_color: '#F8EFEA',
        theme_color: '#192F01',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Drive API and Google OAuth/token calls happen directly from app code
      // (offline queuing handled in src/offline), not through the service
      // worker cache — Workbox here only needs to cache the app shell, which
      // its default config already does.
    }),
  ],
})
