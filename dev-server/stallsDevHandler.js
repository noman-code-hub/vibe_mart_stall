/**
 * Development-only stalls API mirroring `/wp-json/vibe-mart/v1/stalls*`.
 * Shares the auth cookie from authDevHandler (`vm_dev_session`).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '.local-data')
const STALLS_FILE = path.join(DATA_DIR, 'stalls.json')
const COOKIE_NAME = 'vm_dev_session'
const API_PREFIX = '/wp-json/vibe-mart/v1'

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function currentUserId(req) {
  const cookies = parseCookies(req.headers.cookie || '')
  const id = Number(cookies[COOKIE_NAME] || 0)
  return Number.isFinite(id) && id > 0 ? id : 0
}

async function loadStalls() {
  try {
    const raw = await readFile(STALLS_FILE, 'utf8')
    const data = JSON.parse(raw)
    const stalls = Array.isArray(data?.stalls) ? data.stalls : []
    let dirty = false
    for (const stall of stalls) {
      if (!Array.isArray(stall.products)) continue
      for (const product of stall.products) {
        const urls = (
          Array.isArray(product.image_urls) ? product.image_urls : []
        )
          .map((url) => String(url || '').trim())
          .filter(Boolean)
        if (!urls.length && product.image_url) {
          product.image_urls = [String(product.image_url)]
          dirty = true
        } else if (urls.length) {
          if (!Array.isArray(product.image_urls) || product.image_urls.length !== urls.length) {
            product.image_urls = urls
            dirty = true
          }
          if (!product.image_url) {
            product.image_url = urls[0]
            dirty = true
          }
        }
      }
    }
    if (dirty) await saveStalls(stalls)
    return stalls
  } catch {
    return []
  }
}

async function saveStalls(stalls) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(STALLS_FILE, JSON.stringify({ stalls }, null, 2), 'utf8')
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeStall(input, ownerId, existing = null) {
  const brand = String(input.brand_name || input.business_name || existing?.brand_name || '').trim()
  const statusRaw = String(input.status || existing?.status || 'draft')
  const status = statusRaw === 'published' ? 'published' : 'draft'

  return {
    id: existing?.id ?? 0,
    owner_id: existing?.owner_id ?? ownerId,
    brand_name: brand,
    seller_photo: String(input.seller_photo ?? existing?.seller_photo ?? ''),
    seller_bio: String(input.seller_bio ?? input.seller?.about ?? existing?.seller_bio ?? ''),
    ambition: String(input.ambition ?? input.seller?.ambition ?? existing?.ambition ?? ''),
    status,
    pitch_number: String(input.pitch_number ?? existing?.pitch_number ?? ''),
    pitch_location: String(input.pitch_location ?? existing?.pitch_location ?? ''),
    member_since: String(input.member_since ?? existing?.member_since ?? ''),
    badges: Array.isArray(input.badges)
      ? input.badges.map((b) => String(b).trim()).filter(Boolean)
      : existing?.badges || [],
    products: Array.isArray(input.products)
      ? input.products.slice(0, 6).map((p, index) => {
          const imageUrls = (
            Array.isArray(p.image_urls) && p.image_urls.length
              ? p.image_urls
              : Array.isArray(p.images) && p.images.length
                ? p.images
                : [p.image_url || p.image]
          )
            .map((url) => String(url || '').trim())
            .filter(Boolean)
            .slice(0, 6)

          return {
            id: p.id || index + 1,
            name: String(p.name || ''),
            condition: String(p.condition || p.label || p.variation || ''),
            label: String(p.label || p.condition || p.variation || ''),
            variation: String(p.variation || p.condition || p.label || ''),
            price: String(p.price || ''),
            description: String(p.description || ''),
            image_url: String(imageUrls[0] || p.image_url || p.image || ''),
            image_urls: imageUrls,
          }
        })
      : existing?.products || [],
    product_count: 0,
    created_at: existing?.created_at || nowIso(),
    updated_at: nowIso(),
  }
}

function publicStall(stall, withProducts = false) {
  const base = {
    id: stall.id,
    owner_id: stall.owner_id,
    brand_name: stall.brand_name,
    seller_photo: stall.seller_photo,
    seller_bio: stall.seller_bio,
    ambition: stall.ambition,
    status: stall.status,
    created_at: stall.created_at,
    updated_at: stall.updated_at,
    pitch_number: stall.pitch_number || '',
    pitch_location: stall.pitch_location || '',
    member_since: stall.member_since || '',
    product_count: Array.isArray(stall.products) ? stall.products.length : 0,
    badges: stall.badges || [],
    products: [],
  }
  if (withProducts) {
    base.products = (stall.products || []).map((product, index) => {
      const imageUrls = (
        Array.isArray(product.image_urls) && product.image_urls.length
          ? product.image_urls
          : [product.image_url || product.image]
      )
        .map((url) => String(url || '').trim())
        .filter(Boolean)

      return {
        ...product,
        id: product.id || index + 1,
        image_url: String(imageUrls[0] || product.image_url || ''),
        image_urls: imageUrls,
        images: imageUrls,
      }
    })
  }
  return base
}

/**
 * @returns {Promise<boolean>}
 */
