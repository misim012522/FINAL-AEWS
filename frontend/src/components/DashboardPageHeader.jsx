export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions = null,
  children = null,
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
      <div className="px-7 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1.5 text-base leading-7 text-slate-500 max-w-3xl">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
      {children && <div className="p-7">{children}</div>}
    </section>
  )
}
