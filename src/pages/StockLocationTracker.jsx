import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const StockLocationTracker = () => {
  const { ownerId } = useAuth()
  const [records, setRecords] = useState([])
  const [filters, setFilters] = useState({
    start: '',
    end: '',
    hospital_id: '',
    product_id: '',
  })
  const [hospitals, setHospitals] = useState([])
  const [products, setProducts] = useState([])
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
        { data: productData, error: productError },
      ] = await Promise.all([
        supabase
          .from('consignments')
          .select(
            `
            id,
            dc_number,
            hospital:hospitals(id, name, city, state),
            delivery_timestamp,
            delivery_latitude,
            delivery_longitude,
            total_value,
            consignment_items(quantity, price, product:products(id, brand_name, size))
            `,
          )
          .eq('owner_id', ownerId)
          .eq('status', 'delivered')
          .order('delivery_timestamp', { ascending: false }),
        supabase.from('hospitals').select('id, name').eq('owner_id', ownerId),
        supabase.from('products').select('id, brand_name').eq('owner_id', ownerId),
      ])

      if (consignmentError || hospitalError || productError) {
        throw consignmentError ?? hospitalError ?? productError
      }

      setRecords(consignmentData ?? [])
      setHospitals(hospitalData ?? [])
      setProducts(productData ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to load stock tracker data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [ownerId])

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const deliveryDate = record.delivery_timestamp
        ? new Date(record.delivery_timestamp)
        : null
      if (filters.start && deliveryDate && deliveryDate < new Date(filters.start)) return false
      if (filters.end && deliveryDate && deliveryDate > new Date(filters.end)) return false
      if (filters.hospital_id && record.hospital?.id !== filters.hospital_id) return false
      if (
        filters.product_id &&
        !record.consignment_items.some((item) => item.product?.id === filters.product_id)
      ) {
        return false
      }
      return true
    })
  }, [records, filters])

  const totalValue = useMemo(
    () => filteredRecords.reduce((total, record) => total + Number(record.total_value ?? 0), 0),
    [filteredRecords],
  )

  const exportCsv = () => {
    const header = ['DC Number', 'Hospital', 'Product', 'Quantity', 'Value', 'Delivery Date']
    const rows = []
    filteredRecords.forEach((record) => {
      record.consignment_items.forEach((item) => {
        rows.push([
          record.dc_number,
          record.hospital?.name ?? '',
          item.product?.brand_name ?? '',
          item.quantity,
          (item.price ?? 0) * (item.quantity ?? 0),
          record.delivery_timestamp ?? '',
        ])
      })
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'stock-location-tracker.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Stock Location Tracker</h2>
          <p className="text-sm text-white/60">
            See where consignments are delivered with hospital-wise breakdowns.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:bg-primary-dark"
        >
          Export CSV
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <FluentCard glass>
        <h3 className="mb-4 text-lg font-semibold text-white">Filters</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            value={filters.product_id}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, product_id: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.brand_name}
              </option>
            ))}
          </select>
        </div>
      </FluentCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <FluentCard glass className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-white">Delivery Locations</h3>
          <div className="flex flex-col gap-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {record.hospital?.name ?? 'Hospital'}
                    </h4>
                    <p className="text-xs text-white/50">
                      {record.hospital?.city}, {record.hospital?.state}
                    </p>
                  </div>
                  <div className="text-right text-sm text-white/70">
                    <p className="font-semibold text-white">
                      ₹{Number(record.total_value ?? 0).toLocaleString()}
                    </p>
                    <p>{record.dc_number}</p>
                    <p>
                      Delivered on{' '}
                      {record.delivery_timestamp
                        ? new Date(record.delivery_timestamp).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
                  {record.consignment_items.map((item) => (
                    <div
                      key={`${record.id}-${item.product?.id}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-900/60 px-4 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.product?.brand_name}
                        </p>
                        <p className="text-xs text-white/50">Size: {item.product?.size}</p>
                      </div>
                      <div className="text-right">
                        <p>Qty {item.quantity}</p>
                        <p className="text-xs text-white/50">
                          Value ₹{((item.price ?? 0) * (item.quantity ?? 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {record.delivery_latitude && record.delivery_longitude && (
                  <p className="mt-3 text-xs text-white/50">
                    GPS: {record.delivery_latitude.toFixed(6)},{' '}
                    {record.delivery_longitude.toFixed(6)}
                  </p>
                )}
              </div>
            ))}
            {!filteredRecords.length && !loading && (
              <p className="text-center text-sm text-white/60">
                No delivered consignments for the selected filters.
              </p>
            )}
          </div>
        </FluentCard>

        <FluentCard glass>
          <h3 className="text-lg font-semibold text-white">Totals</h3>
          <div className="mt-5 flex flex-col gap-4">
            <div className="rounded-2xl bg-primary/20 p-4 text-white">
              <h4 className="text-xs uppercase tracking-widest text-white/60">
                Total Value Delivered
              </h4>
              <p className="mt-2 text-3xl font-semibold text-white">
                ₹{totalValue.toLocaleString()}
              </p>
              <p className="text-xs text-white/60">
                Across {filteredRecords.length} consignments
              </p>
            </div>
          </div>
        </FluentCard>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        </div>
      )}
    </div>
  )
}

export default StockLocationTracker

