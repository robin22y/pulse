import { useNavigate } from 'react-router-dom'

const COLOR_CLASSES = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/30 hover:shadow-blue-500/40',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30 hover:shadow-indigo-500/40',
  green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/40',
  purple: 'from-purple-500 to-purple-600 shadow-purple-500/30 hover:shadow-purple-500/40',
  cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-500/30 hover:shadow-cyan-500/40',
  orange: 'from-orange-500 to-orange-600 shadow-orange-500/30 hover:shadow-orange-500/40',
  pink: 'from-pink-500 to-pink-600 shadow-pink-500/30 hover:shadow-pink-500/40',
  gray: 'from-slate-500 to-slate-600 shadow-slate-500/30 hover:shadow-slate-500/40',
}

const NavTile = ({ icon: Icon, label, subtitle, color = 'blue', to = '/', onClick }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    navigate(to)
  }

  const colorClass = COLOR_CLASSES[color] ?? COLOR_CLASSES.blue

  return (
    <button
      onClick={handleClick}
      className={`flex min-h-[112px] flex-col justify-between rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-lg transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${colorClass}`}
    >
      <div className="flex items-center justify-between">
        {Icon ? <Icon size={28} className="text-white" /> : null}
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">Go</span>
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight">{label}</p>
        {subtitle ? <p className="text-xs text-white/80">{subtitle}</p> : null}
      </div>
    </button>
  )
}

export default NavTile
