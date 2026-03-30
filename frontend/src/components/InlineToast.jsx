import { CheckCircle2, AlertCircle, X } from 'lucide-react'

const TONE_STYLES = {
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100/80',
    icon: 'text-emerald-600',
  },
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-800 shadow-red-100/80',
    icon: 'text-red-600',
  },
}

export default function InlineToast({ message = '', tone = 'success', onClose }) {
  if (!message) return null

  const styles = TONE_STYLES[tone] || TONE_STYLES.success
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-[calc(100vw-2rem)] px-4 pointer-events-none" role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <div className={`pointer-events-auto mx-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm w-full min-w-0 max-w-[520px] ${styles.wrapper}`}>
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{message}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1 text-current/60 hover:bg-white/40 hover:text-current transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
