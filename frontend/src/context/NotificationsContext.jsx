import { createContext, useContext, useReducer, useMemo, useEffect, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import { listNotifications, markNotificationRead as apiMarkRead, markAllNotificationsRead as apiMarkAllRead } from '../api'

const INITIAL = { instructor: [], admin: [], 'amu-staff': [] }

function notificationsReducer(state, action) {
  const { role, id } = action
  const list = state[role] || []
  switch (action.type) {
    case 'SET_LIST':
      return { ...state, [action.role]: action.payload || [] }
    case 'MARK_READ':
      return {
        ...state,
        [role]: list.map((n) => (String(n.id) === String(id) ? { ...n, read: true } : n)),
      }
    case 'MARK_ALL_READ':
      return {
        ...state,
        [role]: list.map((n) => ({ ...n, read: true })),
      }
    default:
      return state
  }
}

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const auth = useContext(AuthContext)
  const role = auth?.role || null
  const [notifications, dispatch] = useReducer(notificationsReducer, INITIAL)

  const refreshNotifications = useCallback(
    async (targetRole = role) => {
      if (!targetRole || !['instructor', 'admin', 'amu-staff'].includes(targetRole)) return []
      const list = await listNotifications(targetRole)
      dispatch({ type: 'SET_LIST', role: targetRole, payload: list })
      return list
    },
    [role]
  )

  useEffect(() => {
    if (!role || !['instructor', 'admin', 'amu-staff'].includes(role)) return

    refreshNotifications(role).catch(() => {})

    const intervalId = window.setInterval(() => {
      refreshNotifications(role).catch(() => {})
    }, 15000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications(role).catch(() => {})
      }
    }

    const handleFocus = () => {
      refreshNotifications(role).catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [role, refreshNotifications])

  const markAsRead = useCallback(
    async (r, notificationId) => {
      dispatch({ type: 'MARK_READ', role: r, id: notificationId })
      try {
        await apiMarkRead(notificationId)
      } catch {
        // Revert on failure: refetch list
        if (role === r) refreshNotifications(r).catch(() => {})
      }
    },
    [refreshNotifications, role]
  )

  const markAllAsRead = useCallback(
    async (r) => {
      dispatch({ type: 'MARK_ALL_READ', role: r })
      try {
        await apiMarkAllRead(r)
      } catch {
        if (role === r) refreshNotifications(r).catch(() => {})
      }
    },
    [refreshNotifications, role]
  )

  const api = useMemo(
    () => ({
      getNotifications(r) {
        return notifications[r] || []
      },
      getUnreadCount(r) {
        const list = notifications[r] || []
        return list.filter((n) => !n.read).length
      },
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }),
    [notifications, markAsRead, markAllAsRead, refreshNotifications]
  )

  return (
    <NotificationsContext.Provider value={api}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    // Return a default API object if context is not provided
    return {
      getNotifications() { return [] },
      getUnreadCount() { return 0 },
      markAsRead() {},
      markAllAsRead() {},
      refreshNotifications() { return Promise.resolve([]) },
    }
  }
  return ctx
}
