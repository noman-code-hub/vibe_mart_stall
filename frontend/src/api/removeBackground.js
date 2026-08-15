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
async function readErrorMessage(response) {
  try {
    const data = await response.json()
    return data?.error || data?.message || null
  } catch {
    return null
  }
}

function messageForStatus(status) {
  if (status === 401 || status === 403) {
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
  return 'Background removal failed. Please try again.'
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
    const base = String(file.name || 'upload').replace(/\.[^.]+$/, '') || 'upload'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * Uploads an image to the background-removal endpoint, which calls remove.bg
 * server-side. Inside WordPress this is the plugin REST route; during local
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

  const body = new FormData()
  body.append('image', prepared, prepared.name || 'upload.jpg')

  const nonce = getRestNonce()
  const headers = nonce ? { 'X-WP-Nonce': nonce } : undefined

  let response
  try {
    response = await fetch(getRemoveBackgroundUrl(), {
      method: 'POST',
      body,
      headers,
      credentials: 'same-origin',
      signal: options.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error('Could not reach the background-removal service. Check your connection and try again.', {
      cause: error,
    })
  }

  if (!response.ok) {
    const message = (await readErrorMessage(response)) || messageForStatus(response.status)
    const err = new Error(message)
    err.status = response.status
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
