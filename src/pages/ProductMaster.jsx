import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { Trash2, Pencil, Plus, Search } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'

const emptyForm = {
  item_name: '',
  brand_name: '',
  size: '',
  price: '',
  tax_percentage: '5',
  manufacturing_date: '',
  expiry_date: '',
}

const ProductMaster = () => {
  const { ownerId } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [formState, setFormState] = useState(emptyForm)
  const [activeProduct, setActiveProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadProducts = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('id, item_name, brand_name, size, price, tax_percentage, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setProducts(data ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [ownerId])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const term = search.toLowerCase()
    return products.filter((product) =>
      [product.item_name, product.brand_name, product.size]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [products, search])

  const openCreateModal = () => {
    setActiveProduct(null)
    setFormState(emptyForm)
    setIsModalOpen(true)
    setError('')
    setSuccess('')
  }

  const openEditModal = (product) => {
    setActiveProduct(product)
    setFormState({
      item_name: product.item_name ?? '',
      brand_name: product.brand_name ?? '',
      size: product.size ?? '',
      price: product.price ?? '',
      tax_percentage: product.tax_percentage != null ? String(product.tax_percentage) : '5',
      manufacturing_date: product.manufacturing_date ?? '',
      expiry_date: product.expiry_date ?? '',
    })
    setIsModalOpen(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.item_name} (${product.brand_name})?`)) return
    try {
      setSaving(true)
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      if (deleteError) throw deleteError
      setSuccess('Product deleted.')
      await loadProducts()
    } catch (err) {
      setError(err.message ?? 'Unable to delete product.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!ownerId) return
    if (!formState.item_name.trim() || !formState.brand_name.trim()) {
      setError('Item name and brand name are required.')
      return
    }

    const payload = {
      owner_id: ownerId,
      item_name: formState.item_name.trim(),
      brand_name: formState.brand_name.trim(),
      size: formState.size.trim() || null,
      price: formState.price ? Number(formState.price) : null,
      tax_percentage: formState.tax_percentage ? Number(formState.tax_percentage) : 5,
      manufacturing_date: formState.manufacturing_date || null,
      expiry_date: formState.expiry_date || null,
    }

    if (payload.tax_percentage < 0 || payload.tax_percentage > 100) {
      setError('Tax percentage must be between 0 and 100.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: insertError } = await supabase.from('products').insert([payload])
      if (insertError) throw insertError

      setSuccess('Product added successfully')
      setIsModalOpen(false)
      setFormState(emptyForm)
      await loadProducts()
    } catch (err) {
      setError(err.message ?? 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Product Directory"
        description="Manage your master catalog with default pricing, tax, and variants."
        actions={
          <button
            onClick={() => {
              setFormState(emptyForm)
              setActiveProduct(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/30"
          >
            <Plus size={16} /> Add Product
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white">
              <Search size={16} className="text-white/40" />
              <input
                placeholder="Search by item, brand, or size"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
              />
            </div>
            <span className="text-xs uppercase tracking-widest text-white/40">
              {filteredProducts.length} products
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/50">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-left">Size</th>
                  <th className="px-4 py-3 text-right">Price (₹)</th>
                  <th className="px-4 py-3 text-right">Tax %</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-white">{product.item_name}</td>
                    <td className="px-4 py-3">{product.brand_name}</td>
                    <td className="px-4 py-3 text-white/60">{product.size || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {product.price != null ? `₹${Number(product.price).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.tax_percentage != null ? `${Number(product.tax_percentage)}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                          disabled={saving}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredProducts.length && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-white/50">
                      No products match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="py-12 text-center text-sm text-white/60">Loading products...</div>
          )}
        </FluentCard>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
            <FluentCard glass className="w-full max-w-xl p-8 text-white">
              <header className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Add Product</h3>
                  <p className="text-sm text-white/60">
                    Capture key details for catalog and consignment use.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/20"
                >
                  Close
                </button>
              </header>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Item Name *</span>
                  <input
                    value={formState.item_name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, item_name: event.target.value }))
                    }
                    required
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="Item Name *"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Brand Name *</span>
                  <input
                    value={formState.brand_name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, brand_name: event.target.value }))
                    }
                    required
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="Brand Name *"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Size / Variant</span>
                  <input
                    value={formState.size}
                    onChange={(event) => setFormState((prev) => ({ ...prev, size: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="Size / Variant"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Default Price (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.price}
                    onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="Default Price (₹)"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Default Tax %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formState.tax_percentage}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, tax_percentage: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="Default Tax %"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Manufacturing Date</span>
                  <input
                    type="date"
                    value={formState.manufacturing_date}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, manufacturing_date: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Expiry Date</span>
                  <input
                    type="date"
                    value={formState.expiry_date}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, expiry_date: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                  >
                    {saving ? 'Saving...' : 'Add Product'}
                  </button>
                </div>
              </form>
            </FluentCard>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          </div>
        )}
      </div>
    </>
  )
}

export default ProductMaster
