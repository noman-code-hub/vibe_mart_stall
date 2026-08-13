/**
 * Auth API mirroring `/wp-json/vibe-mart/v1/auth/*`.
 *
 * Used by:
 * - `npm run dev` (Vite middleware) when WP_PROXY_TARGET is unset
 * - Vercel serverless (`api/vibe-mart/[...path].js`) for temporary deploys
 *
 * // WORDPRESS: real production uses wordpress-plugin/vibe-mart REST auth routes.
 * // Keep that plugin intact; this file is the Vercel/local stand-in only.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { getLocalDataDir, isVercelRuntime } from './localDataDir.js'
import { readJsonBody } from './readJsonBody.js'

const DATA_DIR = getLocalDataDir()
const USERS_FILE = path.join(DATA_DIR, 'traders.json')
const COOKIE_NAME = 'vm_dev_session_v2'
const AUTH_PREFIX = '/wp-json/vibe-mart/v1/auth'

function sendJson(res, status, body, extraHeaders = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value)
  }
  res.end(JSON.stringify(body))
}

function hashPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex')
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
  return readJsonBody(req)
}

async function loadUsers() {
  try {
    const raw = await readFile(USERS_FILE, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.users) ? data.users : []
  } catch {
    return []
  }
}

async function saveUsers(users) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), 'utf8')
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    role: 'trader',
    business_name: user.business_name || '',
    phone: user.phone || '',
    bio: user.bio || '',
    location: user.location || '',
    nonce: 'dev-nonce',
  }
}

function sessionCookie(userId, remember = true) {
  const maxAge = remember ? 60 * 60 * 24 * 14 : undefined
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(String(userId))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isVercelRuntime()) parts.push('Secure')
  if (maxAge) parts.push(`Max-Age=${maxAge}`)
  return parts.join('; ')
}

function clearSessionCookie() {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (isVercelRuntime()) parts.push('Secure')
  return parts.join('; ')
}

function passwordsMatch(storedHash, salt, password) {
  const next = Buffer.from(hashPassword(password, salt), 'utf8')
  const prev = Buffer.from(storedHash, 'utf8')
  if (next.length !== prev.length) return false
  return timingSafeEqual(next, prev)
}

/**
 * @returns {Promise<boolean>} true if this request was handled
 */
export default async function authDevHandler(req, res) {
  const urlPath = req.url?.split('?')[0] || ''
  if (!urlPath.startsWith(AUTH_PREFIX)) {
    return false
  }

  const route = urlPath.slice(AUTH_PREFIX.length).replace(/\/$/, '') || '/'
  const method = (req.method || 'GET').toUpperCase()

  try {
    const users = await loadUsers()
    const cookies = parseCookies(req.headers.cookie || '')
    const sessionId = Number(cookies[COOKIE_NAME] || 0)
    const current = users.find((u) => u.id === sessionId) || null

    if (route === '/session' && method === 'GET') {
      if (!current) {
        sendJson(res, 200, { authenticated: false, user: null, nonce: 'dev-nonce' })
        return true
      }
      const payload = publicUser(current)
      const { nonce, ...user } = payload
      sendJson(res, 200, { authenticated: true, user, nonce })
      return true
    }

    if (route === '/register' && method === 'POST') {
      const body = await readBody(req)
      const username = String(body.username || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const displayName = String(body.display_name || username).trim()

      if (!username) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'Username is required.',
        })
        return true
      }
      if (!email) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'Email is required.',
        })
        return true
      }
      if (password.length < 8) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'Password must be at least 8 characters.',
        })
        return true
      }
      if (users.some((u) => u.username === username || u.email === email)) {
        sendJson(res, 409, {
          code: 'vibe_mart_exists',
          message: 'That username or email is already registered.',
        })
        return true
      }

      const salt = randomBytes(8).toString('hex')
      const user = {
        id: users.reduce((max, u) => Math.max(max, u.id), 0) + 1,
        username,
        email,
        display_name: displayName,
        password_hash: hashPassword(password, salt),
        password_salt: salt,
        business_name: String(body.business_name || '').trim(),
        phone: String(body.phone || '').trim(),
        bio: String(body.bio || '').trim(),
        location: String(body.location || '').trim(),
      }
      users.push(user)
      await saveUsers(users)
      sendJson(res, 201, publicUser(user), { 'Set-Cookie': sessionCookie(user.id, true) })
      return true
    }

    if (route === '/login' && method === 'POST') {
      const body = await readBody(req)
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      const remember = body.remember !== false

      if (!username || !password) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'Enter your username and password.',
        })
        return true
      }

      const user = users.find(
        (u) => u.username === username || u.email === username.toLowerCase()
      )
      if (!user || !passwordsMatch(user.password_hash, user.password_salt, password)) {
        sendJson(res, 403, {
          code: 'vibe_mart_login_failed',
          message: 'Invalid username or password.',
        })
        return true
      }

      sendJson(res, 200, publicUser(user), { 'Set-Cookie': sessionCookie(user.id, remember) })
      return true
    }

    if (route === '/logout' && method === 'POST') {
      sendJson(res, 200, { ok: true, nonce: 'dev-nonce' }, { 'Set-Cookie': clearSessionCookie() })
      return true
    }

    if (route === '/profile' && method === 'GET') {
      if (!current) {
        sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
        return true
      }
      sendJson(res, 200, publicUser(current))
      return true
    }

    if (route === '/profile' && (method === 'PUT' || method === 'POST' || method === 'PATCH')) {
      if (!current) {
        sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
        return true
      }
      const body = await readBody(req)
      if (body.display_name != null) current.display_name = String(body.display_name).trim()
      if (body.email != null) {
        const email = String(body.email).trim().toLowerCase()
        if (users.some((u) => u.id !== current.id && u.email === email)) {
          sendJson(res, 409, {
            code: 'vibe_mart_exists',
            message: 'That email is already in use.',
          })
          return true
        }
        current.email = email
      }
      if (body.business_name != null) current.business_name = String(body.business_name).trim()
      if (body.phone != null) current.phone = String(body.phone).trim()
      if (body.bio != null) current.bio = String(body.bio).trim()
      if (body.location != null) current.location = String(body.location).trim()

      await saveUsers(users)
      sendJson(res, 200, publicUser(current))
      return true
    }

    sendJson(res, 404, {
      code: 'vibe_mart_not_found',
      message: `Unknown auth route: ${method} ${route}`,
    })
    return true
  } catch (error) {
    console.error('[dev auth]', error)
    sendJson(res, error.status || 500, {
      code: 'vibe_mart_dev_error',
      message: error.message || 'Local auth failed.',
    })
    return true
  }
}
