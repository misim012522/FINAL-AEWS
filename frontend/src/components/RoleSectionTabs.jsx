export default function RoleSectionTabs({
  items,
  activeId,
  onChange,
  ariaLabel = 'Sections',
  accentClass = 'bg-blue-600 border-blue-600 text-white shadow-sm',
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm p-2">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? accentClass
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
