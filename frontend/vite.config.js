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
 * Local auth REST (or proxy to WordPress) so /wp-json/vibe-mart/v1/auth/*
 * works during `npm run dev` without embedding the React app in WP.
 *
 * Set WP_PROXY_TARGET=http://your-local-wordpress.test to forward all
 * /wp-json requests to a real WordPress + vibe-mart plugin install.
 */
function authDevApi() {
  const wpTarget = (process.env.WP_PROXY_TARGET || '').replace(/\/$/, '')

  return {
    name: 'vibe-mart-auth-dev-api',
    apply: 'serve',
    configureServer(server) {
      if (wpTarget) {
        console.info(`[vibe-mart] Proxying /wp-json → ${wpTarget}`)
        return
      }

      console.info(
        '[vibe-mart] Local auth + stalls mock enabled (no WP_PROXY_TARGET). Data: .local-data/'
      )

      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] || ''
        if (!urlPath.startsWith('/wp-json/vibe-mart/v1/')) {
          next()
          return
        }

        try {
          if (urlPath.startsWith('/wp-json/vibe-mart/v1/auth')) {
            const { default: handler } = await importDevModule('dev-server/authDevHandler.js')
            const handled = await handler(req, res)
            if (!handled) next()
            return
          }

          if (
            urlPath.startsWith('/wp-json/vibe-mart/v1/stalls') ||
            urlPath.startsWith('/wp-json/vibe-mart/v1/marketplace')
          ) {
            const { default: handler } = await importDevModule('dev-server/stallsDevHandler.js')
            const handled = await handler(req, res)
            if (!handled) next()
            return
          }

          next()
        } catch (error) {
          console.error('[dev wp-json]', error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: 'Local API middleware failed.', code: 'INTERNAL_ERROR' }))
          }
        }
      })
    },
  }
}

const wpProxyTarget = (process.env.WP_PROXY_TARGET || '').replace(/\/$/, '')

export default defineConfig({
  root: frontendRoot,
  plugins: [react(), removeBackgroundDevApi(), authDevApi()],
  // Assets resolve relative to the theme's app/ directory in WordPress.
  base: './',
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
          },
        }
      : {}),
  },
})
