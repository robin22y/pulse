import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FluentCard from '../components/FluentCard.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ConsignmentActions from '../components/consignments/ConsignmentActions.jsx'
import { FileText, AlertCircle, DollarSign, TrendingUp, Plus } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'

const formatCurrency = (value) => `₹${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const SummaryCard = ({ title, value, icon: Icon, color = 'slate' }) => {
  const colorMap = {
    slate: 'bg-slate-900/60 text-white',
    orange: 'bg-orange-500/10 text-orange-200',
    red: 'bg-red-500/10 text-red-200',
    green: 'bg-green-500/10 text-green-200',
  }
  return (
    <FluentCard glass className={`flex items-center gap-3 ${colorMap[color] || colorMap.slate}`}>
      <div className="rounded-full bg-white/10 p-3">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest opacity-70">{title}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </FluentCard>
  )
}

const ConsignmentsList = () => {
  const { ownerId } = useAuth()
  const navigate = useNavigate()
  const [consignments, setConsignments] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    hospitalId: '',
    branchId: '',
    dateFrom: '',
    dateTo: '',
    status: 'all',
    billingStatus: 'all',
    paymentStatus: 'all',
  })

  const loadFilters = async () => {
    if (!ownerId) return
    try {
      const [{ data: hospitalData }, { data: branchData }] = await Promise.all([
        supabase.from('hospitals').select('id, name').eq('owner_id', ownerId).order('name'),
        supabase.from('branches').select('id, name').eq('owner_id', ownerId).order('name'),
      ])
      setHospitals(hospitalData ?? [])
      setBranches(branchData ?? [])
    } catch (err) {
      console.warn('Failed to load filter lists', err)
    }
  }

  useEffect(() => {
    loadFilters()
  }, [ownerId])

  const loadConsignments = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('consignments')
        .select(
          `
          id,
          dc_number,
          status,
          billing_status,
          payment_status,
          total_value,
          created_at,
          hospital_id,
          branch_id,
          hospital:hospitals(
            id,
            name,
            city,
            address,
            state,
            pincode,
            gstin,
            drug_license_number,
            contact_person,
            contact_phone,
            email
          ),
          branch:branches(
            id,
            name,
            city,
            state
          ),
          prepared_by_user:users!consignments_prepared_by_fkey(id, full_name, role),
          delivered_by_user:users!consignments_delivered_by_fkey(id, full_name, role),
          billed_by_user:users!consignments_billed_by_fkey(id, full_name, role)
          `,
        )
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (filters.hospitalId) query = query.eq('hospital_id', filters.hospitalId)
      if (filters.branchId) query = query.eq('branch_id', filters.branchId)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.billingStatus !== 'all') query = query.eq('billing_status', filters.billingStatus)
      if (filters.paymentStatus !== 'all') query = query.eq('payment_status', filters.paymentStatus)
      if (searchTerm.trim()) {
        query = query.or(`dc_number.ilike.%${searchTerm.trim()}%`)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      let result = data ?? []
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase()
        result = result.filter((item) =>
          item.dc_number?.toLowerCase().includes(term) ||
          item.hospital?.name?.toLowerCase().includes(term),
        )
      }

      setConsignments(result)
    } catch (err) {
      setError(err.message ?? 'Unable to load consignments.')
      setConsignments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConsignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, searchTerm, JSON.stringify(filters)])

  const stats = useMemo(() => {
    const total = consignments.length
    const pendingBilling = consignments.filter((c) => c.billing_status === 'pending').length
    const pendingPayment = consignments.filter((c) => c.payment_status === 'pending').length
    const totalValue = consignments.reduce((sum, item) => sum + Number(item.total_value ?? 0), 0)
    return { total, pendingBilling, pendingPayment, totalValue }
  }, [consignments])

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'prepared', label: 'Prepared' },
    { value: 'in_transit', label: 'In-Transit' },
    { value: 'delivered', label: 'Delivered' },
  ]

  const billingOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'billed', label: 'Billed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const paymentOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'received', label: 'Received' },
    { value: 'overdue', label: 'Overdue' },
  ]

  return (
    <>
      <PageHeader
        title="Delivery Challans"
        description="Track every DC with delivery, billing, and payment status in real time."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search DC number or hospital"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <button
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/30"
              onClick={() => navigate('/consignments/create')}
            >
              <Plus size={16} /> New DC
            </button>
          </div>
        }
      />
      <div className="flex flex-col gap-6">

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total DCs" value={stats.total} icon={FileText} />
        <SummaryCard title="Pending Billing" value={stats.pendingBilling} icon={AlertCircle} color="orange" />
        <SummaryCard title="Payment Pending" value={stats.pendingPayment} icon={DollarSign} color="red" />
        <SummaryCard title="Total Value" value={formatCurrency(stats.totalValue)} icon={TrendingUp} color="green" />
      </div>

      <FluentCard glass>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-white/70">
            From
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            To
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Hospital
            <select
              value={filters.hospitalId}
              onChange={(event) => setFilters((prev) => ({ ...prev, hospitalId: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All hospitals</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Branch
            <select
              value={filters.branchId}
              onChange={(event) => setFilters((prev) => ({ ...prev, branchId: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Delivery Status
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setFilters((prev) => ({ ...prev, status: option.value }))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    filters.status === option.value
                      ? 'bg-primary text-white'
                      : 'border border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Billing Status
            <div className="flex flex-wrap gap-2">
              {billingOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setFilters((prev) => ({ ...prev, billingStatus: option.value }))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    filters.billingStatus === option.value
                      ? 'bg-primary text-white'
                      : 'border border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Payment Status
            <div className="flex flex-wrap gap-2">
              {paymentOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setFilters((prev) => ({ ...prev, paymentStatus: option.value }))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    filters.paymentStatus === option.value
                      ? 'bg-primary text-white'
                      : 'border border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>
        </div>
      </FluentCard>

      <FluentCard glass>
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/50">
              <tr>
                <th className="px-4 py-3 text-left">DC Number</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Hospital</th>
                <th className="px-4 py-3 text-left">Branch</th>
                <th className="px-4 py-3 text-right">Total Value</th>
                <th className="px-4 py-3 text-center">Delivery</th>
                <th className="px-4 py-3 text-center">Billing</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {consignments.map((consignment) => (
                <tr key={consignment.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/owner/consignments/${consignment.id}`)}
                      className="font-semibold text-white underline-offset-4 hover:underline"
                    >
                      {consignment.dc_number}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatDate(consignment.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{consignment.hospital?.name}</span>
                      <span className="text-xs text-white/50">{consignment.hospital?.city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{consignment.branch?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {formatCurrency(consignment.total_value)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge type="delivery" status={consignment.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge type="billing" status={consignment.billing_status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge type="payment" status={consignment.payment_status} />
                  </td>
                  <td className="px-4 py-3 text-left">
                    <ConsignmentActions consignment={consignment} onUpdated={loadConsignments} />
                  </td>
                </tr>
              ))}
              {!consignments.length && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-white/60">
                    No consignments found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="py-8 text-center text-sm text-white/60">Loading consignments...</div>
        )}
      </FluentCard>
    </div>
    </>
  )
}

export default ConsignmentsList
