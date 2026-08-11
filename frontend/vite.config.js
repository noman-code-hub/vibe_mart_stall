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
 * Primary: `/api/vm/v1/*` (Vercel-safe; avoids WAF on `/wp-json/.../auth`).
 * Alias: `/wp-json/vibe-mart/v1/*` for WP-proxy compatibility.
 *
 * Set WP_PROXY_TARGET=http://your-local-wordpress.test to forward all
 * /wp-json and /api/vm requests to a real WordPress + vibe-mart plugin.
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

      const handleLocalApi = async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] || ''
        const vmPrefix = '/api/vm/v1/'
        const wpPrefix = '/wp-json/vibe-mart/v1/'
        let relative = ''

        if (urlPath.startsWith(vmPrefix)) {
          relative = urlPath.slice(vmPrefix.length)
          // Shared handlers match on the WP-style prefix.
          req.url = `/wp-json/vibe-mart/v1/${relative}${req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : ''}`
        } else if (urlPath.startsWith(wpPrefix)) {
          relative = urlPath.slice(wpPrefix.length)
        } else {
          next()
          return
        }

        try {
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

          next()
        } catch (error) {
          console.error('[dev api]', error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: 'Local API middleware failed.', code: 'INTERNAL_ERROR' }))
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
