import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import ATTRIBUTION from './src/attribution'

// Attribution banner — injected AFTER minification (generateBundle runs after
// esbuild renderChunk), so it survives into every production JS chunk and CSS
// asset no matter the minifier settings. /*! is a legal comment.
// Part of the LICENSE + NOTICE attribution layer.
const BANNER = `/*! ${ATTRIBUTION.product} · © ${new Date().getFullYear()} ${ATTRIBUTION.author} · ${ATTRIBUTION.url} · ${ATTRIBUTION.license} · sig:${ATTRIBUTION.signature} */\n`
const attributionBanner = () => ({
  name: 'attribution-banner',
  generateBundle(_, bundle) {
    for (const [fileName, file] of Object.entries(bundle)) {
      if (fileName.endsWith('.js') && file.type === 'chunk') {
        file.code = BANNER + file.code
      } else if (fileName.endsWith('.css') && file.type === 'asset') {
        file.source = BANNER + file.source
      }
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), attributionBanner()],
  // Dev proxy — mirrors the production nginx config (/api + /socket.io).
  // Absolute API calls (ENV.apiBaseUrl) are unaffected; this covers the
  // RELATIVE asset URLs the backend serves (e.g. avatar images
  // "/api/auth/avatar/<uuid>.png") which previously 200'd index.html on
  // :5173 and rendered broken (BUG-qa7-1).
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
})
