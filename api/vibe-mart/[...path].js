/**
 * Vercel serverless catch-all for `/api/vibe-mart/*`.
 *
 * `vercel.json` rewrites `/wp-json/vibe-mart/v1/:path*` → here so the SPA can
 * keep the same REST paths used under WordPress.
 *
 * // WORDPRESS: production on WP uses wordpress-plugin/vibe-mart REST routes.
 * // When leaving Vercel testing, remove vercel.json API rewrites (or ask to
 * // restore WP-only deploy) — do not delete the plugin/theme folders.
 */
import authDevHandler from '../../dev-server/authDevHandler.js'
import stallsDevHandler from '../../dev-server/stallsDevHandler.js'

function pathFromQuery(pathQuery) {
  if (Array.isArray(pathQuery)) return pathQuery.filter(Boolean).join('/')
  if (typeof pathQuery === 'string' && pathQuery) return pathQuery
  return ''
}

export default async function handler(req, res) {
  const relative = pathFromQuery(req.query.path)
  const qsIndex = typeof req.url === 'string' ? req.url.indexOf('?') : -1
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : ''

  // Dev handlers match on the WordPress-style URL prefix.
  req.url = `/wp-json/vibe-mart/v1/${relative}${qs}`

  try {
    if (relative === 'auth' || relative.startsWith('auth/')) {
      const handled = await authDevHandler(req, res)
      if (!handled && !res.writableEnded) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ code: 'vibe_mart_not_found', message: 'Auth route not found.' }))
      }
      return
    }

    if (
      relative === 'marketplace' ||
      relative.startsWith('marketplace/') ||
      relative === 'stalls' ||
      relative.startsWith('stalls/')
    ) {
      const handled = await stallsDevHandler(req, res)
      if (!handled && !res.writableEnded) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ code: 'vibe_mart_not_found', message: 'Stalls route not found.' }))
      }
      return
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        code: 'vibe_mart_not_found',
        message: `Unknown route: ${relative || '(empty)'}`,
      })
    )
  } catch (error) {
    console.error('[vercel vibe-mart]', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          code: 'vibe_mart_vercel_error',
          message: error?.message || 'Vercel API failed.',
        })
      )
    }
  }
}
