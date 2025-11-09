export default function PulseLogo({ size = 'default', variant = 'default' }) {
  const sizes = {
    small: { text: 'text-xl', subtitle: 'text-[8px]', container: 'gap-1' },
    default: { text: 'text-4xl', subtitle: 'text-xs', container: 'gap-2' },
    large: { text: 'text-6xl', subtitle: 'text-sm', container: 'gap-3' },
  }

  const variants = {
    default: {
      main: 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600',
      subtitle: 'text-gray-600',
    },
    white: {
      main: 'bg-gradient-to-r from-white via-blue-100 to-white',
      subtitle: 'text-white/80',
    },
  }

  const s = sizes[size] ?? sizes.default
  const v = variants[variant] ?? variants.default

  return (
    <div className={`flex items-center ${s.container}`}>
      <div className="relative">
        <h1
          className={`${s.text} font-black tracking-tighter ${v.main} bg-clip-text text-transparent`}
          style={{
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '-0.05em',
          }}
        >
          Pulse
        </h1>
        <div
          className="absolute -right-1 top-0 h-2 w-2 animate-pulse rounded-full bg-gradient-to-r from-pink-500 to-red-500"
          style={{ boxShadow: '0 0 10px rgba(236, 72, 153, 0.8)' }}
        />
      </div>
      <div className="flex flex-col">
        <span className={`${s.subtitle} font-semibold ${v.subtitle} opacity-70`}>by</span>
        <span className={`${s.subtitle} font-bold tracking-wide ${v.main} bg-clip-text text-transparent`}>
          DigiGet
        </span>
      </div>
    </div>
  )
}
