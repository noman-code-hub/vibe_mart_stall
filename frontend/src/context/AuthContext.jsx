import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRuntimeConfig } from './RuntimeConfigContext.jsx'
import * as authApi from '../services/authApi.js'

const AuthContext = createContext(null)

function stripNonce(payload) {
  if (!payload || typeof payload !== 'object') return payload
  const { nonce: _nonce, ...user } = payload
  return user
}

export function AuthProvider({ children }) {
  const config = useRuntimeConfig()
  const { setNonce } = config
  const configRef = useRef(config)
  configRef.current = config

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const applyAuthPayload = useCallback(
    (payload) => {
      if (!payload) {
        setUser(null)
        return null
      }
      if (payload.nonce) {
        setNonce(payload.nonce)
      }
      const nextUser = stripNonce(payload)
      setUser(nextUser)
      return nextUser
    },
    [setNonce]
  )

  const refresh = useCallback(async () => {
    try {
      const session = await authApi.getSession(configRef.current)
      if (session?.nonce) {
        setNonce(session.nonce)
      }
      if (session?.authenticated && session.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [setNonce])

  // Restore session once from WP auth cookies on boot.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const session = await authApi.getSession(configRef.current)
        if (cancelled) return
        if (session?.nonce) {
          setNonce(session.nonce)
        }
        if (session?.authenticated && session.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setNonce])

  const login = useCallback(
    async (username, password, remember = true) => {
      const payload = await authApi.login(configRef.current, username, password, remember)
      return applyAuthPayload(payload)
    },
    [applyAuthPayload]
  )

  const register = useCallback(
    async (payload) => {
      const result = await authApi.register(configRef.current, payload)
      return applyAuthPayload(result)
    },
    [applyAuthPayload]
  )

  const logout = useCallback(async () => {
    try {
      const result = await authApi.logout(configRef.current)
      if (result?.nonce) {
        setNonce(result.nonce)
      }
    } finally {
      setUser(null)
    }
  }, [setNonce])

  const updateProfile = useCallback(
    async (fields) => {
      const payload = await authApi.updateProfile(configRef.current, fields)
      return applyAuthPayload(payload)
    },
    [applyAuthPayload]
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refresh,
      updateProfile,
    }),
    [user, loading, login, register, logout, refresh, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
