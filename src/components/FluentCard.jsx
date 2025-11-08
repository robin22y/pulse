const FluentCard = ({
  children,
  padding = 'p-6',
  className = '',
  accent = false,
  glass = false,
}) => {
  const base =
    'rounded-3xl border border-slate-800/60 shadow-card text-slate-100 transition-all duration-300'
  const surfaces = glass
    ? 'bg-white/5 backdrop-blur-2xl'
    : accent
      ? 'bg-primary/10 border-primary/30'
      : 'bg-slate-900/60'

  return (
    <div className={`${base} ${surfaces} ${padding} ${className}`}>
      {children}
    </div>
  )
}

export default FluentCard

