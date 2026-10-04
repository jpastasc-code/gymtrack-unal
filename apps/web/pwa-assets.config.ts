import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// Genera los íconos de la PWA a partir de public/logo.svg (GYMTRACK en blanco sobre negro):
//   pnpm --filter web generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: '#000000' } },
    apple: { ...preset.apple, resizeOptions: { background: '#000000' } },
  },
  images: ['public/logo.svg'],
})
