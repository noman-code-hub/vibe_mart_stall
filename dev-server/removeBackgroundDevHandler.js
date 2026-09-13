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

function loadEnv() {
  dotenv.config({ path: path.join(projectRoot, '.env') })
  dotenv.config({ path: path.join(projectRoot, 'frontend', '.env') })
}

loadEnv()

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

function providersForKey(apiKey) {
  // Poof.bg (proof.bg) issues `pk_…` keys. remove.bg keys do not.
  if (/^pk_/i.test(apiKey)) {
    return [
      {
        name: 'poof.bg',
        url: 'https://api.poof.bg/v1/remove',
        headers: { 'x-api-key': apiKey },
        fields: { format: 'png', channels: 'rgba' },
        fileField: 'image_file',
      },
    ]
  }

  return [
    {
      name: 'remove.bg',
      url: 'https://api.remove.bg/v1.0/removebg',
      headers: { 'X-Api-Key': apiKey },
      fields: { size: 'auto', format: 'png' },
      fileField: 'image_file',
    },
  ]
}

function parseProviderError(name, parsed, fallback) {
  if (name === 'poof.bg') {
    return parsed?.message || parsed?.error || fallback
  }

  return parsed?.errors?.[0]?.title || parsed?.errors?.[0]?.detail || fallback
}

async function callRemoveBg(buffer, filename) {
  loadEnv()
  const apiKey = (process.env.REMOVE_BG_API_KEY || '').trim()
  if (!apiKey) {
    const err = new Error('Local dev is missing REMOVE_BG_API_KEY. Add it to a .env file in the project root (not .env.example), then restart npm run dev.')
    err.status = 503
    err.code = 'MISSING_API_KEY'
    throw err
  }

  const providers = providersForKey(apiKey)
  let lastError = null

  for (const provider of providers) {
    const form = new FormData()
    for (const [key, value] of Object.entries(provider.fields)) {
      form.append(key, value)
    }
    form.append(
      provider.fileField,
      new Blob([buffer], { type: 'application/octet-stream' }),
      filename || 'upload.png'
    )

    const started = Date.now()
    console.info(
      `[remove-bg] ${provider.name} ${provider.url} (${Math.round(buffer.length / 1024)} KB)`
    )

    let response
    try {
      response = await fetch(provider.url, {
        method: 'POST',
        headers: provider.headers,
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
      lastError = Object.assign(
        new Error(`Could not reach ${provider.name}. Check your internet connection or firewall, then try again.`),
        { status: 503, code: 'NETWORK_ERROR' }
      )
      continue
    }

    console.info(`[remove-bg] ${provider.name} response ${response.status} in ${Date.now() - started}ms`)

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer())
    }

    let message = 'Background removal failed.'
    let code = 'REMOVE_BG_ERROR'
    try {
      const parsed = await response.json()
      message = parseProviderError(provider.name, parsed, message)
      code = parsed?.errors?.[0]?.code || parsed?.error?.code || parsed?.code || code
    } catch {
      // non-JSON error body
    }

    if (code === 'insufficient_credits' || code === 'payment_required' || response.status === 402) {
      message = `${provider.name} has no credits left on this API key. Add credits, then try again.`
      code = 'INSUFFICIENT_CREDITS'
    } else if (response.status === 401 || response.status === 403) {
      message = `Invalid or unauthorized ${provider.name} API key. Check REMOVE_BG_API_KEY.`
      code = 'INVALID_API_KEY'
    }

    lastError = Object.assign(new Error(typeof message === 'string' ? message : 'Background removal failed.'), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code,
    })

    if (response.status === 401 || response.status === 403) {
      continue
    }
    throw lastError
  }

  throw lastError
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
