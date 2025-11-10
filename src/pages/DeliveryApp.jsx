import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { Package, MapPin, CheckCircle } from 'lucide-react'
import PulseMoment from '../components/PulseMoment.jsx'

const STATUS_CONFIG = {
  prepared: { label: 'Pending', badge: 'bg-orange-500/20 text-orange-400' },
  in_transit: { label: 'In Transit', badge: 'bg-yellow-500/20 text-yellow-400' },
  delivered: { label: 'Delivered', badge: 'bg-emerald-500/20 text-emerald-300' },
}

const calculateTotalValue = (consignment) => {
  if (typeof consignment?.total_value === 'number' && !Number.isNaN(consignment.total_value)) {
    return consignment.total_value
  }
  return (consignment?.items ?? []).reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0)
    const unitPrice = Number(item.unit_price ?? 0)
    return sum + quantity * unitPrice
  }, 0)
}

const DeliveryApp = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [staffUser, setStaffUser] = useState(null)
  const [consignments, setConsignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState('')
  const [bannerTone, setBannerTone] = useState('info')
  const [pulseMoment, setPulseMoment] = useState({ visible: false, delivery: null })

  const resolveUser = useCallback(() => {
    if (profile?.role === 'delivery') {
      return {
        id: profile.id,
        name: profile.full_name,
        role: profile.role,
        owner_id: profile.owner_id,
      }
    }
    const stored = JSON.parse(localStorage.getItem('staff_user') || '{}')
    if (stored?.role === 'delivery') {
      return stored
    }
    return null
  }, [profile])

  const fetchAssignedConsignments = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('consignments')
        .select(
          `
          id,
          dc_number,
          created_at,
          status,
          total_value,
          hospital:hospitals(id, name, address, city, state, contact_person, contact_phone),
          items:consignment_items(id, item_name, brand_name, quantity, unit_price),
          signed_proof_url
        `,
        )
        .eq('delivery_staff_id', userId)
        .in('status', ['prepared', 'in_transit'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setConsignments(data ?? [])
    } catch (err) {
      console.error('Error fetching consignments', err)
      setBanner(err.message ?? 'Unable to load consignments.')
      setBannerTone('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const resolved = resolveUser()
    setStaffUser(resolved)

    if (!resolved?.id) {
      setLoading(false)
      navigate('/staff/login', { replace: true })
      return
    }

    fetchAssignedConsignments(resolved.id)
  }, [resolveUser, fetchAssignedConsignments, navigate])

  const stats = useMemo(() => {
    const pending = consignments.filter((c) => c.status === 'prepared').length
    const inTransit = consignments.filter((c) => c.status === 'in_transit').length
    return {
      total: consignments.length,
      pending,
      inTransit,
    }
  }, [consignments])

  const handleComplete = useCallback(
    async (consignment) => {
      if (!staffUser?.id) {
        alert('❌ Unable to identify staff user. Please log in again.')
        navigate('/staff/login', { replace: true })
        return
      }

      if (!navigator.geolocation) {
        alert('❌ This device does not support GPS. Use a GPS-enabled device.')
        return
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          })
        })

        const { latitude, longitude } = position.coords
        const confirmMsg = `Mark delivery as complete?\nGPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        if (!window.confirm(confirmMsg)) return

        const { error } = await supabase
          .from('consignments')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            delivery_latitude: latitude,
            delivery_longitude: longitude,
            delivery_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            delivery_road_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          })
          .eq('id', consignment.id)
          .eq('delivery_staff_id', staffUser.id)

        if (error) throw error

        const durationMinutes = (() => {
          const created = new Date(consignment.created_at ?? new Date())
          return (Date.now() - created.getTime()) / 60000
        })()

        setPulseMoment({
          visible: true,
          delivery: {
            dcNumber: consignment.dc_number,
            hospital: consignment.hospital?.name,
            timeSpent: durationMinutes,
            location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            staffName: staffUser.name,
            streak: (consignment.streak ?? 0) + 1,
          },
        })

        alert('✅ Delivery marked complete')
        await fetchAssignedConsignments(staffUser.id)
        setBanner('Delivery marked complete. You’re on fire 🔥')
        setBannerTone('success')
      } catch (err) {
        console.error('Delivery completion failed', err)
        alert('❌ Could not complete delivery. Please enable GPS.')
        setBanner(err.message ?? 'Unable to complete delivery. Enable GPS and try again.')
        setBannerTone('error')
      }
    },
    [staffUser, fetchAssignedConsignments, navigate],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p>Loading your route…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600 to-purple-600 p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">Delivery Route</p>
              <h1 className="text-3xl font-bold md:text-4xl">Hi {staffUser?.name ?? 'Team'}</h1>
              <p className="text-sm text-white/70">
                Capture GPS once and mark the delivery complete. Works great on desktop and mobile.
              </p>
            </div>
            <div className="rounded-full bg-white/15 p-4 md:p-5">
              <Package size={36} className="text-white" />
            </div>
          </div>
        </header>

        {banner && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              bannerTone === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {banner}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <StatPanel label="Active Deliveries" value={stats.total} tone="blue" />
          <StatPanel label="In Transit" value={stats.inTransit} tone="amber" />
          <StatPanel label="Pending" value={stats.pending} tone="pink" />
        </section>

        <section className="space-y-4">
          {consignments.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
              All deliveries are complete. Await your next assignment.
            </div>
          ) : (
            consignments.map((consignment) => (
              <DeliveryCard key={consignment.id} consignment={consignment} onComplete={handleComplete} />
            ))
          )}
        </section>
      </div>
      <PulseMoment
        isVisible={pulseMoment.visible}
        onComplete={() => setPulseMoment({ visible: false, delivery: null })}
        delivery={pulseMoment.delivery}
      />
    </div>
  )
}

const StatPanel = ({ label, value, tone }) => {
  const toneMap = {
    blue: 'from-blue-500/20 via-blue-500/10 to-blue-500/5 text-blue-100',
    amber: 'from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-100',
    pink: 'from-pink-500/20 via-pink-500/10 to-pink-500/5 text-pink-100',
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br p-5 backdrop-blur ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

const DeliveryCard = ({ consignment, onComplete }) => {
  const statusConfig = STATUS_CONFIG[consignment.status] ?? STATUS_CONFIG.prepared
  const totalValue = calculateTotalValue(consignment)
  const createdAt = consignment.created_at
    ? new Date(consignment.created_at).toLocaleString('en-IN')
    : '—'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">Delivery Challan</p>
          <h2 className="text-2xl font-semibold text-white">{consignment.dc_number ?? `DC-${consignment.id.slice(-6)}`}</h2>
          <p className="text-sm text-white/60">Created at {createdAt}</p>
          <p className="text-sm text-white/60">
            {consignment.hospital?.name ?? '—'} • ₹{Number(totalValue).toLocaleString('en-IN')}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.badge}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">Hospital</h3>
            <p className="mt-2 font-semibold text-white">{consignment.hospital?.name ?? '—'}</p>
            <p className="text-sm text-white/60">{consignment.hospital?.address}</p>
            <p className="text-sm text-white/60">
              {consignment.hospital?.city}, {consignment.hospital?.state}
            </p>
            {consignment.hospital?.contact_person && (
              <p className="text-xs text-blue-200">Contact: {consignment.hospital.contact_person}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">Items</h3>
            <div className="mt-2 space-y-2 text-sm text-white/70">
              {consignment.items?.slice(0, 3).map((item) => (
                <p key={item.id}>
                  • {item.item_name} {item.brand_name ? `(${item.brand_name})` : ''} — Qty {item.quantity}
                </p>
              ))}
              {consignment.items?.length > 3 && (
                <p className="text-xs text-blue-200">+{consignment.items.length - 3} more items</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="space-y-4 text-sm text-white/70">
            <p className="flex items-center gap-2 text-white">
              <MapPin size={18} className="text-blue-300" />
              GPS will be captured automatically on completion
            </p>
            <p className="text-xs text-white/50">
              Ensure you are at the delivery location before marking it complete.
            </p>
          </div>

          <button
            onClick={() => onComplete(consignment)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-4 text-sm font-semibold text-white transition hover:shadow-lg active:scale-95"
          >
            <CheckCircle size={18} /> Complete Delivery
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeliveryApp

