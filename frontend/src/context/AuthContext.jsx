import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const AUTH_KEY = 'auth'

function readStored() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.user && data?.role) return { user: data.user, role: data.role }
  } catch (_) {}
  return null
}

const AuthContext = createContext(null)

export { AuthContext }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored)

  const login = useCallback((data) => {
    const payload = { user: data?.user ?? null, role: data?.role ?? null }
    if (payload.user && payload.role) {
      setAuth(payload)
      localStorage.setItem(AUTH_KEY, JSON.stringify(payload))
    }
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
    localStorage.removeItem(AUTH_KEY)
  }, [])

  const updateUser = useCallback((updates) => {
    if (!auth?.user || !updates || typeof updates !== 'object') return
    const nextUser = { ...auth.user, ...updates }
    const payload = { user: nextUser, role: auth.role }
    setAuth(payload)
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload))
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
