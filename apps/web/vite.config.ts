/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const COLOR_BLANCO = '#FFFFFF'

// `pnpm demo` (scripts/demo/iniciar.mjs): la web reenvía /api y /auth/v1 al API y al simulador
// de auth locales, así la app completa se usa desde un solo puerto (también en GitHub Codespaces).
const DEMO = process.env.GYMTRACK_DEMO === '1'
const CODESPACES = process.env.CODESPACES === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El usuario decide cuándo actualizar (ver src/components/AvisoActualizacion.tsx),
      // para no recargar la app a mitad de un entrenamiento.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'GymTrack UNAL',
        short_name: 'GymTrack',
        description: 'Rutinas, registro de entrenamiento y reservas del gimnasio de la Universidad Nacional.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: COLOR_BLANCO,
        background_color: COLOR_BLANCO,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
        // Las rutas del cliente (p. ej. /rutina) funcionan sin conexión; /api nunca se sirve desde caché.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: DEMO
    ? {
        port: 5173,
        strictPort: true,
        // En Codespaces el reenvío de puertos no llega a "localhost" del contenedor (daba 502):
        // se escucha en todas las interfaces. En tu computador sigue solo en localhost.
        host: CODESPACES ? true : undefined,
        allowedHosts: ['.app.github.dev'],
        // En Codespaces la página llega por HTTPS en el puerto 443.
        hmr: CODESPACES ? { clientPort: 443 } : undefined,
        proxy: {
          '/api': 'http://127.0.0.1:3000',
          '/auth/v1': 'http://127.0.0.1:54321',
        },
      }
    : undefined,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})
