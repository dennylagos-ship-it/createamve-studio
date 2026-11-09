import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const demo = process.env.VITE_DEMO === '1'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: demo,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo-negativo.webp'],
      manifest: {
        name: 'CREATEAMVE Studio',
        short_name: 'Studio',
        description: 'Centro de producción audiovisual de Createamve',
        lang: 'es',
        theme_color: '#0C0C10',
        background_color: '#0C0C10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}'],
      },
    }),
  ],
})
