import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const AUTH_KEY = 'auth'

function normalizeRole(role) {
  if (role === 'amustaff') return 'amu-staff'
  return role
}

function readStored() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const role = normalizeRole(data?.role || data?.user?.role)
    if (data?.user && role) {
      return { user: { ...data.user, role }, role }
    }
  } catch (_) {}
  return null
}

const AuthContext = createContext(null)

export { AuthContext }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored)

  const login = useCallback((data) => {
    const role = normalizeRole(data?.role || data?.user?.role)
    const payload = {
      user: data?.user ? { ...data.user, role } : null,
      role: role ?? null,
    }
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
    const role = normalizeRole(nextUser.role || auth.role)
    const payload = { user: { ...nextUser, role }, role }
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
