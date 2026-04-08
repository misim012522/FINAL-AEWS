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

function readStorageEntry(storage) {
  try {
    const raw = storage?.getItem(AUTH_KEY)
    if (!raw) return null
    return normalizeAuthPayload(JSON.parse(raw))
  } catch (_) {
    return null
  }
}

export function readStoredAuth() {
  const sessionAuth = readStorageEntry(window.sessionStorage)
  if (sessionAuth) return sessionAuth

  const legacyAuth = readStorageEntry(window.localStorage)
  if (!legacyAuth) return null

  try {
    window.sessionStorage.setItem(AUTH_KEY, JSON.stringify(legacyAuth))
    window.localStorage.removeItem(AUTH_KEY)
  } catch (_) {}

  return legacyAuth
}

export function writeStoredAuth(data) {
  const payload = normalizeAuthPayload(data)
  if (!payload) return null

  try {
    window.sessionStorage.setItem(AUTH_KEY, JSON.stringify(payload))
    window.localStorage.removeItem(AUTH_KEY)
  } catch (_) {}

  return payload
}

export function clearStoredAuth() {
  try {
    window.sessionStorage.removeItem(AUTH_KEY)
    window.localStorage.removeItem(AUTH_KEY)
  } catch (_) {}
}

export function getAuthHeaders() {
  const headers = {}
  const auth = readStoredAuth()
  if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`
  if (auth?.user?.id) headers['X-User-Id'] = auth.user.id
  if (auth?.role) headers['X-User-Role'] = auth.role
  return headers
}

export function getCurrentAuthRole() {
  return readStoredAuth()?.role || null
}

export { AUTH_KEY, normalizeAuthPayload, normalizeRole }
