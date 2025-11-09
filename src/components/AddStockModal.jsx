import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { X, Package, Calendar, DollarSign, Search } from 'lucide-react'

const manualFormDefaults = {
  itemName: '',
  brandName: '',
  size: '',
  batchNumber: '',
  manufacturingDate: '',
  expiryDate: '',
  quantity: '',
  unitPrice: '',
  taxPercentage: '5',
  location: '',
  notes: '',
}

const AddStockModal = ({ isOpen, onClose, onSuccess }) => {
  const { ownerId } = useAuth()
  const [formData, setFormData] = useState(manualFormDefaults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [saveAsProduct, setSaveAsProduct] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFormData(manualFormDefaults)
    setProductSearch('')
    setSearchResults([])
    setSelectedProduct(null)
    setManualEntry(false)
    setSaveAsProduct(false)
    setError('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || manualEntry) return
    if (!productSearch.trim()) {
      setSearchResults([])
      return
    }

    let cancelled = false
    const fetchProducts = async () => {
      setSearchLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('id, item_name, brand_name, size, price, tax_percentage')
          .eq('owner_id', ownerId)
          .or(
            `item_name.ilike.%${productSearch.trim()}%,brand_name.ilike.%${productSearch.trim()}%`,
          )
          .limit(10)

        if (!cancelled) {
          if (fetchError) throw fetchError
          setSearchResults(data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Product search failed', err)
          setSearchResults([])
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }

    const handler = setTimeout(fetchProducts, 250)
    return () => {
      cancelled = true
      clearTimeout(handler)
    }
  }, [productSearch, ownerId, isOpen, manualEntry])

  const handleSelectProduct = (product) => {
    setSelectedProduct(product)
    setManualEntry(false)
    setSaveAsProduct(false)
    setFormData({
      itemName: product.item_name ?? '',
      brandName: product.brand_name ?? '',
      size: product.size ?? '',
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      quantity: '',
      unitPrice: product.price != null ? String(product.price) : '',
      taxPercentage:
        product.tax_percentage != null ? String(product.tax_percentage) : manualFormDefaults.taxPercentage,
      location: '',
      notes: '',
    })
    setProductSearch(`${product.item_name || ''} ${product.brand_name || ''}`.trim())
    setSearchResults([])
  }

  const enableManualEntry = () => {
    setManualEntry(true)
    setSelectedProduct(null)
    setProductSearch('')
    setFormData(manualFormDefaults)
  }

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const ensureProduct = async () => {
    if (selectedProduct) {
      return selectedProduct.id
    }

    if (!saveAsProduct) {
      return null
    }

    if (!ownerId) {
      throw new Error('Unable to determine owner for new product.')
    }

    if (!formData.itemName.trim() || !formData.brandName.trim()) {
      throw new Error('Item name and brand name required to save product.')
    }

    const payload = {
      owner_id: ownerId,
      item_name: formData.itemName.trim(),
      brand_name: formData.brandName.trim(),
      size: formData.size.trim() || null,
      price: formData.unitPrice ? Number(formData.unitPrice) : null,
      tax_percentage: formData.taxPercentage ? Number(formData.taxPercentage) : 5,
    }

    const { data, error: insertError } = await supabase
      .from('products')
      .insert([payload])
      .select('id')
      .single()

    if (insertError) throw insertError
    return data?.id ?? null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.itemName.trim() || !formData.brandName.trim()) {
        throw new Error('Item name and brand name are required.')
      }
      if (!formData.batchNumber.trim()) {
        throw new Error('Batch number is required.')
      }
      if (!formData.quantity || Number(formData.quantity) <= 0) {
        throw new Error('Quantity must be greater than zero.')
      }
      if (!formData.unitPrice) {
        throw new Error('Unit price is required.')
      }

      const productId = await ensureProduct()

      const { data, error: rpcError } = await supabase.rpc('add_stock_item', {
        p_product_id: productId,
        p_item_name: formData.itemName.trim(),
        p_brand_name: formData.brandName.trim(),
        p_size: formData.size.trim() || null,
        p_batch_number: formData.batchNumber.trim() || null,
        p_manufacturing_date: formData.manufacturingDate || null,
        p_expiry_date: formData.expiryDate || null,
        p_unit_price: parseFloat(formData.unitPrice),
        p_quantity: parseInt(formData.quantity, 10),
        p_location: formData.location.trim() || null,
        p_notes: formData.notes.trim() || null,
      })

      if (rpcError) throw rpcError
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to add stock')
      }

      window.alert('Stock added successfully!')
      setFormData(manualFormDefaults)
      setSelectedProduct(null)
      setManualEntry(false)
      setSaveAsProduct(false)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err.message || 'Unable to add stock')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const readonly = !!selectedProduct && !manualEntry

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <Package size={24} />
            <div>
              <h2 className="text-2xl font-bold">Add Stock Entry</h2>
              <p className="text-sm text-white/80">Link batches to catalog products for accurate tracking.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/20"
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {error && (
            <div className="border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {!manualEntry && (
              <div className="relative">
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Select from Products
                </label>
                <div className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 focus-within:border-blue-500">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(event) => {
                      setProductSearch(event.target.value)
                      setSelectedProduct(null)
                    }}
                    placeholder="Search item or brand"
                    className="h-10 flex-1 border-none text-sm text-gray-900 outline-none"
                  />
                </div>
                {searchLoading && (
                  <div className="absolute right-3 top-3 text-xs text-gray-400">Searching…</div>
                )}
                {searchResults.length > 0 && !selectedProduct && (
                  <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {searchResults.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm hover:bg-gray-100"
                      >
                        <span className="font-semibold text-gray-900">
                          {product.item_name || 'Unnamed'} – {product.brand_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {product.size || 'No size'} • ₹{product.price?.toLocaleString() ?? '—'} • Tax{' '}
                          {product.tax_percentage ?? '—'}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={enableManualEntry}
                  className="mt-2 text-xs font-semibold text-blue-600 underline"
                >
                  Product not found? Enter manually
                </button>
              </div>
            )}

            {manualEntry && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                Manual entry enabled. You can optionally save this product to the directory for next time.
              </div>
            )}

            {manualEntry && (
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={saveAsProduct}
                  onChange={(event) => setSaveAsProduct(event.target.checked)}
                />
                Save this product to the catalog after adding stock
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={handleChange('itemName')}
                required
                readOnly={readonly}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 disabled:bg-gray-100"
                placeholder="e.g. Knee Implant"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={handleChange('brandName')}
                required
                readOnly={readonly}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 disabled:bg-gray-100"
                placeholder="e.g. Stryker"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Size / Variant</label>
              <input
                type="text"
                value={formData.size}
                onChange={handleChange('size')}
                readOnly={readonly}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 disabled:bg-gray-100"
                placeholder="e.g. Large, 8mm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={handleChange('batchNumber')}
                required
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
                placeholder="e.g. BT2025001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <Calendar size={16} className="inline text-blue-500" /> Manufacturing Date
              </label>
              <input
                type="date"
                value={formData.manufacturingDate}
                onChange={handleChange('manufacturingDate')}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <Calendar size={16} className="inline text-purple-500" /> Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={handleChange('expiryDate')}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Quantity Received <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange('quantity')}
                required
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <DollarSign size={16} className="inline text-emerald-500" /> Unit Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                onChange={handleChange('unitPrice')}
                required
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
                placeholder="e.g. 50000.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Tax %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.taxPercentage}
                onChange={handleChange('taxPercentage')}
                readOnly={readonly}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 disabled:bg-gray-100"
                placeholder="e.g. 5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={handleChange('location')}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
                placeholder="e.g. Warehouse A, Shelf 3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={handleChange('notes')}
                rows={3}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Adding…' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddStockModal
