/**
 * Vercel serverless API at `/api/vm/*`.
 *
 * Avoids `/wp-json/.../auth/*` which Vercel WAF mitigates with HTTP 403.
 * Handlers still see WordPress-style URLs so auth/stalls mocks stay shared.
 */
import authDevHandler from '../../dev-server/authDevHandler.js'
import stallsDevHandler from '../../dev-server/stallsDevHandler.js'

function resolveRelative(req) {
  let fromQuery = req.query?.path
  if (Array.isArray(fromQuery)) fromQuery = fromQuery.filter(Boolean).join('/')
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.replace(/^\/+|\/+$/g, '')
  }

  const raw = decodeURIComponent(String(req.url || '').split('?')[0] || '')
  const markers = ['/api/vm/', '/api/vibe-mart/', '/wp-json/vibe-mart/v1/']
  for (const marker of markers) {
    const idx = raw.indexOf(marker)
    if (idx !== -1) {
      return raw.slice(idx + marker.length).replace(/^\/+|\/+$/g, '')
    }
  }
  return ''
}

export default async function handler(req, res) {
  const relative = resolveRelative(req)
  const qsIndex = typeof req.url === 'string' ? req.url.indexOf('?') : -1
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : ''

  // Shared local handlers expect the WordPress REST prefix.
  req.url = `/wp-json/vibe-mart/v1/${relative}${qs}`

  try {
    if (!relative) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ code: 'vibe_mart_not_found', message: 'Missing API path.' }))
      return
    }

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
        message: `Unknown route: ${relative}`,
      })
    )
  } catch (error) {
    console.error('[vercel /api/vm]', error)
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
