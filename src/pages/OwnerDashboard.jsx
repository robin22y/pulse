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
import {
  Menu,
  Plus,
  FileText,
  Package,
  ShoppingBag,
  Building2,
  Users,
  BarChart3,
  Settings,
  PackageSearch,
  PackagePlus,
} from 'lucide-react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import NavTile from '../components/dashboard/NavTile.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import RecentDCCard from '../components/dashboard/RecentDCCard.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import PulseLogo from '../components/PulseLogo.jsx'

const OwnerDashboard = () => {
  const navigate = useNavigate()
  const { profile, ownerId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [consignments, setConsignments] = useState([])
  const [inventory, setInventory] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [overview, setOverview] = useState({
    consignments: 0,
    deliveries: 0,
    staff: 0,
    inventoryValue: 0,
    products: 0,
    productsInStock: 0,
  })

  useEffect(() => {
    const load = async () => {
      if (!ownerId) return
      setLoading(true)
      setError('')
      try {
        const [
          { data: consignmentData, error: consignmentError },
          { data: deliveryData, error: deliveryError },
          { data: staffData, error: staffError },
          { data: inventoryData, error: inventoryError },
        ] = await Promise.all([
          supabase
            .from('consignments')
            .select(
              'id, hospital_id, status, total_value, dc_number, dispatched_at, delivered_at, created_at',
            )
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false })
            .limit(120),
          supabase
            .from('consignments')
            .select('id')
            .eq('owner_id', ownerId)
            .eq('status', 'delivered'),
          supabase
            .from('users')
            .select('id, full_name, role, owner_id, manager_id')
            .eq('owner_id', ownerId),
          supabase
            .from('stock_items')
            .select('quantity_available, unit_price')
            .eq('owner_id', ownerId),
        ])

        if (consignmentError || deliveryError || staffError || inventoryError) {
          throw consignmentError ?? deliveryError ?? staffError ?? inventoryError
        }

        let productTotals = { total_products: 0, products_in_stock: 0 }
        try {
          const { data: productStats, error: productError } = await supabase.rpc(
            'get_product_directory_stats',
            { p_owner_id: ownerId },
          )
          if (productError) {
            console.warn('get_product_directory_stats unavailable', productError)
          } else {
            productTotals = {
              total_products: productStats?.total_products ?? 0,
              products_in_stock: productStats?.products_in_stock ?? 0,
            }
          }
        } catch (rpcErr) {
          console.warn('Unable to load product directory stats', rpcErr)
        }

        setConsignments(consignmentData ?? [])
        setInventory(inventoryData ?? [])
        setUsers(staffData ?? [])
        setOverview({
          consignments: consignmentData?.length ?? 0,
          deliveries: deliveryData?.length ?? 0,
          staff: staffData?.length ?? 0,
          inventoryValue: inventoryData?.reduce((total, item) => {
            const price = Number(item.unit_price ?? 0)
            return total + price * Number(item.quantity_available ?? 0)
          }, 0) ?? 0,
          products: productTotals.total_products,
          productsInStock: productTotals.products_in_stock,
        })
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
        const price = Number(item.unit_price ?? 0)
        return total + price * Number(item.quantity_available ?? 0)
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

  const quickStats = [
    {
      label: 'Total Value',
      value: `₹${totalConsignmentValue.toLocaleString()}`,
      icon: PackageSearch,
      tone: 'blue',
    },
    {
      label: 'Delivered (30d)',
      value: deliveredThisMonth,
      icon: PackagePlus,
      tone: 'emerald',
    },
    {
      label: 'In Transit',
      value: inTransitCount,
      icon: Package,
      tone: 'amber',
    },
    {
      label: 'Inventory Value',
      value: `₹${stockValue.toLocaleString()}`,
      icon: ShoppingBag,
      tone: 'indigo',
    },
  ]

  const tiles = [
    { icon: Plus, label: 'New DC', subtitle: 'Create consignment', color: 'blue', to: '/consignments/create' },
    { icon: FileText, label: 'All DCs', subtitle: 'View & manage', color: 'indigo', to: '/owner/consignments' },
    { icon: Package, label: 'Stock', subtitle: 'Manage inventory', color: 'green', to: '/owner/stock' },
    { icon: ShoppingBag, label: 'Products', subtitle: 'Product catalog', color: 'purple', to: '/owner/products' },
    { icon: Building2, label: 'Hospitals', subtitle: 'Client list', color: 'cyan', to: '/owner/hospitals' },
    { icon: Users, label: 'Staff', subtitle: 'Team management', color: 'orange', to: '/owner/staff' },
    { icon: Settings, label: 'Settings', subtitle: 'Configure app', color: 'gray', to: '/owner/settings' },
  ]

  return (
    <>
      <PageHeader
        title="Owner Dashboard"
        description={`Welcome back ${profile?.full_name ?? profile?.email ?? ''}. Here is a snapshot of your operations.`}
        actions={null}
      />
      <div className="flex flex-col gap-6">
        {/* Mobile Experience */}
        <div className="mobile-dashboard flex flex-col bg-slate-950 md:hidden">
          <div className="space-y-6 pb-24 pt-6">
            {error && (
              <div className="mx-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <section className="no-scrollbar flex gap-3 overflow-x-auto px-4">
              {quickStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </section>

            <section className="px-4">
              <div className="grid grid-cols-2 gap-3">
                {tiles.map((tile) => (
                  <NavTile key={tile.label} {...tile} />
                ))}
              </div>
            </section>

            <section className="space-y-3 px-4">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-lg font-semibold">Recent DCs</h2>
                <button
                  onClick={() => navigate('/owner/consignments')}
                  className="text-xs font-medium text-blue-200 underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {recentConsignments.slice(0, 4).map((consignment) => (
                  <RecentDCCard
                    key={consignment.id}
                    dcNumber={consignment.dc_number ?? `#${consignment.id.slice(-6)}`}
                    createdAt={consignment.created_at}
                    status={consignment.status ?? 'prepared'}
                    value={consignment.total_value}
                  />
                ))}
                {!recentConsignments.length && (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                    No consignments yet. Create your first DC!
                  </p>
                )}
              </div>
            </section>

            <section className="px-4">
              <FluentCard glass className="bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">Monthly Trends</h3>
                  <span className="text-xs uppercase text-white/60">Last 6 months</span>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" stroke="#C7D2FE" hide />
                      <YAxis stroke="#C7D2FE" hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15,17,21,0.9)',
                          borderRadius: '1rem',
                          border: '1px solid rgba(148,163,184,0.3)',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#38BDF8" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </FluentCard>
            </section>
          </div>
        </div>

        {/* Desktop Experience */}
        <div className="hidden flex-col gap-6 md:flex">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Consignments Value" value={`₹${totalConsignmentValue.toLocaleString()}`} tone="blue" />
            <StatCard label="Delivered This Month" value={deliveredThisMonth} tone="emerald" />
            <StatCard label="In Transit" value={inTransitCount} tone="amber" />
            <StatCard label="Total Stock Value" value={`₹${stockValue.toLocaleString()}`} tone="indigo" />
          </div>

          <FluentCard glass className="grid gap-4 sm:grid-cols-4">
            <button
              onClick={() => navigate('/owner/staff')}
              className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/15 p-4 text-left text-sm text-white/80 transition hover:-translate-y-1 hover:bg-primary/25"
            >
              <span className="text-lg font-semibold text-white">Add Staff</span>
              <span className="text-xs text-white/60">Manage staff onboarding and approvals.</span>
            </button>
            <button
              onClick={() => navigate('/owner/branches')}
              className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/15 p-4 text-left text-sm text-white/80 transition hover:-translate-y-1 hover:bg-primary/25"
            >
              <span className="text-lg font-semibold text-white">Add Branch</span>
              <span className="text-xs text-white/60">Create new branches and assign staff.</span>
            </button>
            <button
              onClick={() => navigate('/owner/hospitals')}
              className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/15 p-4 text-left text-sm text-white/80 transition hover:-translate-y-1 hover:bg-primary/25"
            >
              <span className="text-lg font-semibold text-white">Add Hospital</span>
              <span className="text-xs text-white/60">Maintain your key client list.</span>
            </button>
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
                      contentStyle={{
                        backgroundColor: '#0f1115',
                        borderRadius: '1rem',
                        border: '1px solid rgba(148,163,184,0.3)',
                      }}
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
                      contentStyle={{
                        backgroundColor: '#0f1115',
                        borderRadius: '1rem',
                        border: '1px solid rgba(148,163,184,0.3)',
                      }}
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
                      contentStyle={{
                        backgroundColor: '#0f1115',
                        borderRadius: '1rem',
                        border: '1px solid rgba(148,163,184,0.3)',
                      }}
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
                  <RecentDCCard
                    key={consignment.id}
                    dcNumber={consignment.dc_number ?? `#${consignment.id.slice(-6)}`}
                    createdAt={consignment.created_at}
                    status={consignment.status ?? 'prepared'}
                    value={consignment.total_value}
                  />
                ))}
                {!recentConsignments.length && (
                  <p className="text-center text-sm text-white/50">No consignments found yet.</p>
                )}
              </div>
            </FluentCard>
          </div>

          <FluentCard glass className="flex flex-col gap-3 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-white/5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/20 p-3 text-primary">
                <Package size={20} />
              </div>
              <h3 className="text-lg font-semibold text-white">Product Directory</h3>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Total Products:</span>
                <span className="text-lg font-semibold text-white">
                  {overview.products.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>In Stock:</span>
                <span className="text-lg font-semibold text-white">
                  {overview.productsInStock.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/owner/products')}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Manage Products →
            </button>
          </FluentCard>
        </div>

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-light border-t-primary"></div>
          </div>
        )}
      </div>
    </>
  )
}

export default OwnerDashboard

