import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Built at pack time into dist/ui; the runtime serves it as static files (no Vite at runtime).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../dist/ui', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,          // no data: URLs
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
  },
})
