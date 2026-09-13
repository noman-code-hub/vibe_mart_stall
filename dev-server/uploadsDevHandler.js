/**
 * Local / Vercel media uploads mirroring POST `/wp-json/vibe-mart/v1/uploads`.
 *
 * WordPress stores files in the Media Library. This stand-in writes into
 * `.local-data/uploads/` (or `/tmp/...` on Vercel) and serves them back at
 * `/api/vm?path=uploads/<filename>`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import formidable from 'formidable'
import { getLocalDataDir } from './localDataDir.js'

const DATA_DIR = getLocalDataDir()
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const COOKIE_NAME = 'vm_dev_session_v2'
const API_PREFIX = '/wp-json/vibe-mart/v1/uploads'
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024
const ALLOWED_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

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

function currentUserId(req) {
  const cookies = parseCookies(req.headers.cookie || '')
  const id = Number(cookies[COOKIE_NAME] || 0)
  return Number.isFinite(id) && id > 0 ? id : 0
}

function mimeFromName(filename) {
  const ext = path.extname(filename || '').toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return ''
}

function publicUrl(filename) {
  return `/api/vm?path=uploads/${encodeURIComponent(filename)}`
}

function safeUploadName(name) {
  const base = path.basename(String(name || ''))
  if (!base || base !== name.replace(/^.*[/\\]/, '')) return ''
  if (!/^vibe-mart-[a-z0-9]+\.(jpg|jpeg|png|webp)$/i.test(base)) return ''
  return base
}

function getUploadedFile(files) {
  const entry = files?.file || files?.image
  if (!entry) return null
  return Array.isArray(entry) ? entry[0] : entry
}

async function handleGet(req, res, filename) {
  const safe = safeUploadName(filename)
  if (!safe) {
    sendJson(res, 404, { code: 'vibe_mart_not_found', message: 'Image not found.' })
    return true
  }

  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, safe))
    const mime = mimeFromName(safe) || 'application/octet-stream'
    res.statusCode = 200
    res.setHeader('Content-Type', mime)
    res.setHeader('Content-Length', String(bytes.length))
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.end(bytes)
  } catch {
    sendJson(res, 404, { code: 'vibe_mart_not_found', message: 'Image not found.' })
  }
  return true
}

async function handlePost(req, res) {
  if (!currentUserId(req)) {
    sendJson(res, 401, { code: 'vibe_mart_unauthorized', message: 'Please log in.' })
    return true
  }

  const form = formidable({
    maxFileSize: MAX_UPLOAD_BYTES,
    maxFiles: 1,
    allowEmptyFiles: false,
  })

  let parsed
  try {
    parsed = await form.parse(req)
  } catch (error) {
    if (
      error?.code === 'LIMIT_FILE_SIZE' ||
      error?.httpCode === 413 ||
      /maxFileSize|max file size/i.test(String(error?.message || ''))
    ) {
      sendJson(res, 413, {
        code: 'vibe_mart_upload_too_large',
        message: 'That image is too large. Maximum size is 10 MB.',
      })
      return true
    }
    sendJson(res, 400, {
      code: 'vibe_mart_upload_invalid',
      message: 'Could not read that image upload.',
    })
    return true
  }

  const file = getUploadedFile(parsed[1])
  if (!file) {
    sendJson(res, 400, {
      code: 'vibe_mart_upload_missing',
      message: 'No image was received.',
    })
    return true
  }

  const mime = String(file.mimetype || mimeFromName(file.originalFilename) || '').toLowerCase()
  const ext = ALLOWED_EXT[mime]
  if (!ext) {
    sendJson(res, 400, {
      code: 'vibe_mart_upload_type',
      message: 'Please upload a JPG, PNG or WebP image.',
    })
    return true
  }

  const filename = `vibe-mart-${randomBytes(8).toString('hex')}.${ext}`
  const bytes = await readFile(file.filepath)
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(UPLOAD_DIR, filename), bytes)

  sendJson(res, 201, {
    id: filename,
    url: publicUrl(filename),
    mime,
    width: 0,
    height: 0,
  })
  return true
}

/**
 * @returns {Promise<boolean>}
 */
export default async function uploadsDevHandler(req, res) {
  const urlPath = req.url?.split('?')[0] || ''
  if (urlPath !== API_PREFIX && !urlPath.startsWith(`${API_PREFIX}/`)) {
    return false
  }

  const method = (req.method || 'GET').toUpperCase()
  const rest = urlPath.slice(API_PREFIX.length).replace(/^\/+/, '')

  if (method === 'GET' || method === 'HEAD') {
    return handleGet(req, res, rest)
  }

  if (method === 'POST' && !rest) {
    return handlePost(req, res)
  }

  sendJson(res, 405, { code: 'vibe_mart_method', message: 'Method not allowed.' })
  return true
}
