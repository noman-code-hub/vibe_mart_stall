import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'vibe-mart-role-mode-v1'
const RoleModeContext = createContext(null)

function readStoredMode() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'buyer' || raw === 'seller') return raw
  } catch {
    // private mode / blocked storage
  }
  return null
}

export function roleFromPath(pathname = '') {
  if (pathname.startsWith('/my-account') || pathname.startsWith('/sell-smart')) return 'seller'
  if (pathname.startsWith('/market') || pathname.startsWith('/my-trolley')) return 'buyer'
  return null
}

export function RoleModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    if (typeof window === 'undefined') return 'buyer'
    return readStoredMode() || roleFromPath(window.location.pathname) || 'buyer'
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [mode])

  const setMode = useCallback((next) => {
    if (next !== 'buyer' && next !== 'seller') return
    setModeState(next)
  }, [])

  const value = useMemo(
    () => ({
      mode,
      isBuyer: mode === 'buyer',
      isSeller: mode === 'seller',
      setMode,
    }),
    [mode, setMode]
  )

  return <RoleModeContext.Provider value={value}>{children}</RoleModeContext.Provider>
}

export function useRoleMode() {
  const value = useContext(RoleModeContext)
  if (!value) {
    throw new Error('useRoleMode must be used inside RoleModeProvider')
  }
  return value
}
