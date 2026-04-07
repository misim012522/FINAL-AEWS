import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const AUTH_KEY = 'auth'

function normalizeRole(role) {
  const value = String(role ?? '').trim().toLowerCase()
  if (!value) return null
  if (value === 'amustaff') return 'amu-staff'
  return value
}

function normalizeAuthPayload(data) {
  const user = data?.user && typeof data.user === 'object' ? data.user : data
  const id = user?.id || user?._id || data?.id || data?._id || null
  const role = normalizeRole(data?.role || user?.role)
  const accessToken = data?.access_token || data?.accessToken || data?.token || null
  if (!user || !id || !role) return null

  return {
    user: {
      ...user,
      id,
      role,
    },
    role,
    accessToken,
  }
}

function readStored() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return normalizeAuthPayload(JSON.parse(raw))
  } catch (_) {}
  return null
}

const AuthContext = createContext(null)

export { AuthContext }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored)

  const login = useCallback((data) => {
    const payload = normalizeAuthPayload(data)
    if (payload) {
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
    const payload = normalizeAuthPayload({
      user: { ...auth.user, ...updates },
      role: auth.role,
    })
    if (!payload) return
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
