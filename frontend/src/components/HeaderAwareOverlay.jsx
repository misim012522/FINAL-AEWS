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
  const classes = ['fixed inset-x-0 bottom-0 z-20 px-4 pb-4 pt-3 sm:px-6 sm:pb-6', className]
    .filter(Boolean)
    .join(' ')

  const panelClasses = ['mx-auto flex h-full w-full flex-col overflow-hidden', panelClassName]
    .filter(Boolean)
    .join(' ')

  const contentClasses = ['flex-1 overflow-y-auto', contentClassName]
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
        className="absolute inset-0 bg-slate-900/35"
        onClick={onBackdropClick}
        aria-hidden="true"
      />
      <div
        className={panelClasses}
        style={{ maxHeight: 'calc(100vh - var(--dashboard-header-height, 0px) - 1rem)' }}
      >
        <div className={contentClasses}>{children}</div>
      </div>
    </div>
  )
}
