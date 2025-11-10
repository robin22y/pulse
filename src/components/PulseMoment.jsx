import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import confetti from 'canvas-confetti'
import { CheckCircle, MapPin, Timer, Flame, Crown } from 'lucide-react'

const rippleVariants = {
  animate: {
    scale: [0, 1.5, 3],
    opacity: [0.35, 0.2, 0],
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 60 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 160, damping: 18 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 40,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

const iconVariants = {
  hidden: { rotate: -180, scale: 0.4, opacity: 0 },
  visible: {
    rotate: 0,
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 120, damping: 12, delay: 0.2 },
  },
}

const statPalette = [
  { bg: 'bg-blue-500/20 border-blue-400/40 text-blue-100', icon: Timer },
  { bg: 'bg-purple-500/20 border-purple-400/40 text-purple-100', icon: Crown },
  { bg: 'bg-orange-500/20 border-orange-400/40 text-orange-100', icon: Flame },
]

const formatTime = (minuteValue) => {
  if (!minuteValue && minuteValue !== 0) return '--'
  if (minuteValue < 1) return `${Math.round(minuteValue * 60)}s`
  return `${minuteValue.toFixed(1)}m`
}

const PulseMoment = ({ delivery, isVisible, onComplete }) => {
  const [countValues, setCountValues] = useState({ time: 0, xp: 0, streak: 0 })
  const controls = useAnimation()

  const stats = useMemo(() => {
    const baseXp = Math.max(50, Math.round((delivery?.timeSpent ?? 20) * 2))
    return [
      {
        label: 'Speed blitz',
        value: formatTime(delivery?.timeSpent ?? 0),
        key: 'time',
      },
      {
        label: 'XP earned',
        value: baseXp,
        key: 'xp',
      },
      {
        label: 'Hot streak',
        value: delivery?.streak ?? 0,
        key: 'streak',
      },
    ]
  }, [delivery])

  useEffect(() => {
    if (!isVisible) return

    controls.start('animate')

    confetti({
      origin: { x: 0.2, y: 0.1 },
      spread: 70,
      particleCount: 120,
      colors: ['#34d399', '#a855f7', '#22d3ee', '#f97316'],
    })
    confetti({
      origin: { x: 0.8, y: 0.1 },
      spread: 70,
      particleCount: 120,
      colors: ['#34d399', '#a855f7', '#22d3ee', '#f97316'],
    })

    if (typeof navigator?.vibrate === 'function') {
      navigator.vibrate([40, 30, 60])
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const mainOsc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    mainOsc.type = 'triangle'
    mainOsc.frequency.setValueAtTime(600, audioCtx.currentTime)
    mainOsc.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4)
    mainOsc.connect(gain)
    gain.connect(audioCtx.destination)
    mainOsc.start()
    mainOsc.stop(audioCtx.currentTime + 0.45)

    const startTime = performance.now()
    const duration = 1500

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCountValues({
        time: (delivery?.timeSpent ?? 0) * progress,
        xp: (stats[1].value ?? 0) * progress,
        streak: (delivery?.streak ?? 0) * progress,
      })
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    const timeout = setTimeout(() => {
      onComplete?.()
    }, 4000)

    return () => {
      clearTimeout(timeout)
      audioCtx.close()
    }
  }, [isVisible, controls, delivery, stats, onComplete])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-live="assertive"
        key="pulse"
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onComplete}
      >
        <motion.div
          className="absolute h-64 w-64 rounded-full bg-emerald-400/30"
          variants={rippleVariants}
          animate={controls}
        />

        <motion.div
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-400/60 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/60 p-8 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)]"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div variants={iconVariants}>
              <CheckCircle className="h-16 w-16 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-4xl font-black tracking-tight text-transparent"
            >
              ✨ DELIVERED! ✨
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-sm uppercase tracking-[0.35em] text-emerald-200/70"
            >
              {delivery?.dcNumber ?? 'DC —'} • {delivery?.hospital ?? 'Hospital'}
            </motion.p>
          </div>

          <motion.div
            className="mt-6 grid gap-3 sm:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.12, delayChildren: 0.5 },
              },
            }}
          >
            {stats.map((stat, index) => {
              const palette = statPalette[index % statPalette.length]
              const value =
                stat.key === 'time'
                  ? formatTime(countValues.time)
                  : Math.round(countValues[stat.key] || 0)
              const Icon = palette.icon
              return (
                <motion.div
                  key={stat.label}
                  className={`rounded-2xl border px-4 py-4 text-left ${palette.bg}`}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                >
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60">
                    <Icon className="h-4 w-4" />
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">{value}</div>
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div
            className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {delivery?.location ?? 'GPS locked and logged'}
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">{delivery?.staffName ?? 'Your crew'} crushing it! 🔥</div>
          </motion.div>

          <motion.div
            className="mt-8 text-center text-xs text-emerald-200/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            Tap anywhere to keep the momentum going ⚡
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PulseMoment
