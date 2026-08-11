/**
 * Development-only Node handler for POST /api/remove-background.
 *
 * Production runs entirely inside WordPress: the React bundle posts to the
 * plugin REST route. This handler exists so `npm run dev` can exercise the
 * same flow without a WordPress install.
 */
import { readFile, unlink } from 'fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import formidable from 'formidable'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(projectRoot, '.env') })
dotenv.config({ path: path.join(projectRoot, 'frontend', '.env') })

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024
const REMOVE_BG_TIMEOUT_MS = Number(process.env.REMOVE_BG_TIMEOUT_MS) || 90_000

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getUploadedImage(files) {
  const entry = files?.image
  if (!entry) return null
  return Array.isArray(entry) ? entry[0] : entry
}

async function callRemoveBg(buffer, filename) {
  const apiKey = (process.env.REMOVE_BG_API_KEY || '').trim()
  if (!apiKey) {
    const err = new Error('Local dev is missing REMOVE_BG_API_KEY. Add it to your .env file.')
    err.status = 500
    err.code = 'MISSING_API_KEY'
    throw err
  }

  const form = new FormData()
  form.append('size', 'auto')
  form.append('format', 'png')
  form.append(
    'image_file',
    new Blob([buffer], { type: 'application/octet-stream' }),
    filename || 'upload.png'
  )

  const started = Date.now()
  console.info(
    `[remove-bg] starting request (${Math.round(buffer.length / 1024)} KB, timeout ${REMOVE_BG_TIMEOUT_MS}ms)`
  )

  let response
  try {
    response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
      signal: AbortSignal.timeout(REMOVE_BG_TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[remove-bg] network/timeout after', Date.now() - started, 'ms', error?.name, error?.message)
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      const err = new Error(
        'Background removal timed out. Try a smaller photo (under ~2 MB / 1600px wide), then upload again.'
      )
      err.status = 504
      err.code = 'TIMEOUT'
      throw err
    }
    const err = new Error(
      'Could not reach remove.bg. Check your internet connection or firewall, then try again.'
    )
    err.status = 503
    err.code = 'NETWORK_ERROR'
    throw err
  }

  console.info(`[remove-bg] response ${response.status} in ${Date.now() - started}ms`)

  if (response.ok) {
    return Buffer.from(await response.arrayBuffer())
  }

  let message = 'Background removal failed.'
  let code = 'REMOVE_BG_ERROR'
  try {
    const parsed = await response.json()
    message = parsed?.errors?.[0]?.title || parsed?.errors?.[0]?.detail || message
    code = parsed?.errors?.[0]?.code || code
  } catch {
    // non-JSON error body from remove.bg
  }

  if (code === 'insufficient_credits') {
    message =
      'remove.bg has no credits left on this API key. Add credits at remove.bg, then try again.'
  } else if (response.status === 401 || response.status === 403) {
    message = 'Invalid or unauthorized remove.bg API key. Check REMOVE_BG_API_KEY.'
    code = 'INVALID_API_KEY'
  }

  const err = new Error(message)
  err.status = response.status >= 400 && response.status < 600 ? response.status : 502
  err.code = code
  throw err
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, {
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
    })
  }

  let tempPath

  try {
    const form = formidable({
      maxFileSize: MAX_UPLOAD_BYTES,
      maxFiles: 1,
      allowEmptyFiles: false,
    })

    const [, files] = await form.parse(req)
    const file = getUploadedImage(files)

    if (!file) {
      return sendJson(res, 400, {
        error: 'No image uploaded. Attach a file using the "image" form field.',
        code: 'MISSING_IMAGE',
      })
    }

    tempPath = file.filepath
    const mime = file.mimetype || ''

    if (!ALLOWED_MIME.has(mime)) {
      return sendJson(res, 400, {
        error: 'Only JPEG, PNG, and WebP images are allowed.',
        code: 'INVALID_FILE_TYPE',
      })
    }

    const buffer = await readFile(tempPath)
    const png = await callRemoveBg(buffer, file.originalFilename || 'upload.png')

    res.statusCode = 200
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Length', String(png.length))
    res.setHeader('Cache-Control', 'no-store')
    return res.end(png)
  } catch (error) {
    if (
      error?.code === 'LIMIT_FILE_SIZE' ||
      error?.httpCode === 413 ||
      /maxFileSize|max file size/i.test(String(error?.message || ''))
    ) {
      return sendJson(res, 400, {
        error: 'Image is too large. Maximum size is 10 MB.',
        code: 'FILE_TOO_LARGE',
      })
    }

    const status = error?.status || 500
    return sendJson(res, status, {
      error: error?.message || 'Something went wrong while removing the background.',
      code: error?.code || 'INTERNAL_ERROR',
    })
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath)
      } catch {
        // ignore missing/already-deleted temp files
      }
    }
  }
}
