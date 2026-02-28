import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webSpatial from '@webspatial/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    webSpatial(),
    react({
      jsxImportSource: '@webspatial/react-sdk',
    }),
    tailwindcss(),
    VitePWA({
      manifest: {
        name: 'Luminary',
        short_name: 'Luminary',
        description: 'A private AI teacher, for any subject, for any student, anywhere in the world.',
        start_url: '/',
        scope: '/',
        display: 'minimal-ui',
        background_color: '#0d0d1a',
        theme_color: '#1a0a2e',
        icons: [
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-1024-maskable.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectRegister: false,
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
