const SIZE_CLASS = {
  compact: 'max-h-[18rem]',
  regular: 'max-h-[20rem]',
}

export default function ScrollTableContainer({
  children,
  size = 'compact',
  className = '',
}) {
  const heightClass = SIZE_CLASS[size] || SIZE_CLASS.compact
  const classes = [heightClass, 'clean-scrollbar overflow-auto', className].filter(Boolean).join(' ')
  return <div className={classes}>{children}</div>
}
