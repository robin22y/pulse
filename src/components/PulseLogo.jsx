const SIZES = {
  small: { text: 'text-xl', subtitle: 'text-[9px]', container: 'gap-1' },
  default: { text: 'text-4xl', subtitle: 'text-xs', container: 'gap-2' },
  large: { text: 'text-6xl', subtitle: 'text-sm', container: 'gap-3' },
}

const VARIANTS = {
  default: {
    main: 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600',
    subtitle: 'text-gray-600',
  },
  white: {
    main: 'bg-gradient-to-r from-white via-blue-100 to-white',
    subtitle: 'text-white/80',
  },
  dark: {
    main: 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400',
    subtitle: 'text-gray-300',
  },
}

const PulseLogo = ({ size = 'default', variant = 'default', className = '' }) => {
  const s = SIZES[size] ?? SIZES.default
  const v = VARIANTS[variant] ?? VARIANTS.default

  return (
    <div className={`flex items-center ${s.container} ${className}`}>
      <div className="relative">
        <h1
          className={`${s.text} font-black tracking-tighter ${v.main} bg-clip-text text-transparent`}
          style={{
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            letterSpacing: '-0.05em',
            textShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
          }}
        >
          Pulse
        </h1>
        <div
          className="animate-pulse-glow absolute -right-1 top-0 h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500"
          style={{ boxShadow: '0 0 10px rgba(236, 72, 153, 0.8)' }}
        />
      </div>
      <div className="flex flex-col">
        <span className={`${s.subtitle} font-semibold ${v.subtitle} opacity-70`}>by</span>
        <span className={`${s.subtitle} font-bold tracking-wide ${v.main} bg-clip-text text-transparent`}>DigiGet</span>
      </div>
    </div>
  )
}

export default PulseLogo