export default async function stallsDevHandler(req, res) {
  const urlPath = req.url?.split('?')[0] || ''
  if (!urlPath.startsWith(`${API_PREFIX}/stalls`) && !urlPath.startsWith(`${API_PREFIX}/marketplace`)) {
    return false
  }

  const method = (req.method || 'GET').toUpperCase()
  const relative = urlPath.slice(API_PREFIX.length)

  try {
    const stalls = await loadStalls()
    const userId = currentUserId(req)

    if (relative === '/marketplace' && method === 'GET') {
      const url = new URL(req.url || '/', 'http://localhost')
      const search = String(url.searchParams.get('search') || '')
        .trim()
        .toLowerCase()
      let items = stalls.filter((s) => s.status === 'published')
      if (search) {
        items = items.filter(
          (s) =>
            String(s.brand_name || '')
              .toLowerCase()
              .includes(search) ||
            String(s.seller_bio || '')
              .toLowerCase()
              .includes(search)
        )
      }
      sendJson(res, 200, { items: items.map((s) => publicStall(s, true)) })
      return true
    }

    if (relative === '/stalls/mine' && method === 'GET') {
      if (!userId) {
        sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
        return true
      }
      const items = stalls
        .filter((s) => s.owner_id === userId)
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
        .map((s) => publicStall(s, false))
      sendJson(res, 200, { items })
      return true
    }

    if (relative === '/stalls' && method === 'POST') {
      if (!userId) {
        sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
        return true
      }
      const owned = stalls.filter((s) => s.owner_id === userId).length
      if (owned >= 5) {
        sendJson(res, 403, {
          code: 'vibe_mart_stall_limit',
          message: 'Maximum 5 Free Stalls.',
          data: { status: 403, limit: 5, count: owned },
        })
        return true
      }
      const body = await readBody(req)
      if ((body.status || 'draft') === 'published') {
        const seller = body.seller && typeof body.seller === 'object' ? body.seller : {}
        const missing = []
        if (!String(body.seller_photo || '').trim()) missing.push('seller photo')
        if (!String(body.seller_bio || seller.about || '').trim()) missing.push('bio')
        if (!String(body.ambition || seller.ambition || '').trim()) missing.push('ambition')
        if (!String(body.pitch_number || '').trim()) missing.push('pitch number')
        if (!String(body.pitch_location || '').trim()) missing.push('pitch location')
        if (!Array.isArray(body.products) || body.products.length < 1) missing.push('at least one product')
        if (!Array.isArray(body.badges) || body.badges.length < 1) missing.push('trust badge')
        if (missing.length) {
          sendJson(res, 400, {
            code: 'vibe_mart_invalid',
            message: `Cannot publish — missing: ${missing.join(', ')}.`,
          })
          return true
        }
      }
      const stall = normalizeStall(body, userId)
      if (!stall.brand_name) {
        sendJson(res, 400, { code: 'vibe_mart_invalid', message: 'Brand name is required.' })
        return true
      }
      stall.id = stalls.reduce((max, s) => Math.max(max, s.id), 0) + 1
      stall.product_count = stall.products.length
      stalls.push(stall)
      await saveStalls(stalls)
      const response = publicStall(stall, true)
      response.published = stall.status === 'published'
      response.message =
        stall.status === 'published' ? 'Stall published to the market.' : 'Stall saved as draft.'
      sendJson(res, 201, response)
      return true
    }

    const match = relative.match(/^\/stalls\/(\d+)$/)
    if (match) {
      const id = Number(match[1])
      const index = stalls.findIndex((s) => s.id === id)
      const stall = index >= 0 ? stalls[index] : null

      if (method === 'GET') {
        if (!stall) {
          sendJson(res, 404, { code: 'vibe_mart_not_found', message: 'Stall not found.' })
          return true
        }
        if (stall.status !== 'published' && stall.owner_id !== userId) {
          sendJson(res, 403, { code: 'vibe_mart_forbidden', message: 'This stall is not public.' })
          return true
        }
        sendJson(res, 200, publicStall(stall, true))
        return true
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!userId) {
          sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
          return true
        }
        if (!stall) {
          sendJson(res, 404, { code: 'vibe_mart_not_found', message: 'Stall not found.' })
          return true
        }
        if (stall.owner_id !== userId) {
          sendJson(res, 403, { code: 'vibe_mart_forbidden', message: 'You cannot edit this stall.' })
          return true
        }
        const body = await readBody(req)
        const updated = normalizeStall(body, userId, stall)
        updated.id = stall.id
        updated.product_count = updated.products.length
        stalls[index] = updated
        await saveStalls(stalls)
        sendJson(res, 200, publicStall(updated, true))
        return true
      }

      if (method === 'DELETE') {
        if (!userId) {
          sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
          return true
        }
        if (!stall) {
          sendJson(res, 404, { code: 'vibe_mart_not_found', message: 'Stall not found.' })
          return true
        }
        if (stall.owner_id !== userId) {
          sendJson(res, 403, { code: 'vibe_mart_forbidden', message: 'You cannot delete this stall.' })
          return true
        }
        stalls.splice(index, 1)
        await saveStalls(stalls)
        sendJson(res, 200, { ok: true })
        return true
      }
    }

    return false
  } catch (error) {
    console.error('[dev stalls]', error)
    sendJson(res, error.status || 500, {
      code: 'vibe_mart_dev_error',
      message: error.message || 'Local stalls API failed.',
    })
    return true
  }
}
