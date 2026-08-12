/**
 * Vercel serverless API — single entry at `/api/vm?path=auth/session`.
 *
 * Multi-segment `/api/vm/[...path]` did not route on this project’s Vercel
 * static+functions setup (only `/api/vm/marketplace` worked). Query routing
 * is reliable. Also avoids WAF denials on `/wp-json/.../auth/*`.
 */
import authDevHandler from '../dev-server/authDevHandler.js'
import stallsDevHandler from '../dev-server/stallsDevHandler.js'
import contactDevHandler from '../dev-server/contactDevHandler.js'
import { readJsonBody } from '../dev-server/readJsonBody.js'

export const config = {
  api: {
    bodyParser: true,
  },
}

function resolveRelative(req) {
  let fromQuery = req.query?.path
  if (Array.isArray(fromQuery)) fromQuery = fromQuery.filter(Boolean).join('/')
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.replace(/^\/+|\/+$/g, '')
  }

  const raw = decodeURIComponent(String(req.url || '').split('?')[0] || '')
  const markers = ['/api/vm/', '/api/vm']
  for (const marker of markers) {
    if (raw === marker || raw === `${marker}/`) return ''
    const idx = raw.indexOf(marker.endsWith('/') ? marker : `${marker}/`)
    if (idx !== -1) {
      const start = idx + (marker.endsWith('/') ? marker.length : marker.length + 1)
      return raw.slice(start).replace(/^\/+|\/+$/g, '')
    }
  }
  return ''
}

export default async function handler(req, res) {
  const relative = resolveRelative(req)
  const qsIndex = typeof req.url === 'string' ? req.url.indexOf('?') : -1
  const search = new URLSearchParams(qsIndex >= 0 ? req.url.slice(qsIndex + 1) : '')
  search.delete('path')
  const qs = search.toString() ? `?${search.toString()}` : ''

  req.url = `/wp-json/vibe-mart/v1/${relative}${qs}`

  try {
    // Ensure JSON body is available for auth/contact POST handlers.
    if (!Object.prototype.hasOwnProperty.call(req, 'body') || req.body === undefined) {
      req.body = await readJsonBody(req)
    }

    if (!relative) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, service: 'vibe-mart-api' }))
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

    if (relative === 'contact') {
      const handled = await contactDevHandler(req, res)
      if (!handled && !res.writableEnded) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ code: 'vibe_mart_not_found', message: 'Contact route not found.' }))
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
