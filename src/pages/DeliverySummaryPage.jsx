import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import FluentCard from '../components/FluentCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import DCPreview from '../components/DCPreview.jsx'
import { Download, MapPin, Search } from 'lucide-react'

const toISODate = (date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString().slice(0, 10)
}

const getStartOfWeek = (date) => {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const getEndOfWeek = (date) => {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(0, 0, 0, 0)
  return end
}

const getStartOfMonth = (date) => {
  const copy = new Date(date.getFullYear(), date.getMonth(), 1)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const getEndOfMonth = (date) => {
  const copy = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' },
]

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Prepared', value: 'prepared' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
]

const DEFAULT_RANGE = () => {
  const today = new Date()
  const start = toISODate(today)
  return { start, end: start }
}

const resolvePresetRange = (preset) => {
  const today = new Date()
  switch (preset) {
    case 'today':
      return DEFAULT_RANGE()
    case 'week': {
      const start = getStartOfWeek(today)
      const end = getEndOfWeek(today)
      return {
        start: toISODate(start),
        end: toISODate(end),
      }
    }
    case 'month': {
      const start = getStartOfMonth(today)
      const end = getEndOfMonth(today)
      return {
        start: toISODate(start),
        end: toISODate(end),
      }
    }
    default:
      return DEFAULT_RANGE()
  }
}

const DeliverySummaryPage = () => {
  const { ownerId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveries, setDeliveries] = useState([])
  const [staffMembers, setStaffMembers] = useState([])
  const [hospitals, setHospitals] = useState([])

  const [filters, setFilters] = useState({
    preset: 'today',
    start: DEFAULT_RANGE().start,
    end: DEFAULT_RANGE().end,
    staffId: 'all',
    status: 'all',
    hospital: '',
  })

  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [consignmentDetail, setConsignmentDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!ownerId) return

    const loadInitialData = async () => {
      setLoading(true)
      setError('')
      try {
        const [{ data: deliveryRows, error: deliveryError }, { data: staffRows, error: staffError }, { data: hospitalRows, error: hospitalError }] =
          await Promise.all([
            supabase
              .from('delivery_summary_view')
              .select('*')
              .eq('owner_id', ownerId)
              .order('delivered_at', { ascending: false }),
            supabase
              .from('users')
              .select('id, full_name')
              .eq('owner_id', ownerId)
              .in('role', ['delivery', 'manager', 'staff']),
            supabase
              .from('hospitals')
              .select('id, name')
              .eq('owner_id', ownerId)
              .order('name'),
          ])

        if (deliveryError || staffError || hospitalError) {
          throw deliveryError ?? staffError ?? hospitalError
        }

        setDeliveries(deliveryRows ?? [])
        setStaffMembers(staffRows ?? [])
        setHospitals(hospitalRows ?? [])
      } catch (err) {
        console.error('Failed to load delivery summary', err)
        setError(err.message ?? 'Unable to load deliveries')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [ownerId])

  const appliedDateRange = useMemo(() => {
    if (filters.preset === 'custom') {
      return {
        start: filters.start,
        end: filters.end,
      }
    }
    return resolvePresetRange(filters.preset)
  }, [filters])

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery) => {
      const deliveredAt = delivery.delivered_at ? new Date(delivery.delivered_at) : null
      const createdAt = delivery.created_at ? new Date(delivery.created_at) : null
      const withinRange = (() => {
        if (!appliedDateRange.start || !appliedDateRange.end) return true
        const startDate = new Date(appliedDateRange.start)
        const endDate = new Date(appliedDateRange.end)
        endDate.setHours(23, 59, 59, 999)
        const compareDate = deliveredAt ?? createdAt
        if (!compareDate) return true
        return compareDate >= startDate && compareDate <= endDate
      })()

      if (!withinRange) return false

      if (filters.staffId !== 'all' && delivery.delivery_staff_id !== filters.staffId) {
        return false
      }

      if (filters.status !== 'all') {
        const status = delivery.status ?? 'prepared'
        if (status !== filters.status) return false
      }

      if (filters.hospital?.trim()) {
        const term = filters.hospital.trim().toLowerCase()
        const name = delivery.hospital_name?.toLowerCase() ?? ''
        if (!name.includes(term)) return false
      }

      return true
    })
  }, [deliveries, appliedDateRange, filters])

  const stats = useMemo(() => {
    const total = filteredDeliveries.length
    const inTransit = filteredDeliveries.filter((row) => row.status === 'in_transit').length
    const pending = filteredDeliveries.filter((row) => row.status === 'prepared').length
    const deliveredToday = filteredDeliveries.filter((row) => {
      if (!row.delivered_at) return false
      const deliveredDate = new Date(row.delivered_at)
      const today = new Date()
      return deliveredDate.toDateString() === today.toDateString()
    }).length
    return {
      total,
      inTransit,
      deliveredToday,
      pending,
    }
  }, [filteredDeliveries])

  const handlePresetChange = (value) => {
    if (value === 'custom') {
      setFilters((prev) => ({ ...prev, preset: value }))
    } else {
      const range = resolvePresetRange(value)
      setFilters((prev) => ({ ...prev, preset: value, start: range.start, end: range.end }))
    }
  }

  const openDeliveryModal = async (delivery) => {
    if (!delivery) return
    setSelectedDelivery(delivery)
    setDetailLoading(true)
    setConsignmentDetail(null)

    const consignmentId = delivery.id ?? delivery.consignment_id
    if (!consignmentId) {
      setDetailLoading(false)
      return
    }

    try {
      const [{ data: consignment, error: consignmentError }, { data: settings, error: settingsError }] = await Promise.all([
        supabase
          .from('consignments')
          .select(
            `id, dc_number, status, billing_status, payment_status, total_value, created_at, delivered_at, delivery_road_name,
             hospital:hospitals(*),
             branch:branches(*),
             items:consignment_items(id, item_name, brand_name, size, quantity, unit_price, tax_percentage, manufacturing_date, expiry_date, batch_number),
             payments:payment_records(id, payment_amount, payment_method, payment_reference, payment_date, notes,
               received_by_user:users!payment_records_received_by_fkey(full_name))
            `,
          )
          .eq('id', consignmentId)
          .maybeSingle(),
        supabase
          .from('owner_settings')
          .select('*')
          .eq('owner_id', ownerId)
          .maybeSingle(),
      ])

      if (consignmentError) throw consignmentError
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError

      setConsignmentDetail({ consignment, settings })
    } catch (err) {
      console.error('Failed to load consignment detail', err)
      setError(err.message ?? 'Unable to open delivery details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedDelivery(null)
    setConsignmentDetail(null)
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Delivery Overview" description="Monitor field completions and proof of delivery." />

      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">Delivery Summary</h1>
        <p className="text-blue-100">Track completed deliveries and status updates</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <FluentCard glass className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              {DATE_PRESETS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handlePresetChange(item.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    filters.preset === item.value ? 'border-primary bg-primary/20 text-white' : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {filters.preset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.start}
                  onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
                <input
                  type="date"
                  value={filters.end}
                  onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Delivery Staff</label>
            <select
              value={filters.staffId}
              onChange={(event) => setFilters((prev) => ({ ...prev, staffId: event.target.value }))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All Staff</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Status</label>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Hospital</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={filters.hospital}
                onChange={(event) => setFilters((prev) => ({ ...prev, hospital: event.target.value }))}
                placeholder="Search hospital"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filters.hospital && (
          <div className="flex flex-wrap gap-2 text-xs text-white/60">
            <span>Matching: {hospitals.filter((h) => h.name?.toLowerCase().includes(filters.hospital.trim().toLowerCase())).length} hospitals</span>
          </div>
        )}
      </FluentCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total Deliveries" value={stats.total} tone="blue" />
        <StatTile label="In Transit" value={stats.inTransit} tone="amber" />
        <StatTile label="Delivered Today" value={stats.deliveredToday} tone="emerald" />
        <StatTile label="Pending" value={stats.pending} tone="pink" />
      </div>

      <FluentCard glass className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">DC Number</th>
                <th className="px-4 py-3 text-left">Hospital</th>
                <th className="px-4 py-3 text-left">Delivery Staff</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Dispatched</th>
                <th className="px-4 py-3 text-left">Delivered</th>
                <th className="px-4 py-3 text-left">Delivery Address</th>
                <th className="px-4 py-3 text-left">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-white/60">
                    Loading deliveries...
                  </td>
                </tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-white/60">
                    No deliveries found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => {
                  const dispatchedAt = delivery.dispatched_at
                    ? new Date(delivery.dispatched_at).toLocaleString('en-IN')
                    : '—'
                  const deliveredAt = delivery.delivered_at
                    ? new Date(delivery.delivered_at).toLocaleString('en-IN')
                    : '—'
                  const locationLabel = delivery.delivery_road_name
                    ? delivery.delivery_road_name
                    : delivery.delivery_latitude && delivery.delivery_longitude
                      ? `${Number(delivery.delivery_latitude || 0).toFixed(4)}, ${Number(delivery.delivery_longitude || 0).toFixed(4)}`
                      : '—'

                  return (
                    <tr key={delivery.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDeliveryModal(delivery)}
                          className="font-semibold text-blue-300 underline-offset-2 hover:text-blue-200 hover:underline"
                        >
                          {delivery.dc_number ?? `DC-${delivery.id?.slice(-6)}`}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{delivery.hospital_name ?? '—'}</p>
                        <p className="text-xs text-white/50">{delivery.hospital_city ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">{delivery.delivery_staff_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge type="delivery" status={delivery.status ?? 'prepared'} />
                      </td>
                      <td className="px-4 py-3">{dispatchedAt}</td>
                      <td className="px-4 py-3">{deliveredAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-blue-300" />
                          <span>{locationLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {delivery.signed_proof_url ? (
                          <button
                            onClick={() => window.open(delivery.signed_proof_url, '_blank', 'noopener')}
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                          >
                            <Download size={14} /> View
                          </button>
                        ) : (
                          <span className="text-white/40">No proof</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </FluentCard>

      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white hover:bg-white/20"
            >
              Close
            </button>
            <div className="h-[80vh] overflow-y-auto p-6">
              {detailLoading || !consignmentDetail ? (
                <div className="flex h-full items-center justify-center text-white/60">Loading delivery details...</div>
              ) : (
                <DCPreview
                  company={consignmentDetail.settings ?? {}}
                  hospital={consignmentDetail.consignment?.hospital ?? {}}
                  branch={consignmentDetail.consignment?.branch ?? {}}
                  dcNumber={consignmentDetail.consignment?.dc_number}
                  items={consignmentDetail.consignment?.items ?? []}
                  payments={consignmentDetail.consignment?.payments ?? []}
                  createdAt={consignmentDetail.consignment?.delivered_at ?? consignmentDetail.consignment?.created_at}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const StatTile = ({ label, value, tone }) => {
  const toneMap = {
    blue: 'from-blue-500/20 via-blue-500/10 to-blue-500/5 text-blue-100',
    amber: 'from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-100',
    emerald: 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 text-emerald-100',
    pink: 'from-pink-500/20 via-pink-500/10 to-pink-500/5 text-pink-100',
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br p-5 backdrop-blur ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default DeliverySummaryPage
