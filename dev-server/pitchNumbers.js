/**
 * Automatic trader pitch numbers: VM2026A, VM2026B, VM2026C, …
 */

export const PITCH_PREFIX = 'VM2026'

export function parsePitchIndex(pitch) {
  const match = String(pitch || '')
    .trim()
    .toUpperCase()
    .match(/^VM2026([A-Z]+)$/)
  if (!match) return 0
  let n = 0
  for (const ch of match[1]) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

export function formatPitchNumber(n) {
  let i = Math.max(1, Number(n) || 1)
  let suffix = ''
  while (i > 0) {
    i -= 1
    suffix = String.fromCharCode(65 + (i % 26)) + suffix
    i = Math.floor(i / 26)
  }
  return `${PITCH_PREFIX}${suffix}`
}

export function nextPitchNumber(existingPitches = []) {
  let max = 0
  for (const pitch of existingPitches) {
    max = Math.max(max, parsePitchIndex(pitch))
  }
  return formatPitchNumber(max + 1)
}

/** Reuse this trader's code, or mint the next VM2026 letter. */
export function assignTraderPitchNumber(user, stalls = [], users = []) {
  if (!user) return ''
  const saved = String(user.pitch_number || '').trim().toUpperCase()
  if (parsePitchIndex(saved)) {
    user.pitch_number = saved
    return saved
  }

  const fromStall = stalls.find(
    (stall) =>
      Number(stall.owner_id) === Number(user.id) && parsePitchIndex(stall.pitch_number)
  )
  if (fromStall) {
    user.pitch_number = String(fromStall.pitch_number).trim().toUpperCase()
    return user.pitch_number
  }

  const used = [
    ...users.map((item) => item.pitch_number),
    ...stalls.map((item) => item.pitch_number),
  ]
  user.pitch_number = nextPitchNumber(used)
  return user.pitch_number
}
