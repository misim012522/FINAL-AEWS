import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { clearStoredAuth, normalizeAuthPayload, readStoredAuth, writeStoredAuth } from '../lib/authStorage'

const AuthContext = createContext(null)

export { AuthContext }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)

  const login = useCallback((data) => {
    const payload = writeStoredAuth(data)
    if (payload) {
      setAuth(payload)
    }
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
    clearStoredAuth()
  }, [])

  const updateUser = useCallback((updates) => {
    if (!auth?.user || !updates || typeof updates !== 'object') return
    const payload = normalizeAuthPayload({
      user: { ...auth.user, ...updates },
      role: auth.role,
    })
    if (!payload) return
    setAuth(payload)
    writeStoredAuth(payload)
  }, [auth])

  const value = useMemo(
    () => ({
      user: auth?.user ?? null,
      role: auth?.role ?? null,
      isAuthenticated: Boolean(auth?.user),
      login,
      logout,
      updateUser,
    }),
    [auth, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
