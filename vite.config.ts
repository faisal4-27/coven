import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pre-bundle deps that are only reached through lazy routes. Otherwise Vite discovers them on the first
  // visit to /vampire, re-optimizes and forces a full reload, which looks like the app hanging.
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', 'suncalc', '@clerk/react', 'zustand', 'react-router-dom'],
  },
})
