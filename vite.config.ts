import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Pani',
        short_name: 'Pani',
        lang: 'fr',
        description: 'Ma liste de courses.',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,css,js,png,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
})
