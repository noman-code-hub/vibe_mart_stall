/**
 * Vercel serverless proxy for POST /api/remove-background.
 * Mirrors local Vite middleware; requires REMOVE_BG_API_KEY in Vercel env.
 *
 * // WORDPRESS: production uses the plugin REST route instead.
 */
import removeBackgroundDevHandler from '../dev-server/removeBackgroundDevHandler.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' }))
    return
  }

  try {
    await removeBackgroundDevHandler(req, res)
  } catch (error) {
    console.error('[vercel remove-background]', error)
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
}
