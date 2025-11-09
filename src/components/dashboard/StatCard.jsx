const StatCard = ({ icon: Icon, label, value, trend, tone = 'indigo' }) => {
  const toneClasses = {
    indigo: 'from-indigo-500/15 via-indigo-500/10 to-indigo-500/5 border-indigo-400/20 text-indigo-50',
    blue: 'from-blue-500/15 via-blue-500/10 to-blue-500/5 border-blue-400/20 text-blue-50',
    emerald: 'from-emerald-500/15 via-emerald-500/10 to-emerald-500/5 border-emerald-400/20 text-emerald-50',
    amber: 'from-amber-500/15 via-amber-500/10 to-amber-500/5 border-amber-400/20 text-amber-50',
  }

  const toneClass = toneClasses[tone] ?? toneClasses.indigo

  return (
    <div
      className={`min-w-[180px] flex-shrink-0 rounded-2xl border bg-gradient-to-br p-4 shadow-lg shadow-black/10 backdrop-blur-md md:min-w-0 md:flex-1 ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white md:text-3xl">{value}</p>
          {trend ? <p className="mt-1 text-xs text-white/70">{trend}</p> : null}
        </div>
        {Icon ? <Icon size={28} className="text-white/80" /> : null}
      </div>
    </div>
  )
}

export default StatCard
