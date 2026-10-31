import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import scanPantryHandler from './api/scan-pantry.ts'

// Groq + Grok local serverless bridge for /api/scan-pantry during `npm run dev`
function localApiPlugin(mode: string): Plugin {
  return {
    name: 'coven-local-api',
    configureServer(server) {
      server.middlewares.use('/api/scan-pantry', (req, res, next) => {
        if (req.url && req.url !== '/' && !req.url.startsWith('/?')) {
          next()
          return
        }

        const chunks: Buffer[] = []
        let totalBytes = 0

        req.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length
          if (totalBytes <= 6 * 1024 * 1024) {
            chunks.push(chunk)
          }
        })

        req.on('end', () => {
          void (async () => {
            try {
              const env = loadEnv(mode, process.cwd(), '')
              for (const key of [
                'GROK_API_KEY',
                'GROK_MODEL',
                'GROQ_API_KEY',
                'GROQ_MODEL',
                'XAI_API_KEY',
                'XAI_MODEL',
              ]) {
                if (env[key] !== undefined) {
                  process.env[key] = env[key]
                } else {
                  delete process.env[key]
                }
              }

              const rawBody = Buffer.concat(chunks).toString('utf8')

              let statusCode = 200
              const apiRes = {
                status(code: number) {
                  statusCode = code
                  return apiRes
                },
                json(payload: unknown) {
                  res.statusCode = statusCode
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify(payload))
                },
              }

              await scanPantryHandler({ method: req.method, body: rawBody }, apiRes)
            } catch (err) {
              console.error('[scan-pantry middleware error]', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  source: 'cached',
                  diagnostic:
                    err instanceof Error ? err.message : 'Local middleware error',
                  ingredients: [],
                })
              )
            }
          })()
        })
      })
    },
  }
}

/** Sound files actually present, so the app never requests a missing one (a 404 prints a console error). */
function sfxFiles(): string[] {
  try {
    return readdirSync('public/sfx').filter((f) => f.endsWith('.mp3'))
  } catch {
    return []
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), localApiPlugin(mode)],
  // Also expose Vercel's Clerk integration name (public key only).
  envPrefix: ['VITE_', 'NEXT_PUBLIC_CLERK_PUBLISHABLE'],
  // Read at server start and build. Restart `npm run dev` after adding a file to public/sfx.
  define: { __SFX_FILES__: JSON.stringify(sfxFiles()) },
  // Pre-bundle deps that are only reached through lazy routes. Otherwise Vite discovers them on the first
  // visit to /vampire, re-optimizes and forces a full reload, which looks like the app hanging.
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', 'suncalc', '@clerk/react', 'zustand', 'react-router-dom', 'pdfjs-dist'],
  },
}))
