import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Serves the same Vercel serverless handler under /api during local Vite dev,
 * so the frontend can keep calling /api/remove-background without Express.
 */
function removeBackgroundApiPlugin() {
  return {
    name: 'remove-background-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/remove-background') {
          next()
          return
        }

        try {
          const { default: handler } = await import('./api/remove-background.js')
          await handler(req, res)
        } catch (error) {
          console.error('[api/remove-background]', error)
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), removeBackgroundApiPlugin()],
  server: {
    // Pin the dev URL so it never drifts to 5174/5175 when a stale process
    // lingers. strictPort makes Vite fail loudly (instead of silently moving
    // ports) so you know to clear the old process.
    host: true, // listen on LAN so phones/other PCs can reach this machine
    port: 3000,
    strictPort: true,
  },
})
