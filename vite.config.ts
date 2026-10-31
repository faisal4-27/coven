import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync } from 'node:fs'
import { defineConfig } from 'vite'

/** Sound files actually present, so the app never requests a missing one (a 404 prints a console error). */
function sfxFiles(): string[] {
  try {
    return readdirSync('public/sfx').filter((f) => f.endsWith('.mp3'))
  } catch {
    return []
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Read at server start and build. Restart `npm run dev` after adding a file to public/sfx.
  define: { __SFX_FILES__: JSON.stringify(sfxFiles()) },
  // Pre-bundle deps that are only reached through lazy routes. Otherwise Vite discovers them on the first
  // visit to /vampire, re-optimizes and forces a full reload, which looks like the app hanging.
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', 'suncalc', '@clerk/react', 'zustand', 'react-router-dom', 'pdfjs-dist'],
  },
})
