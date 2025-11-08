import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const StatCard = ({ label, value, accent }) => (
  <FluentCard
    glass
    className={`flex flex-col gap-3 ${accent ? 'border-primary/30 bg-primary/20' : ''}`}
  >
    <span className="text-xs uppercase tracking-widest text-white/50">{label}</span>
    <span className="text-2xl font-semibold text-white/90">{value}</span>
  </FluentCard>
)

const QuickActionButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/15 p-4 text-left text-sm text-white/80 transition hover:-translate-y-1 hover:bg-primary/25"
  >
    <span className="text-lg font-semibold text-white">{label}</span>
    <span className="text-xs text-white/60">
      Manage {label.toLowerCase()} with streamlined forms.
    </span>
  </button>
)

const OwnerDashboard = () => {
  const navigate = useNavigate()
  const { profile, ownerId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [consignments, setConsignments] = useState([])
  const [inventory, setInventory] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!ownerId) return
      setLoading(true)
      setError('')
      try {
        const [{ data: consignmentData, error: consignmentError }, { data: inventoryData, error: inventoryError }, { data: usersData, error: usersError }] =
          await Promise.all([
            supabase
              .from('consignments')
              .select(
                'id, hospital_id, status, total_value, dc_number, dispatched_at, delivered_at, created_at',
              )
              .eq('owner_id', ownerId)
              .order('created_at', { ascending: false })
              .limit(120),
            supabase
              .from('inventory')
              .select('id, quantity, product:products(id, brand_name, price)')
              .eq('owner_id', ownerId),
            supabase
              .from('users')
              .select('id, full_name, role, owner_id, manager_id')
              .eq('owner_id', ownerId),
          ])

        if (consignmentError || inventoryError || usersError) {
          throw consignmentError || inventoryError || usersError
        }

        setConsignments(consignmentData ?? [])
        setInventory(inventoryData ?? [])
        setUsers(usersData ?? [])
      } catch (err) {
        setError(err.message ?? 'Unable to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [ownerId])

  const totalConsignmentValue = useMemo(
    () =>
      consignments.reduce((total, cons) => total + Number(cons.total_value ?? 0), 0),
    [consignments],
  )

  const deliveredThisMonth = useMemo(() => {
    const now = new Date()
    return consignments
      .filter((cons) => {
        if (!cons.delivered_at) return false
        const delivered = new Date(cons.delivered_at)
        return delivered.getMonth() === now.getMonth() && delivered.getFullYear() === now.getFullYear()
      })
      .length
  }, [consignments])

  const inTransitCount = useMemo(
    () => consignments.filter((cons) => cons.status === 'in_transit').length,
    [consignments],
  )

  const stockValue = useMemo(
    () =>
      inventory.reduce((total, item) => {
        const price = Number(item.product?.price ?? 0)
        return total + price * Number(item.quantity ?? 0)
      }, 0),
    [inventory],
  )

  const statusDistribution = useMemo(() => {
    const counts = consignments.reduce((acc, cons) => {
      const key = cons.status ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts).map(([status, value]) => ({
      status,
      value,
    }))
  }, [consignments])

  const monthTrends = useMemo(() => {
    const bucket = consignments.reduce((acc, cons) => {
      const created = new Date(cons.created_at ?? cons.dispatched_at ?? Date.now())
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
      if (!acc[key]) {
        acc[key] = { month: key, delivered: 0, value: 0 }
      }
      if (cons.status === 'delivered') {
        acc[key].delivered += 1
        acc[key].value += Number(cons.total_value ?? 0)
      }
      return acc
    }, {})

    return Object.values(bucket)
      .sort((a, b) => (a.month > b.month ? 1 : -1))
      .slice(-6)
  }, [consignments])

  const topHospitals = useMemo(() => {
    const sums = consignments.reduce((acc, cons) => {
      if (!cons.hospital_id) return acc
      acc[cons.hospital_id] = (acc[cons.hospital_id] ?? 0) + Number(cons.total_value ?? 0)
      return acc
    }, {})

    return Object.entries(sums)
      .map(([hospitalId, total]) => ({
        hospital: hospitalId,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [consignments])

  const recentConsignments = useMemo(() => consignments.slice(0, 6), [consignments])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Owner Dashboard
        </h2>
        <p className="text-sm text-white/60">
          Welcome back {profile?.full_name ?? profile?.email}. Here is a snapshot of your operations.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Consignments Value" value={`₹${totalConsignmentValue.toLocaleString()}`} accent />
        <StatCard label="Delivered This Month" value={deliveredThisMonth} />
        <StatCard label="In Transit" value={inTransitCount} />
        <StatCard label="Total Stock Value" value={`₹${stockValue.toLocaleString()}`} />
      </div>

      <FluentCard glass className="grid gap-4 sm:grid-cols-4">
        <QuickActionButton label="Add Staff" onClick={() => navigate('/owner/staff')} />
        <QuickActionButton label="Add Branch" onClick={() => navigate('/owner/branches')} />
        <QuickActionButton label="Add Hospital" onClick={() => navigate('/owner/hospitals')} />
        <QuickActionButton label="View Reports" onClick={() => navigate('/owner/reports')} />
      </FluentCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <FluentCard glass className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Monthly Delivery Trends</h3>
            <span className="text-xs uppercase text-white/40">Last 6 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.3)' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FluentCard>

        <FluentCard glass>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Consignments by Status</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="status"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  fill="#8884d8"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.3)' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </FluentCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FluentCard glass>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Top Hospitals by Value</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHospitals}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hospital" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.3)' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="total" fill="#2563EB" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FluentCard>

        <FluentCard glass>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Consignments</h3>
            <span className="text-xs text-white/40">Latest updates</span>
          </div>
          <div className="flex flex-col gap-3">
            {recentConsignments.map((consignment) => (
              <div
                key={consignment.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {consignment.dc_number ?? `#${consignment.id.slice(-6)}`}
                  </p>
                  <p className="text-xs text-white/50">
                    {new Date(consignment.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                    consignment.status === 'delivered'
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : consignment.status === 'in_transit'
                        ? 'bg-amber-400/10 text-amber-300'
                        : 'bg-slate-400/10 text-slate-200'
                  }`}
                >
                  {consignment.status ?? 'unknown'}
                </span>
              </div>
            ))}
            {!recentConsignments.length && (
              <p className="text-center text-sm text-white/50">No consignments found yet.</p>
            )}
          </div>
        </FluentCard>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-light border-t-primary"></div>
        </div>
      )}
    </div>
  )
}

export default OwnerDashboard

