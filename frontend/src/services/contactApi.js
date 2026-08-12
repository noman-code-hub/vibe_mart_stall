import { apiRequest } from './http.js'

/**
 * Submit the public contact form.
 * WordPress: POST /wp-json/vibe-mart/v1/contact (requires X-WP-Nonce).
 * Vercel/dev: POST /api/vm?path=contact
 */
export function submitContact(config, payload) {
  return apiRequest(config, 'contact', {
    method: 'POST',
    body: payload,
  })
}
