import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webSpatial from '@webspatial/vite-plugin'
import path from 'path'

const isSpatial = process.env.XR_ENV === 'avp'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    // Only apply WebSpatial plugin when building for visionOS (XR_ENV=avp).
    // Without this guard the plugin redirects localhost → /webspatial/avp/ in normal dev.
    isSpatial && webSpatial(),
    react({
      jsxImportSource: '@webspatial/react-sdk',
    }),
    tailwindcss(),
    // PWA manifest is served as a static file from public/manifest.webmanifest
    // so that webspatial-builder can find it at its default path.
  ],
})
