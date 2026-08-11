/**
 * Runtime configuration for remove.bg — reads marketplace config when present,
 * falls back to legacy vibeStallGenerator / local Vite middleware.
 */
const DEV_DEFAULTS = {
  restUrl: '/api/remove-background',
  nonce: '',
  maxUploadBytes: 10 * 1024 * 1024,
}

function readInjectedConfig() {
  if (typeof window === 'undefined') return null
  return window.vibeMartConfig || window.vibeStallGenerator || null
}

export function getRemoveBackgroundUrl() {
  const injected = readInjectedConfig()
  return injected?.removeBgUrl || injected?.restUrl || DEV_DEFAULTS.restUrl
}

export function getRestNonce() {
  const injected = readInjectedConfig()
  return injected?.nonce || DEV_DEFAULTS.nonce
}

export function getMaxUploadBytes() {
  const injected = readInjectedConfig()
  const value = Number(injected?.maxUploadBytes)
  return Number.isFinite(value) && value > 0 ? value : DEV_DEFAULTS.maxUploadBytes
}

export function isWordPressRuntime() {
  return Boolean(readInjectedConfig()?.restBase || readInjectedConfig()?.restUrl)
}
