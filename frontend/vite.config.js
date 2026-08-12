import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const frontendRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(frontendRoot, '..')

dotenv.config({ path: path.join(frontendRoot, '.env') })
dotenv.config({ path: path.join(projectRoot, '.env') })

/** Windows-safe dynamic import for absolute paths. */
function importDevModule(relativeFromProject) {
  const absolute = path.join(projectRoot, relativeFromProject)
  return import(pathToFileURL(absolute).href)
}

/**
 * Local-only remove.bg proxy for `npm run dev`.
 * Production uses the WordPress plugin REST route.
 */
function removeBackgroundDevApi() {
  return {
    name: 'remove-background-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0]
        if (urlPath !== '/api/remove-background') {
          next()
          return
        }

        try {
          const { default: handler } = await importDevModule(
            'dev-server/removeBackgroundDevHandler.js'
          )
          await handler(req, res)
        } catch (error) {
          console.error('[dev api/remove-background]', error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'Something went wrong while removing the background.',
                code: 'INTERNAL_ERROR',
              })
            )
          }
        }
      })
    },
  }
}

/**
 * Local auth + stalls REST (or proxy to WordPress).
 *
 * Primary: `/api/vm?path=...` (matches Vercel serverless).
 * Alias: `/api/vm/v1/*` and `/wp-json/vibe-mart/v1/*` path style.
 */
function authDevApi() {
  const wpTarget = (process.env.WP_PROXY_TARGET || '').replace(/\/$/, '')

  return {
    name: 'vibe-mart-auth-dev-api',
    apply: 'serve',
    configureServer(server) {
      if (wpTarget) {
        console.info(`[vibe-mart] Proxying /wp-json and /api/vm → ${wpTarget}`)
        return
      }

      console.info(
        '[vibe-mart] Local auth + stalls mock enabled (no WP_PROXY_TARGET). Data: .local-data/'
      )

      /** Buffer POST/PUT bodies before any await — otherwise the stream ends empty. */
      async function bufferRequestBody(req) {
        if (req.body !== undefined) return
        const method = (req.method || 'GET').toUpperCase()
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
          req.body = {}
          return
        }

        const chunks = []
        for await (const chunk of req) {
          chunks.push(chunk)
        }
        const raw = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '').trim()
        if (!raw) {
          req.body = {}
          return
        }
        try {
          req.body = JSON.parse(raw)
        } catch {
          const err = Object.assign(new Error('Invalid JSON body.'), { status: 400 })
          throw err
        }
      }

      const handleLocalApi = async (req, res, next) => {
        const rawUrl = req.url || '/'
        const urlPath = rawUrl.split('?')[0] || ''
        const query = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
        const params = new URLSearchParams(query)

        let relative = ''
        if (urlPath === '/api/vm' || urlPath === '/api/vm/') {
          relative = String(params.get('path') || '').replace(/^\/+|\/+$/g, '')
        } else if (urlPath.startsWith('/api/vm/v1/')) {
          relative = urlPath.slice('/api/vm/v1/'.length)
        } else if (urlPath.startsWith('/wp-json/vibe-mart/v1/')) {
          relative = urlPath.slice('/wp-json/vibe-mart/v1/'.length)
        } else {
          next()
          return
        }

        params.delete('path')
        const qs = params.toString() ? `?${params.toString()}` : ''
        req.url = `/wp-json/vibe-mart/v1/${relative}${qs}`

        try {
          await bufferRequestBody(req)

          if (relative.startsWith('auth')) {
            const { default: handler } = await importDevModule('dev-server/authDevHandler.js')
            const handled = await handler(req, res)
            if (!handled) next()
            return
          }

          if (relative.startsWith('stalls') || relative.startsWith('marketplace')) {
            const { default: handler } = await importDevModule('dev-server/stallsDevHandler.js')
            const handled = await handler(req, res)
            if (!handled) next()
            return
          }

          if (relative === 'contact') {
            const { default: handler } = await importDevModule('dev-server/contactDevHandler.js')
            const handled = await handler(req, res)
            if (!handled) next()
            return
          }

          next()
        } catch (error) {
          console.error('[dev api]', error)
          if (!res.headersSent) {
            res.statusCode = error.status || 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                message: error.message || 'Local API middleware failed.',
                code: error.status === 400 ? 'vibe_mart_invalid' : 'INTERNAL_ERROR',
              })
            )
          }
        }
      }

      server.middlewares.use(handleLocalApi)
    },
  }
}

const wpProxyTarget = (process.env.WP_PROXY_TARGET || '').replace(/\/$/, '')

export default defineConfig({
  root: frontendRoot,
  plugins: [react(), removeBackgroundDevApi(), authDevApi()],
  // WORDPRESS theme embed: relative assets (`./`) under theme assets/app/.
  // Vercel root deploy: absolute `/` so client routes like /market resolve assets.
  // (VERCEL=1 is set during `vercel build`.)
  base: process.env.VERCEL ? '/' : './',
  build: {
    target: 'es2020',
    outDir: path.join(projectRoot, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    manifest: 'manifest.json',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    ...(wpProxyTarget
      ? {
          proxy: {
            '/wp-json': {
              target: wpProxyTarget,
              changeOrigin: true,
              secure: false,
            },
            '/api/vm': {
              target: wpProxyTarget,
              changeOrigin: true,
              secure: false,
              rewrite: (p) => p.replace(/^\/api\/vm\/v1/, '/wp-json/vibe-mart/v1'),
            },
          },
        }
      : {}),
  },
})
