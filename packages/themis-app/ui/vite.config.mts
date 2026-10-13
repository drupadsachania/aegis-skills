import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Built at pack time into dist/ui; the runtime serves it as static files (no Vite at runtime).
// The shared Kairos tokens (design/tokens.css) are imported through the @design alias, so the
// dashboard bundle always carries the same tokens as the site: nothing is fetched at runtime.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@design': fileURLToPath(new URL('../../../design', import.meta.url)),
      // one copy of the logo icons: the site's public/brand folder (emitted as hashed files into dist/ui/assets)
      '@brand': fileURLToPath(new URL('../../../apps/web/public/brand', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../dist/ui', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,          // no data: URLs
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
  },
})
