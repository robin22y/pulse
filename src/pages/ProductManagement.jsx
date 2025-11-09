import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { Pencil, Trash2, PackagePlus } from 'lucide-react'

const ADD_FORM_DEFAULT = {
  item_name: '',
  brand_name: '',
  size: '',
  price: '',
  tax_percentage: '5',
}

const ProductManagement = () => {
  const { ownerId } = useAuth()
  const [products, setProducts] = useState([])
  const [stockCounts, setStockCounts] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addForm, setAddForm] = useState(ADD_FORM_DEFAULT)
  const [editProduct, setEditProduct] = useState(null)
  const [editForm, setEditForm] = useState({ price: '', tax_percentage: '' })

  const loadProducts = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const [{ data: productData, error: productError }, { data: stockData, error: stockError }] =
        await Promise.all([
          supabase
            .from('products')
            .select('id, item_name, brand_name, size, price, tax_percentage, created_at')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false }),
          supabase
            .from('stock_items')
            .select('product_id, quantity_available, quantity')
            .eq('owner_id', ownerId),
        ])

      if (productError || stockError) throw productError ?? stockError

      setProducts(productData ?? [])

      const counts = {}
      ;(stockData ?? []).forEach((entry) => {
        if (!entry.product_id) return
        const qty = Number(entry.quantity_available ?? entry.quantity ?? 0)
        counts[entry.product_id] = (counts[entry.product_id] ?? 0) + qty
      })
      setStockCounts(counts)
    } catch (err) {
      setError(err.message ?? 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [ownerId])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 2500)
    return () => clearTimeout(timer)
  }, [success])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((prod) =>
      [prod.item_name, prod.brand_name, prod.size]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [products, search])

  const handleAddProduct = async (event) => {
    event.preventDefault()
    if (!ownerId) return
    if (!addForm.item_name.trim() || !addForm.brand_name.trim()) {
      setError('Item name and brand name are required.')
      return
    }

    const payload = {
      owner_id: ownerId,
      item_name: addForm.item_name.trim(),
      brand_name: addForm.brand_name.trim(),
      size: addForm.size.trim() || null,
      price: addForm.price ? Number(addForm.price) : null,
      tax_percentage: addForm.tax_percentage ? Number(addForm.tax_percentage) : 5,
    }

    if (payload.tax_percentage < 0 || payload.tax_percentage > 100) {
      setError('Tax percentage must be between 0 and 100.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('products').insert([payload])
      if (insertError) throw insertError
      setAddForm(ADD_FORM_DEFAULT)
      setSuccess('Product added successfully.')
      await loadProducts()
    } catch (err) {
      setError(err.message ?? 'Unable to add product.')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (product) => {
    setEditProduct(product)
    setEditForm({
      price: product.price ?? '',
      tax_percentage: product.tax_percentage != null ? String(product.tax_percentage) : '5',
    })
    setError('')
    setSuccess('')
  }

  const handleUpdateProduct = async (event) => {
    event.preventDefault()
    if (!editProduct) return

    const updatedPayload = {
      price: editForm.price === '' ? null : Number(editForm.price),
      tax_percentage: editForm.tax_percentage === '' ? null : Number(editForm.tax_percentage),
    }

    if (
      updatedPayload.tax_percentage != null &&
      (updatedPayload.tax_percentage < 0 || updatedPayload.tax_percentage > 100)
    ) {
      setError('Tax percentage must be between 0 and 100.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update(updatedPayload)
        .eq('id', editProduct.id)
      if (updateError) throw updateError
      setSuccess('Product updated successfully. Changes apply to new consignments.')
      setEditProduct(null)
      await loadProducts()
    } catch (err) {
      setError(err.message ?? 'Unable to update product.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.item_name || product.brand_name}? This cannot be undone.`))
      return
    setSaving(true)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id)
      if (deleteError) throw deleteError
      setSuccess('Product deleted.')
      await loadProducts()
    } catch (err) {
      setError(err.message ?? 'Unable to delete product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Product Directory</h2>
          <p className="text-sm text-white/60">
            Master list of catalogue products referenced in consignments and stock entries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search item or brand"
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

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

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FluentCard glass>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Products</h3>
            <span className="text-xs uppercase tracking-widest text-white/40">
              {filteredProducts.length} items
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
                  <th className="px-4 py-3 text-right">In Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((product) => {
                  const inStock = stockCounts[product.id] ?? 0
                  return (
                    <tr key={product.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-white">{product.item_name || '—'}</td>
                      <td className="px-4 py-3">{product.brand_name || '—'}</td>
                      <td className="px-4 py-3 text-white/70">{product.size || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {product.price != null ? `₹${Number(product.price).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {product.tax_percentage != null ? `${Number(product.tax_percentage)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inStock > 0 ? inStock.toLocaleString() : '—'}
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
                            onClick={() => handleDeleteProduct(product)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                            disabled={saving}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!filteredProducts.length && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-white/50">
                      No products found. Add one using the form on the right.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="py-8 text-center text-sm text-white/60">Loading products...</div>
          )}
        </FluentCard>

        <div className="flex flex-col gap-6">
          <FluentCard glass>
            <div className="mb-4 flex items-center gap-2">
              <PackagePlus size={18} className="text-primary" />
              <h3 className="text-lg font-semibold text-white">Add Product</h3>
            </div>
            <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
              <input
                required
                placeholder="Item Name *"
                value={addForm.item_name}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, item_name: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                required
                placeholder="Brand Name *"
                value={addForm.brand_name}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, brand_name: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                placeholder="Size / Variant"
                value={addForm.size}
                onChange={(event) => setAddForm((prev) => ({ ...prev, size: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Default Price (₹)"
                value={addForm.price}
                onChange={(event) => setAddForm((prev) => ({ ...prev, price: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Default Tax %"
                value={addForm.tax_percentage}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, tax_percentage: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
              >
                {saving ? 'Saving…' : 'Save Product'}
              </button>
            </form>
          </FluentCard>

          <FluentCard glass>
            <h4 className="text-sm uppercase tracking-widest text-white/60">Notes</h4>
            <p className="mt-3 text-sm text-white/60">
              Product pricing and tax percentage are used as defaults on new consignments and stock
              entries. Editing values here does not retroactively change existing documents.
            </p>
          </FluentCard>
        </div>
      </div>

      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <FluentCard glass className="w-full max-w-lg p-8 text-white">
            <header className="mb-6">
              <h3 className="text-xl font-semibold">Edit Product</h3>
              <p className="text-sm text-white/60">
                Price and tax changes apply to future documents only. Existing DCs remain unchanged.
              </p>
            </header>
            <form onSubmit={handleUpdateProduct} className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/50">
                  Item
                </label>
                <p className="mt-1 text-sm text-white">{editProduct.item_name || '—'}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/50">
                  Brand
                </label>
                <p className="mt-1 text-sm text-white">{editProduct.brand_name || '—'}</p>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Default Price (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Default Tax %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editForm.tax_percentage}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, tax_percentage: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
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
  )
}

export default ProductManagement

