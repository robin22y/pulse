import { jsPDF } from 'jspdf'
import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import DCNumberInput from '../components/DCNumberInput.jsx'
import { useNavigate } from 'react-router-dom'
import { Search, PackagePlus } from 'lucide-react'
import DCPreview from '../components/DCPreview.jsx'

const CreateConsignment = () => {
  const { ownerId, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [hospitals, setHospitals] = useState([])
  const [branches, setBranches] = useState([])
  const [deliveryStaff, setDeliveryStaff] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [stockEntries, setStockEntries] = useState([])
  const [useStockManagement, setUseStockManagement] = useState(false)
  const [companySettings, setCompanySettings] = useState(null)
  const [items, setItems] = useState([])
  const [formState, setFormState] = useState({
    hospital_id: '',
    branch_id: '',
    delivery_staff_id: '',
    dc_number: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [selectedStockId, setSelectedStockId] = useState('')

  const loadData = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const [
        { data: hospitalData, error: hospitalError },
        { data: branchData, error: branchError },
        { data: staffData, error: staffError },
        { data: productData, error: productError },
        { data: inventoryData, error: inventoryError },
        { data: stockData, error: stockError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        supabase
          .from('hospitals')
          .select('id, name, city')
          .eq('owner_id', ownerId)
          .order('name'),
        supabase
          .from('branches')
          .select('id, name, city')
          .eq('owner_id', ownerId)
          .order('name'),
        supabase
          .from('users')
          .select('id, full_name, role')
          .eq('owner_id', ownerId)
          .in('role', ['delivery', 'staff']),
        supabase
          .from('products')
          .select('id, item_name, brand_name, size, price, tax_percentage')
          .eq('owner_id', ownerId)
          .order('item_name'),
        supabase
          .from('inventory')
          .select('id, product_id, quantity')
          .eq('owner_id', ownerId),
        supabase
          .from('stock_items')
          .select(
            'id, product_id, item_name, brand_name, batch_number, manufacturing_date, expiry_date, quantity_available, unit_price, location',
          )
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('owner_settings')
          .select('*')
          .eq('owner_id', ownerId)
          .maybeSingle(),
      ])

      if (
        hospitalError ||
        branchError ||
        staffError ||
        productError ||
        inventoryError ||
        stockError ||
        settingsError
      ) {
        throw (
          hospitalError ??
          branchError ??
          staffError ??
          productError ??
          inventoryError ??
          stockError ??
          settingsError
        )
      }

      setHospitals(hospitalData ?? [])
      setBranches(branchData ?? [])
      setDeliveryStaff(staffData ?? [])
      setProducts(productData ?? [])
      setInventory(inventoryData ?? [])
      setStockEntries(stockData ?? [])
      setUseStockManagement(Boolean(settingsData?.use_stock_management ?? false))
      setCompanySettings(settingsData ?? null)
    } catch (err) {
      setError(err.message ?? 'Unable to load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [ownerId])

  const productInventory = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        stock: Number(inventory.find((item) => item.product_id === product.id)?.quantity ?? 0),
      })),
    [products, inventory],
  )

  const totalValue = useMemo(
    () =>
      items.reduce(
        (total, item) => total + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
        0,
      ),
    [items],
  )

  useEffect(() => {
    if (!useStockManagement) return
    if (!selectedStockId) return
    const stock = stockEntries.find((entry) => entry.id === selectedStockId)
    if (!stock) return
    const existing = items.find((item) => item.stock_item_id === stock.id)
    if (existing) return
    setItems((prev) => [
      ...prev,
      {
        stock_item_id: stock.id,
        product_id: stock.product_id,
        item_name: stock.item_name,
        brand_name: stock.brand_name,
        size: stock.size ?? '',
        batch_number: stock.batch_number ?? '',
        manufacturing_date: stock.manufacturing_date ?? '',
        expiry_date: stock.expiry_date ?? '',
        quantity: 1,
        available: Number(stock.quantity_available ?? 0),
        unit_price: stock.unit_price ?? 0,
        location: stock.location ?? '',
        tax_percentage: null,
      },
    ])
    setSelectedStockId('')
  }, [selectedStockId, useStockManagement, items, stockEntries])

  useEffect(() => {
    if (!productSearch.trim() || !ownerId || useStockManagement) {
      setProductResults([])
      return
    }
    let cancelled = false
    const fetchProducts = async () => {
      setProductSearchLoading(true)
      try {
        const { data, error: searchError } = await supabase
          .from('products')
          .select('id, item_name, brand_name, size, price, tax_percentage')
          .eq('owner_id', ownerId)
          .or(
            `item_name.ilike.%${productSearch.trim()}%,brand_name.ilike.%${productSearch.trim()}%`,
          )
          .limit(8)

        if (!cancelled) {
          if (searchError) throw searchError
          setProductResults(data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Product search failed', err)
          setProductResults([])
        }
      } finally {
        if (!cancelled) setProductSearchLoading(false)
      }
    }
    const handler = setTimeout(fetchProducts, 200)
    return () => {
      cancelled = true
      clearTimeout(handler)
    }
  }, [productSearch, ownerId, useStockManagement])

  const goNext = () => {
    if (step === 1) {
      if (!formState.dc_number) {
        setError('Enter a DC number to continue.')
        return
      }
      if (!formState.hospital_id) {
        setError('Select hospital to continue.')
        return
      }
    }
    if (step === 2) {
      if (!items.length) {
        setError('Add at least one product.')
        return
      }
    }
    setError('')
    setStep((prev) => Math.min(3, prev + 1))
  }

  const goBack = () => {
    setError('')
    setStep((prev) => Math.max(1, prev - 1))
  }

  const addItemFromProduct = (product) => {
    if (items.some((item) => item.product_id === product.id && !item.stock_item_id)) return
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        stock_item_id: null,
        item_name: product.item_name ?? '',
        brand_name: product.brand_name ?? '',
        size: product.size ?? '',
        batch_number: '',
        manufacturing_date: '',
        expiry_date: '',
        quantity: 1,
        available: null,
        unit_price: Number(product.price ?? 0),
        tax_percentage: product.tax_percentage ?? null,
        location: '',
      },
    ])
    setProductSearch('')
    setProductResults([])
  }

  const updateItem = (id, updates) => {
    setItems((prev) =>
      prev.map((item) =>
        item.stock_item_id === id || item.product_id === id
          ? {
              ...item,
              ...updates,
            }
          : item,
      ),
    )
  }

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.stock_item_id !== id && item.product_id !== id))
  }

  const generatePdf = (consignment, itemRows) => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('FieldFlow Delivery Challan', 15, 20)
    doc.setFontSize(12)
    const company = companySettings || {}
    doc.text(`DC Number: ${consignment.dc_number}`, 15, 32)
    const challanDate = consignment.created_at ? new Date(consignment.created_at) : new Date()
    doc.text(`Challan Date: ${challanDate.toLocaleDateString('en-IN')}`, 15, 38)
    let currentY = 46
    doc.text(`Hospital: ${consignment.hospital_name}`, 15, currentY)
    currentY += 8
    if (consignment.hospital_address) {
      doc.text(`Hospital Address: ${consignment.hospital_address}`, 15, currentY)
      currentY += 8
      doc.text(`City: ${consignment.hospital_city ?? ''} ${consignment.hospital_pincode ?? ''}`, 15, currentY)
      currentY += 8
      doc.text(`State: ${consignment.hospital_state ?? ''}`, 15, currentY)
      currentY += 8
      if (consignment.hospital_gstin) {
        doc.text(`GSTIN: ${consignment.hospital_gstin}`, 15, currentY)
        currentY += 8
      }
    }
    doc.text(`Assigned Staff: ${consignment.delivery_staff_name || '-'}`, 15, currentY)
    currentY += 12

    doc.text('Company Details', 15, currentY)
    currentY += 8
    doc.text(`${company.company_name || 'Your Company Name'}`, 15, currentY)
    currentY += 8
    if (company.company_address) {
      doc.text(`${company.company_address}`, 15, currentY)
      currentY += 8
    }
    const cityLine = [company.company_city, company.company_pincode, company.company_state]
      .filter(Boolean)
      .join(' ')
    if (cityLine) {
      doc.text(cityLine, 15, currentY)
      currentY += 8
    }
    if (company.company_gstin) {
      doc.text(`GSTIN: ${company.company_gstin}`, 15, currentY)
      currentY += 8
    }
    if (company.company_pan) {
      doc.text(`PAN: ${company.company_pan}`, 15, currentY)
      currentY += 8
    }

    doc.text('Products', 15, currentY + 6)
    let y = currentY + 14
    itemRows.forEach((item) => {
      doc.text(
        `${item.item_name || item.brand_name} • ${item.size || ''} | Qty: ${item.quantity} | Value: ₹${(
          item.unit_price * item.quantity
        ).toFixed(2)} | Batch: ${item.batch_number || '—'}`,
        15,
        y,
      )
      y += 6
    })
    doc.text(`Total Value: ₹${totalValue.toFixed(2)}`, 15, y + 6)

    doc.save(`DC-${consignment.dc_number ?? 'consignment'}.pdf`)
  }

  const handleSubmit = async () => {
    if (!ownerId) return
    if (!formState.dc_number) {
      setError('Enter a DC number to generate consignment.')
      return
    }

    if (!formState.hospital_id) {
      setError('Select hospital to continue.')
      return
    }

    if (!items.length) {
      setError('Add at least one product.')
      return
    }

    if (useStockManagement) {
      const insufficient = items.some((item) => {
        if (item.available == null) return false
        return Number(item.quantity) > Number(item.available)
      })
      if (insufficient) {
        setError('One or more items exceed available stock. Reduce quantities or add stock.')
        return
      }
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payloadItems = items.map((item) => ({
        product_id: item.product_id,
        stock_item_id: item.stock_item_id ?? null,
        item_name: item.item_name,
        brand_name: item.brand_name,
        size: item.size,
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        tax_percentage: item.tax_percentage != null ? Number(item.tax_percentage) : null,
        manufacturing_date: item.manufacturing_date || null,
        expiry_date: item.expiry_date || null,
        batch_number: item.batch_number || null,
      }))

      const { data: insertConsignment, error: consignmentError } = await supabase
        .from('consignments')
        .insert({
          owner_id: ownerId,
          hospital_id: formState.hospital_id,
          branch_id: formState.branch_id || null,
          delivery_staff_id: formState.delivery_staff_id || null,
          dc_number: formState.dc_number,
          status: 'prepared',
          prepared_by: profile?.id ?? null,
        })
        .select('id, dc_number, created_at')
        .single()

      if (consignmentError) throw consignmentError
      if (!insertConsignment?.id) throw new Error('Consignment creation failed.')

      const { error: itemsError } = await supabase
        .from('consignment_items')
        .insert(
          payloadItems.map((item) => ({
            consignment_id: insertConsignment.id,
            ...item,
          })),
        )
      if (itemsError) throw itemsError

      const { error: rpcError } = await supabase.rpc('finalize_consignment_items', {
        p_consignment_id: insertConsignment.id,
        p_use_stock: useStockManagement,
      })
      if (rpcError) throw rpcError

      setSuccess('Consignment created successfully!')
      setStep(3)
      generatePdf(
        {
          dc_number: insertConsignment.dc_number,
          hospital_name: hospitals.find((hospital) => hospital.id === formState.hospital_id)?.name,
          hospital_address: hospitals.find((hospital) => hospital.id === formState.hospital_id)?.address,
          hospital_city: hospitals.find((hospital) => hospital.id === formState.hospital_id)?.city,
          hospital_state: hospitals.find((hospital) => hospital.id === formState.hospital_id)?.state,
          hospital_pincode: hospitals.find((hospital) => hospital.id === formState.hospital_id)?.pincode,
          hospital_gstin: hospitals.find((hospital) => hospital.id === formState.hospital_id)?.gstin,
          branch_name: branches.find((branch) => branch.id === formState.branch_id)?.name,
          delivery_staff_name: deliveryStaff.find(
            (staff) => staff.id === formState.delivery_staff_id,
          )?.full_name,
          created_at: insertConsignment.created_at,
        },
        payloadItems,
      )
      await loadData()
      setItems([])
      setFormState({ hospital_id: '', branch_id: '', delivery_staff_id: '', dc_number: '' })
    } catch (err) {
      setError(err.message ?? 'Unable to create consignment.')
    } finally {
      setSaving(false)
    }
  }

  const renderStockSelector = () => (
    <div className="space-y-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-white/70">Select from stock</span>
        <select
          value={selectedStockId}
          onChange={(event) => setSelectedStockId(event.target.value)}
          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Choose stock item</option>
          {stockEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.item_name || entry.brand_name} • Batch {entry.batch_number || '—'} • Qty{' '}
              {entry.quantity_available ?? 0}
            </option>
          ))}
        </select>
      </label>
      {!stockEntries.length && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
          No stock entries found. <button className="underline" onClick={() => navigate('/owner/stock')}>Add stock</button> before creating a DC.
        </div>
      )}
    </div>
  )

  const renderProductSelector = () => (
    <div className="space-y-3">
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-white/70">Add product from catalog</span>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2">
            <Search size={16} className="text-white/40" />
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search item or brand"
              className="h-10 flex-1 bg-transparent text-white outline-none"
            />
          </div>
          {productResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900">
              {productResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItemFromProduct(product)}
                  className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  <span className="font-semibold text-white">
                    {product.item_name || 'Unnamed'} — {product.brand_name || 'Unknown'}
                  </span>
                  <span className="text-xs text-white/60">
                    {product.size || 'No size'} • ₹{product.price?.toLocaleString() ?? '—'} • Tax{' '}
                    {product.tax_percentage ?? '—'}%
                  </span>
                </button>
              ))}
            </div>
          )}
          {productSearchLoading && (
            <div className="absolute right-3 top-3 text-xs text-white/50">Searching…</div>
          )}
        </div>
      </label>
      {!productResults.length && productSearch && !productSearchLoading && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          No products found. Add products from the directory.
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Create Consignment</h2>
          <p className="text-sm text-white/60">
            Prepare delivery challans with product details and delivery assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
            {useStockManagement ? 'Stock Mode' : 'Catalog Mode'}
          </span>
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
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                  step === 1 ? 'border-primary bg-primary text-white' : 'border-white/20 text-white/60'
                }`}
              >
                1
              </span>
              <span>Assign destination, DC & delivery</span>
            </div>
            <button
              onClick={goBack}
              disabled={step === 1}
              className="rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
            >
              Back
            </button>
          </div>

          {step === 1 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <DCNumberInput
                  value={formState.dc_number}
                  onChange={(value) => setFormState((prev) => ({ ...prev, dc_number: value }))}
                />
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Hospital</span>
                <select
                  value={formState.hospital_id}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, hospital_id: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} • {hospital.city}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Branch</span>
                <select
                  value={formState.branch_id}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, branch_id: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} • {branch.city}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Delivery Staff</span>
                <select
                  value={formState.delivery_staff_id}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, delivery_staff_id: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select delivery staff</option>
                  {deliveryStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} • {staff.role}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={goNext}
                className="sm:col-span-2 mt-4 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 flex flex-col gap-6">
              {useStockManagement ? renderStockSelector() : renderProductSelector()}

              <div className="flex flex-col gap-4">
                {items.map((item) => {
                  const key = item.stock_item_id ?? item.product_id
                  return (
                    <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            {item.item_name || item.brand_name || 'Unnamed'}
                          </h4>
                          <p className="text-sm text-white/60">
                            {item.brand_name || 'No brand'} • {item.size || 'No size'}
                          </p>
                          {item.available != null && (
                            <p className="text-xs text-white/50">
                              Available: {Number(item.available).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(key)}
                          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-5">
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max={item.available ?? undefined}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.stock_item_id ?? item.product_id, {
                                quantity: Number(event.target.value),
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          Unit Price
                          <input
                            type="number"
                            min="0"
                            value={item.unit_price}
                            onChange={(event) =>
                              updateItem(item.stock_item_id ?? item.product_id, {
                                unit_price: Number(event.target.value),
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          Tax %
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.tax_percentage ?? ''}
                            onChange={(event) =>
                              updateItem(item.stock_item_id ?? item.product_id, {
                                tax_percentage:
                                  event.target.value === '' ? null : Number(event.target.value),
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          MFG Date
                          <input
                            type="date"
                            value={item.manufacturing_date}
                            onChange={(event) =>
                              updateItem(item.stock_item_id ?? item.product_id, {
                                manufacturing_date: event.target.value,
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          Expiry
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(event) =>
                              updateItem(item.stock_item_id ?? item.product_id, {
                                expiry_date: event.target.value,
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                      </div>
                      {item.available != null && Number(item.quantity) > Number(item.available) && (
                        <div className="mt-3 rounded-2xl border-l-4 border-red-500 bg-red-500/10 p-4 text-sm text-red-200">
                          <p>
                            Insufficient stock! Only {Number(item.available).toLocaleString()} available.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/owner/stock')}
                            className="mt-2 text-xs font-semibold text-blue-200 underline"
                          >
                            Add more stock
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  Total items: {items.length} • Value ₹{totalValue.toFixed(2)}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={goBack}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10"
                  >
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-6">
              <DCPreview
                company={companySettings || {}}
                hospital={
                  hospitals.find((hospital) => hospital.id === formState.hospital_id) || {}
                }
                branch={branches.find((branch) => branch.id === formState.branch_id) || {}}
                dcNumber={formState.dc_number}
                items={items}
                createdAt={new Date().toISOString()}
              />

              <div className="flex justify-between">
                <button
                  onClick={goBack}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {saving ? 'Creating…' : 'Create Consignment'}
                </button>
              </div>
            </div>
          )}
        </FluentCard>

        <div className="flex flex-col gap-6">
          <FluentCard glass>
            <h3 className="text-lg font-semibold text-white">Summary</h3>
            <p className="mt-3 text-sm text-white/60">
              Total items: {items.length}
              <br />
              Total value: ₹{totalValue.toLocaleString()}
            </p>
            <p className="mt-3 text-xs text-white/40">
              {useStockManagement
                ? 'Stock will be reserved from available batches.'
                : 'Stock levels will not be affected.'}
            </p>
          </FluentCard>

          {!useStockManagement && (
            <FluentCard glass>
              <div className="flex gap-3">
                <PackagePlus size={18} className="text-primary" />
                <div className="text-sm text-white/60">
                  Need a product? Add it from the catalog to speed up data entry for future consignments.
                </div>
              </div>
              <button
                className="mt-4 w-full rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                onClick={() => navigate('/owner/products')}
              >
                Manage Products
              </button>
            </FluentCard>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        </div>
      )}
    </div>
  )
}

export default CreateConsignment

