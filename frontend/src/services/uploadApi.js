import { apiRequest } from './http.js'

/**
 * Cleared once we learn the backend has no media upload route, so the local
 * mock API only ever gets probed once per page load.
 */
let uploadRouteAvailable = true

export function resetUploadSupport() {
  uploadRouteAvailable = true
}

/**
 * Store one image on the backend and return the saved URL.
 *
 * On WordPress this creates a real Media Library attachment so the photo lives
 * in wp-content/uploads and only its URL is kept in the database. Resolves to an
 * empty string when the backend has no upload route, letting callers fall back
 * to an inline data URL. Genuine problems (file too large, wrong format,
 * expired session) are thrown so the trader sees why the photo was refused.
 */
export async function uploadImage(config, file) {
  if (!uploadRouteAvailable || !file || typeof file === 'string') return ''

  const form = new FormData()
  form.append('file', file, file.name || 'stall-image.png')

  try {
    const result = await apiRequest(config, 'uploads', { method: 'POST', body: form })
    const url = typeof result?.url === 'string' ? result.url : ''
    if (!url) {
      // The dev server answers unknown paths with the SPA shell, not JSON.
      uploadRouteAvailable = false
    }
    return url
  } catch (error) {
    if (error?.status === 404 || error?.status === 501) {
      uploadRouteAvailable = false
      return ''
    }
    throw error
  }
}
