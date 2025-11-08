import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const DeliveryApp = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [consignments, setConsignments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [location, setLocation] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [proofFile, setProofFile] = useState(null)

  const loadConsignments = async () => {
    if (!profile?.id) return
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('consignments')
        .select(
          'id, dc_number, hospital:hospitals(name, city), branch:branches(name), total_value, status, consignment_items(id, quantity, product:products(brand_name, size)), delivery_latitude, delivery_longitude, delivery_timestamp',
        )
        .eq('delivery_staff_id', profile.id)
        .not('status', 'eq', 'delivered')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setConsignments(data ?? [])
      if (!selectedId && data?.length) {
        setSelectedId(data[0].id)
      }
    } catch (err) {
      setError(err.message ?? 'Unable to load consignments.')
    }
  }

  useEffect(() => {
    loadConsignments()
  }, [profile?.id])

  useEffect(() => {
    const checkPINExpiry = async () => {
      if (!profile?.id) return

      const { data, error } = await supabase
        .from('users')
        .select('pin_last_changed_at, pin_created_at')
        .eq('id', profile.id)
        .single()

      if (error || !data) return

      const lastChanged = data.pin_last_changed_at || data.pin_created_at
      if (!lastChanged) return

      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      if (new Date(lastChanged) < threeMonthsAgo) {
        navigate('/change-pin', {
          replace: true,
          state: { message: 'Your PIN has expired. Please change it.' },
        })
      }
    }

    checkPINExpiry()
  }, [profile?.id, navigate])

  const selected = useMemo(
    () => consignments.find((consignment) => consignment.id === selectedId),
    [consignments, selectedId],
  )

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date(position.timestamp),
        })
        setError('')
      },
      () => setError('Unable to retrieve GPS coordinates.'),
      { enableHighAccuracy: true },
    )
  }

  const uploadProof = async (file) => {
    if (!file || !selected) return null
    try {
      setUploading(true)
      const extension = file.name.split('.').pop()
      const path = `proofs/${selected.id}-${Date.now()}.${extension}`
      const { data, error: uploadError } = await supabase.storage
        .from('delivery-proofs')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('delivery-proofs')
        .getPublicUrl(data.path)

      return publicUrlData?.publicUrl ?? null
    } finally {
      setUploading(false)
    }
  }

  const completeDelivery = async (file) => {
    if (!selected) return
    if (!location) {
      setError('Capture GPS location before completing delivery.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      let proofUrl = selected.signed_proof_url ?? null
      if (file) {
        proofUrl = await uploadProof(file)
      }

      const { error: updateError } = await supabase
        .from('consignments')
        .update({
          status: 'delivered',
          delivery_latitude: location.latitude,
          delivery_longitude: location.longitude,
          delivery_timestamp: location.timestamp?.toISOString() ?? new Date().toISOString(),
          signed_proof_url: proofUrl,
        })
        .eq('id', selected.id)

      if (updateError) throw updateError

      setSuccess('Consignment marked as delivered!')
      setSelectedId(null)
      setLocation(null)
      setProofFile(null)
      await loadConsignments()
    } catch (err) {
      setError(err.message ?? 'Unable to update delivery status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-950/95 pb-24">
      <header className="mt-4 px-4">
        <h2 className="text-xl font-semibold text-white">Delivery Route</h2>
        <p className="text-sm text-white/60">
          Large, mobile-friendly controls for quick fulfilment.
        </p>
      </header>

      {(error || success) && (
        <div
          className={`mx-4 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error || success}
        </div>
      )}

      <section className="flex flex-col gap-4 px-4">
        <FluentCard glass className="p-0">
          <div className="rounded-2xl bg-primary/20 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">Assigned Consignments</h3>
          </div>
          <div className="flex flex-col">
            {consignments.map((consignment) => (
              <button
                key={consignment.id}
                onClick={() => setSelectedId(consignment.id)}
                className={`flex flex-col gap-1 border-b border-white/5 px-6 py-4 text-left transition ${
                  consignment.id === selectedId ? 'bg-primary/10' : 'hover:bg-white/5'
                }`}
              >
                <span className="text-lg font-semibold text-white">
                  {consignment.hospital?.name ?? 'Hospital'}
                </span>
                <span className="text-sm text-white/50">
                  {consignment.dc_number} • ₹{Number(consignment.total_value ?? 0).toLocaleString()}
                </span>
              </button>
            ))}
            {!consignments.length && (
              <p className="px-6 py-5 text-center text-sm text-white/60">
                No consignments assigned.
              </p>
            )}
          </div>
        </FluentCard>

        {selected && (
          <FluentCard glass>
            <h3 className="text-lg font-semibold text-white">Delivery Details</h3>
            <div className="mt-3 text-sm text-white/70">
              <p>
                Hospital:{' '}
                <strong className="text-white">{selected.hospital?.name ?? '-'}</strong>
              </p>
              <p>
                DC Number: <strong className="text-white">{selected.dc_number}</strong>
              </p>
              <p>Status: {selected.status}</p>
              <p>Total Value: ₹{Number(selected.total_value ?? 0).toLocaleString()}</p>
            </div>

            <div className="mt-4">
              <h4 className="text-sm uppercase tracking-widest text-white/40">Products</h4>
              <div className="mt-3 flex flex-col gap-3">
                {selected.consignment_items?.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-white">
                      {item.product?.brand_name}
                    </p>
                    <p className="text-xs text-white/60">
                      Size: {item.product?.size} • Quantity: {item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                onClick={requestLocation}
                className="rounded-3xl bg-primary px-4 py-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                {location ? 'GPS Captured ✅' : 'Capture GPS Location'}
              </button>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/70 transition hover:border-primary hover:text-primary">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.[0]) {
                      setProofFile(event.target.files[0])
                      setSuccess(`Photo ready: ${event.target.files[0].name}`)
                      setError('')
                    }
                  }}
                />
                {uploading ? 'Uploading...' : proofFile ? 'Change Photo' : 'Upload Signed DC'}
              </label>
            </div>

            <button
              onClick={async () => {
                await completeDelivery(proofFile)
              }}
              disabled={saving}
              className="mt-5 w-full rounded-3xl bg-emerald-500 px-4 py-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Mark as Delivered'}
            </button>
          </FluentCard>
        )}
      </section>
    </div>
  )
}

export default DeliveryApp

