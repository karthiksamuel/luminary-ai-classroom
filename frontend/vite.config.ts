import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webSpatial from '@webspatial/vite-plugin'
import { createHtmlPlugin } from 'vite-plugin-html'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv with '' prefix reads ALL env vars including XR_ENV set via CLI
  const env = loadEnv(mode, '.', '')
  const xrEnv = env['XR_ENV']

  return {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
    plugins: [
      webSpatial(),
      react(),
      tailwindcss(),
      createHtmlPlugin({
        inject: {
          data: { XR_ENV: xrEnv },
        },
      }),
    ],
  }
})
