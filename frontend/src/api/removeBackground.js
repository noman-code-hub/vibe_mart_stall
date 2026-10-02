import {
  getMaxUploadBytes,
  getRemoveBackgroundUrl,
  getRestNonce,
} from '../config/runtimeConfig'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

/** Longest edge after client-side downscale (keeps remove.bg fast). */
const MAX_EDGE_PX = 1600

/** Bytes -> "10 MB" for user-facing size errors. */
function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

/** WordPress REST errors use `message`; our handler uses `error`. */
async function readErrorPayload(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function messageFromPayload(data, status) {
  const text = data?.error || data?.message || null
  if (text) return text

  const code = data?.code || data?.data?.code || ''
  if (
    status === 401 ||
    status === 403 ||
    code === 'vibe_mart_invalid_nonce' ||
    code === 'rest_cookie_invalid_nonce'
  ) {
    return 'Your session expired. Please refresh the page and try again.'
  }
  if (status === 413) {
    return 'That image is too large. Please upload a smaller photo.'
  }
  if (status === 429) {
    return 'Too many uploads in a short time. Please wait a moment and try again.'
  }
  if (status === 504) {
    return 'Background removal timed out. Please try again with a smaller image.'
  }
  if (code === 'INVALID_API_KEY' || code === 'MISSING_API_KEY') {
    return 'Background removal is not configured correctly. Check Vibe Mart → Settings.'
  }
  return 'Background removal failed. Please try again.'
}

function isNonceFailure(status, data) {
  if (status !== 401 && status !== 403) return false
  const code = data?.code || data?.data?.code || ''
  const text = String(data?.error || data?.message || '').toLowerCase()
  return (
    code === 'vibe_mart_invalid_nonce' ||
    code === 'rest_cookie_invalid_nonce' ||
    text.includes('session expired') ||
    text.includes('nonce')
  )
}

/**
 * Pull a fresh wp_rest nonce from auth/session (bypasses HTML page cache).
 */
async function refreshRestNonce() {
  if (typeof window === 'undefined') return ''
  const restBase = String(window.vibeMartConfig?.restBase || '').replace(/\/$/, '')
  if (!restBase) return ''

  try {
    const response = await fetch(`${restBase}/auth/session?_vm=${Date.now()}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return ''
    const data = await response.json()
    const nonce = String(data?.nonce || '').trim()
    if (!nonce) return ''
    window.vibeMartConfig = { ...window.vibeMartConfig, nonce }
    return nonce
  } catch {
    return ''
  }
}

/**
 * Downscale large phone photos before upload so remove.bg responds faster.
 * Returns the original file when already small enough.
 */
async function prepareImageForRemoveBg(file) {
  if (typeof createImageBitmap !== 'function') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const longest = Math.max(bitmap.width, bitmap.height)
    if (longest <= MAX_EDGE_PX) {
      bitmap.close?.()
      return file
    }

    const scale = MAX_EDGE_PX / longest
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    let blob
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, width, height)
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, width, height)
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Could not resize image.'))),
          'image/jpeg',
          0.9
        )
      })
    } else {
      bitmap.close?.()
      return file
    }

    bitmap.close?.()
    return new File([blob], file.name?.replace(/\.[^.]+$/, '.jpg') || 'upload.jpg', {
      type: 'image/jpeg',
    })
  } catch {
    return file
  }
}

/**
 * Uploads an image to the background-removal endpoint, which calls remove.bg /
 * Poof.bg on the server. On WordPress that is the plugin REST route; in local
 * development it is the Vite middleware. The API key never reaches the
 * browser in either case.
 *
 * @param {File|Blob} file
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Blob>} transparent PNG blob
 */
export async function removeBackground(file, options = {}) {
  if (!file) {
    throw new Error('Please choose an image first.')
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error('Unsupported format. Please choose a JPEG, PNG, or WebP image.')
  }

  const maxBytes = getMaxUploadBytes()
  if (file.size && file.size > maxBytes) {
    throw new Error(`File too large. Maximum size is ${formatBytes(maxBytes)}.`)
  }

  const prepared = await prepareImageForRemoveBg(file)

  const postOnce = async (nonce) => {
    const body = new FormData()
    body.append('image', prepared, prepared.name || 'upload.jpg')
    const headers = nonce ? { 'X-WP-Nonce': nonce } : undefined

    return fetch(getRemoveBackgroundUrl(), {
      method: 'POST',
      body,
      headers,
      credentials: 'same-origin',
      signal: options.signal,
    })
  }

  // Always prefer a fresh nonce on WordPress so cached HTML cannot break uploads.
  let nonce = getRestNonce()
  const fresh = await refreshRestNonce()
  if (fresh) nonce = fresh

  let response
  try {
    response = await postOnce(nonce)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error('Could not reach the background-removal service. Check your connection and try again.', {
      cause: error,
    })
  }

  // Stale HTML page cache often serves an expired REST nonce — refresh and retry once.
  if (!response.ok && (response.status === 401 || response.status === 403)) {
    const firstPayload = await readErrorPayload(response.clone())
    if (isNonceFailure(response.status, firstPayload)) {
      const fresh = await refreshRestNonce()
      if (fresh && fresh !== nonce) {
        try {
          response = await postOnce(fresh)
        } catch (error) {
          if (error?.name === 'AbortError') throw error
          throw new Error(
            'Could not reach the background-removal service. Check your connection and try again.',
            { cause: error }
          )
        }
      } else if (firstPayload) {
        const message = messageFromPayload(firstPayload, response.status)
        const err = new Error(message)
        err.status = response.status
        err.code = firstPayload?.code || firstPayload?.data?.code || ''
        throw err
      }
    }
  }

  if (!response.ok) {
    const data = await readErrorPayload(response)
    const message = messageFromPayload(data, response.status)
    const err = new Error(message)
    err.status = response.status
    err.code = data?.code || data?.data?.code || ''
    throw err
  }

  const blob = await response.blob()
  if (!blob.size) {
    throw new Error('Background removal returned an empty image. Please try again.')
  }

  return blob
}

/** Turns a PNG blob into a downloadable File for stall uploads / previews. */
export function blobToPngFile(blob, baseName = 'cutout') {
  const safe = String(baseName).replace(/\.[^.]+$/, '') || 'cutout'
  return new File([blob], `${safe}-no-bg.png`, { type: 'image/png' })
}
