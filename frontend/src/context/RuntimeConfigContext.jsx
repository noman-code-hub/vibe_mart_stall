import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const RuntimeConfigContext = createContext(null)

/**
 * Defaults when `window.vibeMartConfig` is not injected (Vite + Vercel).
 *
 * Use `/api/vm/v1` (not `/wp-json/.../auth/...`) so Vercel WAF does not
 * mitigate session/login calls with HTTP 403.
 *
 * // WORDPRESS: theme injects window.vibeMartConfig (restBase, nonce, etc.).
 */
const DEV_DEFAULTS = {
  // Flat Vercel-safe endpoint — see api/vm.js (?path=...).
  restBase: '/api/vm',
  removeBgUrl: '/api/remove-background',
  nonce: '',
  basename: '/',
  siteName: 'Vibe Mart',
  maxUploadBytes: 10 * 1024 * 1024,
  isWordPress: false,
}

function readInjected() {
  if (typeof window === 'undefined') return null
  // WordPress theme sets vibeMartConfig (or legacy vibeStallGenerator).
  return window.vibeMartConfig || window.vibeStallGenerator || null
}

function buildConfig(nonceOverride) {
  const injected = readInjected()
  const onVercel =
    typeof window !== 'undefined' && /\.vercel\.app$/i.test(window.location.hostname || '')

  if (!injected) {
    return {
      ...DEV_DEFAULTS,
      restBase: onVercel ? '/api/vm' : DEV_DEFAULTS.restBase,
      nonce: nonceOverride ?? DEV_DEFAULTS.nonce,
    }
  }

  let restBase =
    injected.restBase || injected.restUrl?.replace(/\/remove-background\/?$/, '') || DEV_DEFAULTS.restBase

  // Never call WordPress paths on Vercel (WAF + no WP server).
  if (onVercel) {
    restBase = '/api/vm'
  }

  return {
    restBase,
    removeBgUrl: injected.removeBgUrl || injected.restUrl || DEV_DEFAULTS.removeBgUrl,
    nonce: nonceOverride ?? injected.nonce ?? '',
    basename: injected.basename || '/',
    siteName: injected.siteName || 'Vibe Mart',
    maxUploadBytes: Number(injected.maxUploadBytes) || DEV_DEFAULTS.maxUploadBytes,
    isWordPress: injected.isWordPress === true && !onVercel,
  }
}

export function RuntimeConfigProvider({ children }) {
  const [nonce, setNonceState] = useState(() => buildConfig().nonce)

  const setNonce = useCallback((nextNonce) => {
    if (typeof nextNonce !== 'string') return
    setNonceState(nextNonce)
    // Keep window config in sync so other modules reading it stay current.
    if (typeof window !== 'undefined') {
      if (window.vibeMartConfig) {
        window.vibeMartConfig = { ...window.vibeMartConfig, nonce: nextNonce }
      }
    }
  }, [])

  const value = useMemo(() => {
    const config = buildConfig(nonce)
    return {
      ...config,
      setNonce,
    }
  }, [nonce, setNonce])

  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>
}

export function useRuntimeConfig() {
  const ctx = useContext(RuntimeConfigContext)
  if (!ctx) throw new Error('useRuntimeConfig must be used inside RuntimeConfigProvider')
  return ctx
}
