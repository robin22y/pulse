import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { Plus } from 'lucide-react'
import AddStockModal from '../components/AddStockModal.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

interface StockItem {
  id: string
  item_name: string
  brand_name: string
  size: string | null
  batch_number: string | null
  manufacturing_date: string | null
  expiry_date: string | null
  quantity: number | null
  quantity_available: number | null
  unit_price: number | null
  location: string | null
  notes: string | null
  created_at: string
}

const getRowClassName = (item: StockItem) => {
  const today = new Date()
  const expiry = item.expiry_date ? new Date(item.expiry_date) : null
  const qty = Number(item.quantity_available ?? item.quantity ?? 0)
  if (expiry && expiry < today) {
    return 'border border-red-500/40 bg-red-500/15'
  }
  if (expiry) {
    const diffInMs = expiry.getTime() - today.getTime()
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)
    if (diffInDays < 30) {
      return 'border border-amber-500/40 bg-amber-500/10'
    }
  }
  if (qty < 10) {
    return 'border border-yellow-500/40 bg-yellow-500/10'
  }
  return 'border border-emerald-500/30 bg-emerald-500/10'
}

const StockManagementPage = () => {
  const { ownerId } = useAuth()
  const [stock, setStock] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const loadStock = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('stock_items')
        .select(
          `id, owner_id, item_name, brand_name, size, batch_number, manufacturing_date, expiry_date, quantity, quantity_available, unit_price, location, notes, created_at`,
        )
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setStock((data as StockItem[]) ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Unable to load stock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ownerId) {
      loadStock()
    }
  }, [ownerId])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const stockTotals = useMemo(() => {
    return stock.reduce(
      (acc, item) => {
        const qty = Number(item.quantity_available ?? item.quantity ?? 0)
        const price = Number(item.unit_price ?? 0)
        acc.quantity += qty
        acc.value += price * qty
        return acc
      },
      { quantity: 0, value: 0 },
    )
  }, [stock])

  return (
    <>
      <PageHeader
        title="Stock Management"
        description="Track batches, monitor expiry, and keep hospital stock levels healthy."
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/30"
          >
            <Plus size={16} /> Add Stock Entry
          </button>
        }
      />
      <div className="flex flex-col gap-6">

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <FluentCard glass>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">Totals</p>
            <p className="text-sm text-white/70">
              {stockTotals.quantity} units • ₹{stockTotals.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/50">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Expiry</th>
                <th className="px-4 py-3 text-left">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stock.map((item) => (
                <tr key={item.id} className={`transition hover:bg-white/5 ${getRowClassName(item)}`}>
                  <td className="px-4 py-3 font-semibold text-white">
                    <div>{item.item_name}</div>
                    {item.notes && <p className="text-xs text-white/60">{item.notes}</p>}
                  </td>
                  <td className="px-4 py-3">{item.brand_name}</td>
                  <td className="px-4 py-3 text-white/70">{item.size ?? '—'}</td>
                  <td className="px-4 py-3 text-white/70">{item.batch_number ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {Number(item.quantity_available ?? item.quantity ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-white/70">
                    {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/70">{item.location ?? '—'}</td>
                </tr>
              ))}
              {!stock.length && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                    No stock items yet. Add your first batch using the button above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-10 text-center text-sm text-white/60">Loading stock...</div>
        )}
      </FluentCard>

      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setSuccess('Stock added successfully')
          loadStock()
        }}
      />
      </div>
    </>
  )
}

export default StockManagementPage
