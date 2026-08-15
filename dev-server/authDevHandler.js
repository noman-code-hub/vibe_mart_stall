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
const RESET_LOG_FILE = path.join(DATA_DIR, 'password-resets.json')
const COOKIE_NAME = 'vm_dev_session_v2'
const AUTH_PREFIX = '/wp-json/vibe-mart/v1/auth'
const RESET_TTL_MS = 60 * 60 * 1000
const GENERIC_RESET_MESSAGE = 'If that account exists, we sent reset instructions.'

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
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    date_of_birth: user.date_of_birth || '',
    over_17: Boolean(user.over_17),
    town: user.town || '',
    county: user.county || '',
    country: user.country || '',
    terms_accepted: Boolean(user.terms_accepted),
    selling_rules_accepted: Boolean(user.selling_rules_accepted),
    privacy_accepted: Boolean(user.privacy_accepted),
    email_confirmed: user.email_confirmed !== false,
    profile_complete: Boolean(user.profile_complete),
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

function hashToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex')
}

function findUserByLogin(users, identifier) {
  const raw = String(identifier || '').trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  return users.find((u) => u.username === raw || String(u.email || '').toLowerCase() === lower) || null
}

function requestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const proto = forwardedProto || (isVercelRuntime() ? 'https' : 'http')
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim()
  const host = forwardedHost || String(req.headers.host || '').trim() || 'localhost:5173'
  return `${proto}://${host}`
}

async function logPasswordReset(entry) {
  try {
    let rows = []
    try {
      const raw = await readFile(RESET_LOG_FILE, 'utf8')
      const data = JSON.parse(raw)
      rows = Array.isArray(data?.resets) ? data.resets : []
    } catch {
      rows = []
    }
    rows.push(entry)
    if (rows.length > 50) rows = rows.slice(-50)
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(RESET_LOG_FILE, JSON.stringify({ resets: rows }, null, 2), 'utf8')
  } catch (error) {
    console.warn('[dev auth] could not log password reset', error?.message || error)
  }
}

/**
 * @returns {Promise<boolean>} true if this request was handled
 */
function authRouteFromUrl(reqUrl) {
  let urlPath = String(reqUrl || '').split('?')[0] || ''
  try {
    urlPath = decodeURIComponent(urlPath)
  } catch {
    // keep encoded path
  }
  if (!urlPath.startsWith(AUTH_PREFIX)) {
    return null
  }
  const sliced = urlPath.slice(AUTH_PREFIX.length).replace(/^\/+|\/+$/g, '')
  return sliced ? `/${sliced}` : '/'
}

