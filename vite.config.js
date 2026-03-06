import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Post-build: remove type="module" from script tag for file:// compatibility
function removeModuleType() {
  return {
    name: 'remove-module-type',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace('type="module" crossorigin', 'defer')
    },
  }
}

export default defineConfig({
  plugins: [vue(), removeModuleType()],
  base: process.env.VITE_BASE || './',
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
})
