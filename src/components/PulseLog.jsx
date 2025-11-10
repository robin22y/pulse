import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck,
  DollarSign,
  Flame,
  Zap,
  RefreshCw,
  Trophy,
  Share2,
  Smile,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const REACTION_SET = ['❤️', '👍', '🔥', '⚡', '🎉']

const typePalette = {
  delivery_complete: { bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-400/40', icon: Truck },
  payment_received: { bg: 'from-green-500/20 to-green-500/5', border: 'border-green-400/40', icon: DollarSign },
  streak_milestone: { bg: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-400/40', icon: Flame },
  speed_record: { bg: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-400/40', icon: Zap },
  customer_reorder: { bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-400/40', icon: RefreshCw },
  daily_target_hit: { bg: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-400/40', icon: Trophy },
}

const buildMessage = (event) => {
  const data = event.data || {}
  switch (event.type) {
    case 'delivery_complete':
      return `DC ${data.dc_number ?? ''} dropped at ${data.hospital ?? 'hospital'} by ${data.staff ?? 'team'}`.trim()
    case 'payment_received':
      return `${data.hospital ?? 'Hospital'} paid ₹${Number(data.amount ?? 0).toLocaleString('en-IN')} via ${
        (data.method ?? '').replace('_', ' ')
      }`
    case 'streak_milestone':
      return `${data.staff ?? 'Team'} hit a ${data.streak ?? 0}-day streak!`
    case 'speed_record':
      return `${data.staff ?? 'Crew'} smashed delivery in ${Number(data.time_spent ?? 0).toFixed(1)} mins`
    case 'customer_reorder':
      return `${data.hospital ?? 'Hospital'} reordered again. Loyalty locked in!`
    case 'daily_target_hit':
      return `Team crushed today’s target with ${data.deliveries ?? 0} drops`
    default:
      return 'Big move made!'
  }
}

const timeAgo = (timestamp) => {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const PulseEvent = ({ event, onReact, onShare }) => {
  const palette = typePalette[event.type] ?? typePalette.delivery_complete
  const Icon = palette.icon
  const reactions = event.reactions || {}

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-3xl border ${palette.border} bg-gradient-to-br ${palette.bg} p-5 text-white shadow-lg backdrop-blur`}
    >
      <div className="flex items-start gap-4">
        <motion.div
          initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 12 }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20"
        >
          <Icon className="h-7 w-7" />
        </motion.div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm text-white/70">
            <span className="uppercase tracking-[0.3em] text-xs text-white/50">{event.type.replace('_', ' ')}</span>
            <span>{timeAgo(event.created_at)}</span>
          </div>
          <p className="text-lg font-semibold text-white">{buildMessage(event)}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-white/80">
            <button
              type="button"
              onClick={() => onReact(event.id)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <Smile size={14} /> React
            </button>
            <button
              type="button"
              onClick={() => onShare(event)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <Share2 size={14} /> Share
            </button>
            {Object.keys(reactions).length > 0 && (
              <div className="inline-flex items-center gap-2 text-xs text-white/70">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <span key={emoji} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

const PulseLog = () => {
  const { ownerId } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReactionsFor, setShowReactionsFor] = useState(null)

  useEffect(() => {
    if (!ownerId) return

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('pulse_events')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!error) {
        setEvents(data ?? [])
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`pulse-events-${ownerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pulse_events', filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ownerId])

  const handleReact = async (eventId) => {
    setShowReactionsFor(eventId === showReactionsFor ? null : eventId)
  }

  const addReaction = async (eventId, emoji) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              reactions: {
                ...event.reactions,
                [emoji]: (event.reactions?.[emoji] ?? 0) + 1,
              },
            }
          : event,
      ),
    )

    await supabase.rpc('add_pulse_reaction', { p_event_id: eventId, p_reaction: emoji })
    setShowReactionsFor(null)
  }

  const handleShare = async (event) => {
    const message = `${buildMessage(event)}\n\nPowered by Pulse by DigiGet`
    if (navigator.share) {
      try {
        await navigator.share({ text: message })
        return
      } catch (error) {
        console.info('Share cancelled', error)
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const ReactionPicker = useMemo(() => {
    if (!showReactionsFor) return null
    return (
      <motion.div
        key="picker"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
        onClick={() => setShowReactionsFor(null)}
      >
        <motion.div
          className="flex gap-3 rounded-3xl bg-white/90 px-6 py-4 text-2xl shadow-2xl backdrop-blur"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          onClick={(event) => event.stopPropagation()}
        >
          {REACTION_SET.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addReaction(showReactionsFor, emoji)}
              className="transition hover:scale-110"
              type="button"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      </motion.div>
    )
  }, [showReactionsFor])

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">PulseLog</h3>
          <p className="text-sm text-white/60">Auto-generated wins from across the business.</p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-28 animate-pulse rounded-3xl bg-white/10"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
          <TrendingUp className="h-8 w-8" />
          Nothing here yet! Time to make some noise 💪
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {events.map((event) => (
              <PulseEvent key={event.id} event={event} onReact={handleReact} onShare={handleShare} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>{ReactionPicker}</AnimatePresence>
    </div>
  )
}

export const PulseLogWidget = () => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
    <PulseLog />
  </div>
)

export default PulseLog
