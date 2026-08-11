/**
 * Stall fields are optional — empty inputs never block generate / save / publish.
 * Kept for call-site compatibility; always returns ok.
 */
export function validateStallForPublish() {
  return { ok: true, errors: [] }
}
