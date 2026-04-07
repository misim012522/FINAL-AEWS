export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions = null,
  children = null,
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500 max-w-2xl">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      {children && <div className="p-5">{children}</div>}
    </section>
  )
}
