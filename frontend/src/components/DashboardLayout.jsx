import { useState, useRef, useEffect } from 'react'
import { Bell, Settings, LogOut, HelpCircle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationsPopover from './NotificationsPopover'

export default function DashboardLayout({
  title,
  subtitle,
  icon: Icon,
  variant = 'instructor',
  children,
  notificationCount: notificationCountProp = 0,
  navItems = [],
}) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const notificationsApi = useNotifications()
  const notificationCount = notificationsApi ? notificationsApi.getUnreadCount(variant) : notificationCountProp
  const notifications = notificationsApi ? notificationsApi.getNotifications(variant) : []
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef(null)

  const isAdmin = variant === 'admin'
  const isAmuStaff = variant === 'amu-staff'
  const isInstructor = variant === 'instructor'
  const accentBg = isAdmin ? 'bg-gray-700' : isAmuStaff ? 'bg-teal-600' : 'bg-blue-600'
  const accentRing = isAdmin ? 'ring-gray-200' : isAmuStaff ? 'ring-teal-200' : 'ring-blue-200'
  const roleLabel = isAdmin ? 'Admin' : isAmuStaff ? 'AMU Staff' : 'Instructor'

  const basePath = variant === 'admin' ? '/admin' : variant === 'amu-staff' ? '/amu-staff' : '/instructor'

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [notificationsOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
  }
  const handleNotificationsClick = (e) => {
    e.stopPropagation()
    setNotificationsOpen((open) => !open)
  }
  const handleSettings = () => navigate(`${basePath}/settings`)

  const textMuted = isInstructor ? 'text-slate-500' : 'text-gray-500'
  const textPrimary = isInstructor ? 'text-slate-900' : 'text-gray-900'
  const btnMuted = isInstructor ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
  const btnActive = isInstructor ? 'bg-slate-100 text-slate-800' : 'bg-gray-100 text-gray-800'
  const divider = isInstructor ? 'bg-slate-200' : 'bg-gray-200'
  const roleHomeLabel = isAdmin ? 'System workspace' : isAmuStaff ? 'Support workspace' : 'Teaching workspace'

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Same background as login: soft blue gradient + orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-indigo-200/95 to-blue-300/90" aria-hidden="true" />
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-blue-400/45 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-indigo-400/40 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-blue-400/25 blur-3xl" aria-hidden="true" />
      <div className="absolute top-3/4 left-1/4 w-64 h-64 rounded-full bg-sky-400/35 blur-3xl" aria-hidden="true" />
      <header className={`relative z-30 sticky top-0 bg-white/90 backdrop-blur-sm border-b ${isInstructor ? 'border-slate-200' : 'border-gray-200'} shadow-sm`}>
        <div className="max-w-[1920px] mx-auto px-6 sm:px-8 py-4.5 flex items-center justify-between gap-4">
          {/* Brand / identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex-shrink-0 w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center text-white shadow-sm ring-2 ${accentRing} ring-offset-2 ring-offset-white`}
              aria-hidden
            >
              {Icon ? <Icon className="w-5 h-5" /> : (
                <span className="text-base font-bold">M</span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-[12px] font-semibold uppercase tracking-[0.18em] ${textMuted}`}>{roleHomeLabel}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-lg font-bold ${textPrimary} tracking-tight truncate`}>{title}</h1>
                <span
                  className={`flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide ${
                    isAdmin ? 'bg-gray-200 text-gray-800' : isAmuStaff ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {roleLabel}
                </span>
              </div>
              {subtitle && (
                <p className={`text-sm ${textMuted} truncate mt-0.5 leading-tight`}>{subtitle}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={handleNotificationsClick}
                title="Notifications"
                className={`relative p-3 rounded-lg ${btnMuted} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  notificationsOpen ? btnActive : ''
                }`}
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
              >
                <Bell className="w-[18px] h-[18px]" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <NotificationsPopover
                    variant={variant}
                    notifications={notifications}
                    onMarkRead={(id) => notificationsApi?.markAsRead(variant, id)}
                    onMarkAllRead={() => notificationsApi?.markAllAsRead(variant)}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSettings}
              title="Settings"
              className={`p-3 rounded-lg ${btnMuted} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              aria-label="Settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/help')}
              title="Help & FAQ"
              className={`p-3 rounded-lg ${btnMuted} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              aria-label="Help"
            >
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
            <div className={`w-px h-6 ${divider} mx-0.5`} aria-hidden />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4.5 py-3 rounded-xl border border-gray-200 text-gray-600 text-[15px] font-medium hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Log out"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Log out
            </button>
          </div>
        </div>
        {navItems.length > 0 && (
          <div className={`border-t ${isInstructor ? 'border-slate-200/80' : 'border-gray-200/80'} bg-white/70 backdrop-blur-sm`}>
              <div className="max-w-[1920px] mx-auto px-6 sm:px-8 py-4">
                <nav
                className={`inline-flex max-w-full flex-wrap items-center gap-2.5 rounded-2xl border px-3 py-2.5 shadow-sm ${
                  isInstructor
                    ? 'border-slate-200/90 bg-slate-50/90 shadow-slate-200/60'
                    : isAmuStaff
                      ? 'border-teal-100 bg-white/90 shadow-teal-100/40'
                      : 'border-gray-200/90 bg-gray-50/90 shadow-gray-200/60'
                }`}
                aria-label="Page navigation"
              >
                {navItems.map((item) => {
                  const isActive = item.active
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className={`inline-flex items-center gap-2.5 rounded-xl border px-5 py-3.5 text-base font-semibold transition-all ${
                        isActive
                          ? isInstructor
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25'
                            : isAmuStaff
                              ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/20'
                              : 'border-slate-700 bg-slate-700 text-white shadow-md shadow-slate-700/20'
                          : isInstructor
                            ? 'border-transparent bg-white/80 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
                            : isAmuStaff
                              ? 'border-transparent bg-white/80 text-gray-600 hover:border-teal-100 hover:bg-white hover:text-gray-900'
                              : 'border-transparent bg-white/80 text-gray-600 hover:border-gray-200 hover:bg-white hover:text-gray-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.icon ? <item.icon className={`h-5 w-5 ${isActive ? '' : 'opacity-75'}`} /> : null}
                      {item.label}
                      {item.trailing ? <ChevronRight className="h-[18px] w-[18px] opacity-70" /> : null}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        )}
      </header>
      <main className="relative z-10 min-h-[50vh]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
