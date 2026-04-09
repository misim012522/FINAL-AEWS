import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  Mail,
  MessageSquare,
  ClipboardList,
  Check,
  Inbox,
  ChevronRight,
} from 'lucide-react'

const TYPE_CONFIG = {
  alert: { icon: AlertTriangle, class: 'bg-amber-500/10 text-amber-600' },
  success: { icon: CheckCircle, class: 'bg-emerald-500/10 text-emerald-600' },
  class: { icon: BookOpen, class: 'bg-blue-500/10 text-blue-600' },
  report: { icon: Mail, class: 'bg-sky-500/10 text-sky-600' },
  system: { icon: MessageSquare, class: 'bg-indigo-500/10 text-indigo-600' },
  case: { icon: ClipboardList, class: 'bg-teal-500/10 text-teal-600' },
}

const VARIANT = {
  instructor: { dot: 'bg-blue-500', accentBg: 'bg-blue-500/8' },
  admin: { dot: 'bg-gray-600', accentBg: 'bg-gray-500/8' },
  'amu-staff': { dot: 'bg-teal-600', accentBg: 'bg-teal-500/8' },
}

export default function NotificationsPopover({
  variant = 'instructor',
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onClear,
}) {
  const styles = VARIANT[variant] || VARIANT.instructor
  const unreadCount = notifications.filter((n) => !n.read).length
  const displayList = notifications.slice(0, 8)

  return (
    <div className="w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[420px]">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
        <h2 className="font-semibold text-gray-900 text-base">Notifications</h2>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      <div className="clean-scrollbar overflow-y-auto flex-1 min-h-0">
        {displayList.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className={`w-12 h-12 rounded-xl ${styles.accentBg} flex items-center justify-center mx-auto mb-3`}>
              <Inbox className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">You're all caught up</p>
            <p className="text-xs text-gray-500 mt-0.5">No new notifications</p>
            {variant === 'admin' && (
              <Link
                to="/admin"
                state={{ notificationTab: 'pending' }}
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Go to Pending Accounts
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {displayList.map((n, index) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.alert
              const Icon = config.icon
              return (
                <li key={`${n.id || 'notification'}-${n.time || 'time'}-${index}`}>
                  <div
                    className={`group flex gap-3 px-4 py-3 transition-colors ${
                      !n.read ? styles.accentBg : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${config.class}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">{n.title}</p>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkRead(n.id)
                            }}
                            className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {n.time}
                      </p>
                    </div>
                    {!n.read && (
                      <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${styles.dot}`} aria-hidden />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