export default async function authDevHandler(req, res) {
  const route = authRouteFromUrl(req.url)
  if (!route) {
    return false
  }
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
      const confirmToken = randomBytes(24).toString('hex')
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
        first_name: '',
        last_name: '',
        date_of_birth: '',
        over_17: false,
        town: '',
        county: '',
        country: '',
        terms_accepted: false,
        selling_rules_accepted: false,
        privacy_accepted: false,
        email_confirmed: false,
        profile_complete: false,
        confirm_token_hash: hashToken(confirmToken),
        confirm_expires: Date.now() + RESET_TTL_MS * 24,
      }
      users.push(user)
      await saveUsers(users)

      const confirmUrl = `${requestOrigin(req)}/confirm-email?token=${encodeURIComponent(confirmToken)}&login=${encodeURIComponent(username)}`
      sendJson(res, 201, {
        ok: true,
        pending_confirmation: true,
        message: 'Check your email to confirm your account.',
        login: username,
        email,
        confirm_url: confirmUrl,
        dev_notice: 'Test host has no email. Use this confirmation link now.',
      })
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

      if (user.email_confirmed === false) {
        sendJson(res, 403, {
          code: 'vibe_mart_email_unconfirmed',
          message: 'Please confirm your email before logging in.',
          login: user.username,
        })
        return true
      }

      sendJson(res, 200, publicUser(user), { 'Set-Cookie': sessionCookie(user.id, remember) })
      return true
    }

    if (route === '/confirm-email' && method === 'POST') {
      const body = await readBody(req)
      const login = String(body.login || body.username || body.email || '').trim()
      const token = String(body.token || '').trim()

      if (!login || !token) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'This confirmation link is invalid.',
        })
        return true
      }

      const user = findUserByLogin(users, login)
      const tokenHash = hashToken(token)
      const valid =
        user &&
        user.confirm_token_hash &&
        (!user.confirm_expires || user.confirm_expires > Date.now()) &&
        user.confirm_token_hash.length === tokenHash.length &&
        timingSafeEqual(Buffer.from(user.confirm_token_hash, 'utf8'), Buffer.from(tokenHash, 'utf8'))

      if (!valid) {
        sendJson(res, 400, {
          code: 'vibe_mart_confirm_invalid',
          message: 'This confirmation link is invalid or has expired.',
        })
        return true
      }

      user.email_confirmed = true
      user.confirm_token_hash = ''
      user.confirm_expires = 0
      await saveUsers(users)

      sendJson(res, 200, publicUser(user), { 'Set-Cookie': sessionCookie(user.id, true) })
      return true
    }

    if (route === '/logout' && method === 'POST') {
      sendJson(res, 200, { ok: true, nonce: 'dev-nonce' }, { 'Set-Cookie': clearSessionCookie() })
      return true
    }

    if (route === '/forgot-password' && method === 'POST') {
      const body = await readBody(req)
      const identifier = String(body.username || body.email || '').trim()
      if (!identifier) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'Enter your username or email.',
        })
        return true
      }

      const user = findUserByLogin(users, identifier)
      const payload = {
        ok: true,
        message: GENERIC_RESET_MESSAGE,
        // Local/Vercel have no SMTP — frontend always shows this hint.
        dev_notice:
          'Test host does not send email. If this account exists here, a reset link appears below. Use the same username or email you signed up with on this site.',
      }

      if (user) {
        const token = randomBytes(24).toString('hex')
        user.reset_token_hash = hashToken(token)
        user.reset_expires = Date.now() + RESET_TTL_MS
        await saveUsers(users)

        const resetUrl = `${requestOrigin(req)}/reset-password?token=${encodeURIComponent(token)}&login=${encodeURIComponent(user.username)}`
        payload.reset_url = resetUrl
        payload.dev_notice = 'Test host has no email. Use this reset link now.'
        await logPasswordReset({
          username: user.username,
          email: user.email,
          created_at: new Date().toISOString(),
          expires_at: new Date(user.reset_expires).toISOString(),
          reset_url: resetUrl,
        })
      }

      sendJson(res, 200, payload)
      return true
    }

    if (route === '/reset-password' && method === 'POST') {
      const body = await readBody(req)
      const login = String(body.login || body.username || '').trim()
      const token = String(body.token || '').trim()
      const password = String(body.password || '')

      if (!login || !token) {
        sendJson(res, 400, {
          code: 'vibe_mart_invalid',
          message: 'This reset link is invalid.',
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

      const user = findUserByLogin(users, login)
      const tokenHash = hashToken(token)
      const valid =
        user &&
        user.reset_token_hash &&
        user.reset_expires > Date.now() &&
        user.reset_token_hash.length === tokenHash.length &&
        timingSafeEqual(Buffer.from(user.reset_token_hash, 'utf8'), Buffer.from(tokenHash, 'utf8'))

      if (!valid) {
        sendJson(res, 400, {
          code: 'vibe_mart_reset_invalid',
          message: 'This reset link is invalid or has expired.',
        })
        return true
      }

      const salt = randomBytes(8).toString('hex')
      user.password_hash = hashPassword(password, salt)
      user.password_salt = salt
      user.reset_token_hash = ''
      user.reset_expires = 0
      await saveUsers(users)

      sendJson(res, 200, {
        ok: true,
        message: 'Password updated. You can log in now.',
      })
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
      if (body.first_name != null) current.first_name = String(body.first_name).trim()
      if (body.last_name != null) current.last_name = String(body.last_name).trim()
      if (body.date_of_birth != null) current.date_of_birth = String(body.date_of_birth).trim()
      if (body.over_17 != null) current.over_17 = Boolean(body.over_17)
      if (body.town != null) current.town = String(body.town).trim()
      if (body.county != null) current.county = String(body.county).trim()
      if (body.country != null) current.country = String(body.country).trim()
      if (body.terms_accepted != null) current.terms_accepted = Boolean(body.terms_accepted)
      if (body.selling_rules_accepted != null) {
        current.selling_rules_accepted = Boolean(body.selling_rules_accepted)
      }
      if (body.privacy_accepted != null) current.privacy_accepted = Boolean(body.privacy_accepted)

      if (body.password != null && String(body.password).length > 0) {
        const nextPassword = String(body.password)
        if (nextPassword.length < 8) {
          sendJson(res, 400, {
            code: 'vibe_mart_invalid',
            message: 'Password must be at least 8 characters.',
          })
          return true
        }
        const salt = randomBytes(8).toString('hex')
        current.password_hash = hashPassword(nextPassword, salt)
        current.password_salt = salt
      }

      const locationParts = [current.town, current.county, current.country].filter(Boolean)
      if (locationParts.length) {
        current.location = locationParts.join(', ')
      }

      const requiredOk =
        Boolean(current.first_name) &&
        Boolean(current.last_name) &&
        Boolean(current.display_name) &&
        Boolean(current.email) &&
        Boolean(current.phone) &&
        Boolean(current.date_of_birth) &&
        Boolean(current.over_17) &&
        Boolean(current.town) &&
        Boolean(current.county) &&
        Boolean(current.country) &&
        Boolean(current.terms_accepted) &&
        Boolean(current.selling_rules_accepted) &&
        Boolean(current.privacy_accepted)

      if (body.profile_complete === true || requiredOk) {
        if (!requiredOk) {
          sendJson(res, 400, {
            code: 'vibe_mart_invalid',
            message: 'Please complete all required profile fields.',
          })
          return true
        }
        current.profile_complete = true
      }

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
