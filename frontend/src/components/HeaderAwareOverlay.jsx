import { useEffect } from 'react'

export default function HeaderAwareOverlay({
  children,
  onBackdropClick,
  className = '',
  panelClassName = '',
  contentClassName = '',
  role,
  labelledBy,
  modal = true,
}) {
  useEffect(() => {
    if (!modal) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [modal])
  const classes = ['fixed inset-x-0 bottom-0 z-20 flex items-center justify-center p-4 sm:p-6', className]
    .filter(Boolean)
    .join(' ')

  const panelClasses = ['mx-auto flex h-full w-full flex-col overflow-hidden', panelClassName]
    .filter(Boolean)
    .join(' ')

  const contentClasses = ['clean-scrollbar flex-1 overflow-y-auto', contentClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      style={{ top: 'var(--dashboard-header-height, 0px)' }}
      role={role}
      aria-modal={modal}
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-slate-900/35 z-10"
        onClick={onBackdropClick}
        aria-hidden="true"
      />
      <div
        className={panelClasses + ' relative z-20'}
        style={{ maxHeight: 'calc(100vh - var(--dashboard-header-height, 0px) - 1rem)' }}
      >
        <div className={contentClasses}>{children}</div>
      </div>
    </div>
  )
}
