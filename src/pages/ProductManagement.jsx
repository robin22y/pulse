import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const statusBadge = (quantity) => {
  if (quantity <= 0) {
    return { label: 'Out of Stock', className: 'bg-red-500/10 text-red-300 border-red-500/30' }
  }
  if (quantity < 20) {
    return { label: 'Low', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' }
  }
  if (quantity < 50) {
    return { label: 'Medium', className: 'bg-sky-500/10 text-sky-300 border-sky-500/30' }
  }
  return { label: 'High', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' }
}

const ProductManagement = () => {
  const { ownerId } = useAuth()
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState({
    brand_name: '',
    size: '',
    price: '',
  })
  const [modalProduct, setModalProduct] = useState(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const [{ data: productData, error: productError }, { data: inventoryData, error: inventoryError }] =
        await Promise.all([
          supabase
            .from('products')
            .select('id, brand_name, size, price, owner_id')
            .eq('owner_id', ownerId)
            .order('brand_name', { ascending: true }),
          supabase
            .from('inventory')
            .select('id, product_id, quantity, owner_id')
            .eq('owner_id', ownerId),
        ])

      if (productError || inventoryError) throw productError ?? inventoryError

      setProducts(productData ?? [])
      setInventory(inventoryData ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [ownerId])

  const productWithInventory = useMemo(() => {
    return products.map((product) => {
      const item = inventory.find((row) => row.product_id === product.id)
      return {
        ...product,
        quantity: Number(item?.quantity ?? 0),
        inventory_id: item?.id,
      }
    })
  }, [products, inventory])

  const handleAddProduct = async (event) => {
    event.preventDefault()
    if (!ownerId) return
    setSaving(true)
    setError('')
    try {
      const { data, error: insertProductError } = await supabase
        .from('products')
        .insert({
          brand_name: formState.brand_name,
          size: formState.size,
          price: formState.price ? Number(formState.price) : null,
          owner_id: ownerId,
        })
        .select('id')
        .single()

      if (insertProductError) throw insertProductError

      const { error: inventoryError } = await supabase.from('inventory').insert({
        owner_id: ownerId,
        product_id: data.id,
        quantity: 0,
      })
      if (inventoryError) throw inventoryError

      setFormState({ brand_name: '', size: '', price: '' })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Unable to add product.')
    } finally {
      setSaving(false)
    }
  }

  const handleInventoryAdjust = async () => {
    if (!modalProduct) return
    const targetInventory = inventory.find((row) => row.product_id === modalProduct.id)
    const newQty = Number(targetInventory?.quantity ?? 0) + Number(adjustQty)
    try {
      setSaving(true)
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQty })
        .eq('id', targetInventory?.id)

      if (updateError) throw updateError

      await loadData()
      setModalProduct(null)
      setAdjustQty(0)
    } catch (err) {
      setError(err.message ?? 'Unable to update inventory.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Product Management</h2>
          <p className="text-sm text-white/60">
            Keep track of product catalogue and inventory levels across the network.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FluentCard glass>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Products</h3>
            <span className="text-xs uppercase tracking-widest text-white/40">
              {productWithInventory.length} items
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {productWithInventory.map((product) => {
              const status = statusBadge(product.quantity)
              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {product.brand_name}
                      </h4>
                      <p className="text-sm text-white/60">Size: {product.size}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-widest ${status.className}`}>
                        {status.label}
                      </div>
                      <div className="text-right">
                        <span className="block text-xs uppercase text-white/40">
                          Quantity
                        </span>
                        <span className="text-xl font-semibold text-white">
                          {product.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
                    <span>Price: ₹{Number(product.price ?? 0).toLocaleString()}</span>
                    <button
                      onClick={() => {
                        setModalProduct(product)
                        setAdjustQty(0)
                      }}
                      className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    >
                      Update Inventory
                    </button>
                  </div>
                </div>
              )
            })}
            {!productWithInventory.length && !loading && (
              <p className="text-center text-sm text-white/50">No products yet. Add one on the right.</p>
            )}
          </div>
        </FluentCard>

        <div className="flex flex-col gap-6">
          <FluentCard glass>
            <h3 className="mb-4 text-lg font-semibold text-white">Add Product</h3>
            <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
              <input
                required
                placeholder="Brand name"
                value={formState.brand_name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, brand_name: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                required
                placeholder="Size"
                value={formState.size}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, size: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                placeholder="Price"
                value={formState.price}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, price: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
              >
                {saving ? 'Saving...' : 'Add Product'}
              </button>
            </form>
          </FluentCard>

          <FluentCard glass>
            <h4 className="text-sm uppercase tracking-widest text-white/60">
              Total Inventory
            </h4>
            <p className="mt-2 text-3xl font-semibold text-white">
              {inventory.reduce((total, item) => total + Number(item.quantity ?? 0), 0)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Across {productWithInventory.length} products
            </p>
          </FluentCard>
        </div>
      </div>

      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <FluentCard glass className="w-full max-w-md p-8">
            <h3 className="text-xl font-semibold text-white">
              Update {modalProduct.brand_name}
            </h3>
            <p className="mt-2 text-sm text-white/60">Current quantity: {modalProduct.quantity}</p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm text-white/70">Adjust quantity (use negative to deduct)</label>
              <input
                type="number"
                value={adjustQty}
                onChange={(event) => setAdjustQty(Number(event.target.value))}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setModalProduct(null)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInventoryAdjust}
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {saving ? 'Updating...' : 'Save'}
                </button>
              </div>
            </div>
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

