'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, civicApi, type CivicUser } from '@/lib/civicai-api'

const ACCESS_KEY = 'civicai_access_token'
const REFRESH_KEY = 'civicai_refresh_token'

type AuthState = {
  user: CivicUser | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<CivicUser>
  register: (fullName: string, email: string, password: string) => Promise<CivicUser>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<CivicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On mount, restore a session from localStorage and validate it against /auth/me.
  useEffect(() => {
    let cancelled = false
    async function restore() {
      const savedAccess = window.localStorage.getItem(ACCESS_KEY)
      const savedRefresh = window.localStorage.getItem(REFRESH_KEY)
      if (!savedAccess) {
        setLoading(false)
        return
      }
      try {
        const me = await civicApi.me(savedAccess)
        if (cancelled) return
        setToken(savedAccess)
        setUser(me)
      } catch {
        // access token expired — try to refresh once
        if (savedRefresh) {
          try {
            const pair = await civicApi.refresh(savedRefresh)
            const me = await civicApi.me(pair.access_token)
            if (cancelled) return
            window.localStorage.setItem(ACCESS_KEY, pair.access_token)
            window.localStorage.setItem(REFRESH_KEY, pair.refresh_token)
            setToken(pair.access_token)
            setUser(me)
          } catch {
            window.localStorage.removeItem(ACCESS_KEY)
            window.localStorage.removeItem(REFRESH_KEY)
          }
        } else {
          window.localStorage.removeItem(ACCESS_KEY)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const pair = await civicApi.login(email, password)
      const me = await civicApi.me(pair.access_token)
      window.localStorage.setItem(ACCESS_KEY, pair.access_token)
      window.localStorage.setItem(REFRESH_KEY, pair.refresh_token)
      setToken(pair.access_token)
      setUser(me)
      return me
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not sign in. Please try again.'
      setError(message)
      throw err
    }
  }, [])

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    setError(null)
    try {
      await civicApi.register(fullName, email, password)
      // registration always creates a citizen account — log in right after
      return await login(email, password)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not create your account. Please try again.'
      setError(message)
      throw err
    }
  }, [login])

  const logout = useCallback(() => {
    window.localStorage.removeItem(ACCESS_KEY)
    window.localStorage.removeItem(REFRESH_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, logout, clearError }),
    [user, token, loading, error, login, register, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
