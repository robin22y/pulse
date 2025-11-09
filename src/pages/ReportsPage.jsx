import { jsPDF } from 'jspdf'
import { utils as xlsxUtils, writeFile as writeXlsxFile } from 'xlsx'
import { useEffect, useMemo, useState } from 'react'
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

const ReportsPage = () => {
  const { ownerId } = useAuth()
  const [filters, setFilters] = useState({
    start: '',
    end: '',
    hospital_id: '',
    status: '',
    branch_id: '',
    staff_id: '',
  })
  const [dataset, setDataset] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [branches, setBranches] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const [
        { data: consignmentData, error: consignmentError },
        { data: hospitalData, error: hospitalError },
        { data: branchData, error: branchError },
        { data: staffData, error: staffError },
      ] = await Promise.all([
        supabase
          .from('consignments')
          .select(
            `
            id,
            dc_number,
            status,
            total_value,
            created_at,
            delivered_at,
            delivery_timestamp,
            hospital:hospitals(id, name),
            branch:branches(id, name),
            delivery_staff:users!consignments_delivery_staff_id_fkey(id, full_name, role),
            items:consignment_items(count)
            `,
          )
          .eq('owner_id', ownerId),
        supabase.from('hospitals').select('id, name').eq('owner_id', ownerId),
        supabase.from('branches').select('id, name').eq('owner_id', ownerId),
        supabase
          .from('users')
          .select('id, full_name, role')
          .eq('owner_id', ownerId)
          .in('role', ['staff', 'manager', 'delivery']),
      ])

      if (consignmentError || hospitalError || branchError || staffError) {
        throw consignmentError ?? hospitalError ?? branchError ?? staffError
      }

      setDataset(consignmentData ?? [])
      setHospitals(hospitalData ?? [])
      setBranches(branchData ?? [])
      setStaff(staffData ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to load reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [ownerId])

  const filteredData = useMemo(() => {
    return dataset.filter((row) => {
      const created = new Date(row.created_at)
      if (filters.start && created < new Date(filters.start)) return false
      if (filters.end && created > new Date(filters.end)) return false
      if (filters.hospital_id && row.hospital?.id !== filters.hospital_id) return false
      if (filters.status && row.status !== filters.status) return false
      if (filters.branch_id && row.branch?.id !== filters.branch_id) return false
      if (filters.staff_id && row.delivery_staff?.id !== filters.staff_id) return false
      return true
    })
  }, [dataset, filters])

  const summary = useMemo(() => {
    const totalValue = filteredData.reduce(
      (total, row) => total + Number(row.total_value ?? 0),
      0,
    )
    const deliveredCount = filteredData.filter((row) => row.status === 'delivered').length
    const pendingCount = filteredData.filter((row) => row.status !== 'delivered').length

    const deliveryTimes = filteredData
      .map((row) => {
        if (!row.delivered_at || !row.created_at) return null
        return (new Date(row.delivered_at) - new Date(row.created_at)) / (1000 * 60 * 60)
      })
      .filter(Boolean)
    const avgDeliveryTime =
      deliveryTimes.length === 0
        ? 0
        : deliveryTimes.reduce((total, hours) => total + hours, 0) / deliveryTimes.length

    return {
      totalValue,
      deliveredCount,
      pendingCount,
      avgDeliveryTime,
    }
  }, [filteredData])

  const trends = useMemo(() => {
    const buckets = filteredData.reduce((acc, row) => {
      const key = new Date(row.created_at).toISOString().slice(0, 10)
      if (!acc[key]) {
        acc[key] = { date: key, value: 0, count: 0 }
      }
      acc[key].value += Number(row.total_value ?? 0)
      acc[key].count += 1
      return acc
    }, {})

    return Object.values(buckets).sort((a, b) => (a.date > b.date ? 1 : -1))
  }, [filteredData])

  const statusBreakdown = useMemo(() => {
    const statuses = filteredData.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(statuses).map(([name, value]) => ({ name, value }))
  }, [filteredData])

  const hospitalDistribution = useMemo(() => {
    const buckets = filteredData.reduce((acc, row) => {
      const key = row.hospital?.name ?? 'Unknown'
      acc[key] = (acc[key] ?? 0) + Number(row.total_value ?? 0)
      return acc
    }, {})
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  const topStaff = useMemo(() => {
    const buckets = filteredData.reduce((acc, row) => {
      if (!row.delivery_staff?.id) return acc
      const key = row.delivery_staff.id
      if (!acc[key]) {
        acc[key] = { name: row.delivery_staff.full_name, delivered: 0, value: 0 }
      }
      if (row.status === 'delivered') {
        acc[key].delivered += 1
        acc[key].value += Number(row.total_value ?? 0)
      }
      return acc
    }, {})
    return Object.values(buckets).sort((a, b) => b.delivered - a.delivered).slice(0, 5)
  }, [filteredData])

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('FieldFlow Delivery Report', 15, 20)
    doc.setFontSize(12)
    doc.text(`Total Value: ₹${summary.totalValue.toLocaleString()}`, 15, 30)
    doc.text(`Delivered: ${summary.deliveredCount}`, 15, 36)
    doc.text(`Pending: ${summary.pendingCount}`, 15, 42)
    doc.text(`Avg Delivery Time: ${summary.avgDeliveryTime.toFixed(1)} hrs`, 15, 48)

    let y = 60
    doc.setFontSize(10)
    filteredData.slice(0, 20).forEach((row) => {
      doc.text(
        `${row.dc_number} | ${row.hospital?.name ?? 'Hospital'} | Status: ${
          row.status
        } | Value: ₹${Number(row.total_value ?? 0).toLocaleString()}`,
        15,
        y,
      )
      y += 6
    })
    doc.save('fieldflow-report.pdf')
  }

  const exportExcel = () => {
    const sheetData = filteredData.map((row) => ({
      DC: row.dc_number,
      Hospital: row.hospital?.name ?? '',
      Branch: row.branch?.name ?? '',
      Staff: row.delivery_staff?.full_name ?? '',
      Status: row.status,
      Value: row.total_value,
      Created: row.created_at,
      Delivered: row.delivered_at,
    }))
    const worksheet = xlsxUtils.json_to_sheet(sheetData)
    const workbook = xlsxUtils.book_new()
    xlsxUtils.book_append_sheet(workbook, worksheet, 'Consignments')
    writeXlsxFile(workbook, 'fieldflow-report.xlsx')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Reports & Insights</h2>
          <p className="text-sm text-white/60">
            Analyze delivery performance with filters, charts, and exports.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportPdf}
            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Download PDF
          </button>
          <button
            onClick={exportExcel}
            className="rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:bg-primary-dark"
          >
            Export Excel
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <FluentCard glass>
        <h3 className="mb-4 text-lg font-semibold text-white">Filters</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="date"
            value={filters.start}
            onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="date"
            value={filters.end}
            onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
          <select
            value={filters.hospital_id}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, hospital_id: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Hospitals</option>
            {hospitals.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, status: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Status</option>
            <option value="prepared">Prepared</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.branch_id}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, branch_id: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            value={filters.staff_id}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, staff_id: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} • {member.role}
              </option>
            ))}
          </select>
        </div>
      </FluentCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <FluentCard glass>
          <h4 className="text-xs uppercase tracking-widest text-white/40">Total Value</h4>
          <p className="mt-2 text-2xl font-semibold text-white">
            ₹{summary.totalValue.toLocaleString()}
          </p>
        </FluentCard>
        <FluentCard glass>
          <h4 className="text-xs uppercase tracking-widest text-white/40">Delivered</h4>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.deliveredCount}</p>
        </FluentCard>
        <FluentCard glass>
          <h4 className="text-xs uppercase tracking-widest text-white/40">Pending</h4>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.pendingCount}</p>
        </FluentCard>
        <FluentCard glass>
          <h4 className="text-xs uppercase tracking-widest text-white/40">Avg Delivery Time</h4>
          <p className="mt-2 text-2xl font-semibold text-white">
            {summary.avgDeliveryTime.toFixed(1)} hrs
          </p>
        </FluentCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FluentCard glass>
          <h3 className="mb-4 text-lg font-semibold text-white">Delivery Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="date" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.3)' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FluentCard>
        <FluentCard glass>
          <h3 className="mb-4 text-lg font-semibold text-white">Hospital Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.3)' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FluentCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FluentCard glass>
          <h3 className="mb-4 text-lg font-semibold text-white">Status Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#38BDF8"
                  paddingAngle={5}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.3)' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </FluentCard>
        <FluentCard glass>
          <h3 className="mb-4 text-lg font-semibold text-white">Top Performing Staff</h3>
          <div className="flex flex-col gap-3">
            {topStaff.map((member, index) => (
              <div
                key={member.name}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    #{index + 1} {member.name}
                  </p>
                  <p className="text-xs text-white/60">Delivered {member.delivered} consignments</p>
                </div>
                <span className="text-sm font-semibold text-white">
                  ₹{member.value.toLocaleString()}
                </span>
              </div>
            ))}
            {!topStaff.length && (
              <p className="text-center text-sm text-white/50">No staff performance data yet.</p>
            )}
          </div>
        </FluentCard>
      </div>

      <FluentCard glass>
        <h3 className="mb-4 text-lg font-semibold text-white">Consignments</h3>
        <div className="flex flex-col gap-3">
          {filteredData.slice(0, 12).map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-white">{row.dc_number}</p>
                <p className="text-xs text-white/60">
                  {row.hospital?.name ?? 'Hospital'} • {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/80">
                  ₹{Number(row.total_value ?? 0).toLocaleString()}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                    row.status === 'delivered'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : row.status === 'in_transit'
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-slate-500/10 text-slate-200'
                  }`}
                >
                  {row.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </FluentCard>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        </div>
      )}
    </div>
  )
}

export default ReportsPage

