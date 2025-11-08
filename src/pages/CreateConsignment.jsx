import { jsPDF } from 'jspdf'
import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const CreateConsignment = () => {
  const { ownerId, profile } = useAuth()
  const [step, setStep] = useState(1)
  const [hospitals, setHospitals] = useState([])
  const [branches, setBranches] = useState([])
  const [deliveryStaff, setDeliveryStaff] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
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
          .select('id, brand_name, size, price')
          .eq('owner_id', ownerId)
          .order('brand_name'),
        supabase
          .from('inventory')
          .select('id, product_id, quantity')
          .eq('owner_id', ownerId),
      ])

      if (hospitalError || branchError || staffError || productError || inventoryError) {
        throw hospitalError ?? branchError ?? staffError ?? productError ?? inventoryError
      }

      setHospitals(hospitalData ?? [])
      setBranches(branchData ?? [])
      setDeliveryStaff(staffData ?? [])
      setProducts(productData ?? [])
      setInventory(inventoryData ?? [])
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
        (total, item) => total + Number(item.quantity ?? 0) * Number(item.price ?? 0),
        0,
      ),
    [items],
  )

  const addItem = (productId) => {
    const product = productInventory.find((prod) => prod.id === productId)
    if (!product) return
    if (items.some((item) => item.product_id === productId)) return
    setItems((prev) => [
      ...prev,
      {
        product_id: productId,
        brand_name: product.brand_name,
        size: product.size,
        price: product.price ?? 0,
        quantity: 1,
        manufacture_date: '',
        expiry_date: '',
      },
    ])
  }

  const updateItem = (productId, updates) => {
    setItems((prev) =>
      prev.map((item) => (item.product_id === productId ? { ...item, ...updates } : item)),
    )
  }

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const goNext = () => {
    if (step === 1) {
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

  const generatePdf = (consignment, itemRows) => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('FieldFlow Delivery Challan', 15, 20)
    doc.setFontSize(12)
    doc.text(`DC Number: ${consignment.dc_number}`, 15, 32)
    doc.text(`Hospital: ${consignment.hospital_name}`, 15, 40)
    doc.text(`Branch: ${consignment.branch_name || '-'}`, 15, 48)
    doc.text(`Assigned Staff: ${consignment.delivery_staff_name || '-'}`, 15, 56)

    doc.text('Products', 15, 70)
    let y = 78
    itemRows.forEach((item) => {
      doc.text(
        `${item.brand_name} • ${item.size} | Qty: ${item.quantity} | Value: ₹${(
          item.price * item.quantity
        ).toFixed(2)}`,
        15,
        y,
      )
      y += 8
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
    setSaving(true)
    setError('')
    setSuccess('')
    const totalQtyIssues = items.some((item) => {
      const stock = productInventory.find((prod) => prod.id === item.product_id)?.stock ?? 0
      return item.quantity > stock
    })
    if (totalQtyIssues) {
      setError('One or more items exceed available stock.')
      setSaving(false)
      return
    }
    try {
      const { data: insertConsignment, error: consignmentError } = await supabase
        .from('consignments')
        .insert({
          owner_id: ownerId,
          hospital_id: formState.hospital_id,
          branch_id: formState.branch_id || null,
          delivery_staff_id: formState.delivery_staff_id || null,
          dc_number: formState.dc_number,
          total_value: totalValue,
          status: 'prepared',
          prepared_by: profile?.id ?? null,
        })
        .select('id')
        .single()

      if (consignmentError) throw consignmentError

      const consignmentId = insertConsignment.id

      const itemPayload = items.map((item) => ({
        owner_id: ownerId,
        consignment_id: consignmentId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price ?? 0,
        manufacture_date: item.manufacture_date || null,
        expiry_date: item.expiry_date || null,
      }))

      const { error: itemsError } = await supabase.from('consignment_items').insert(itemPayload)
      if (itemsError) throw itemsError

      await Promise.all(
        itemPayload.map(async (payload) => {
          const inventoryItem = inventory.find((inv) => inv.product_id === payload.product_id)
          if (!inventoryItem) return
          const newQuantity = Number(inventoryItem.quantity ?? 0) - Number(payload.quantity ?? 0)
          const { error: updateInventoryError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', inventoryItem.id)
          if (updateInventoryError) {
            throw updateInventoryError
          }
        }),
      )

      const hospital = hospitals.find((hosp) => hosp.id === formState.hospital_id)
      const branch = branches.find((br) => br.id === formState.branch_id)
      const staff = deliveryStaff.find((st) => st.id === formState.delivery_staff_id)

      generatePdf(
        {
          dc_number: formState.dc_number,
          hospital_name: hospital?.name,
          branch_name: branch?.name,
          delivery_staff_name: staff?.full_name,
        },
        items,
      )

      setSuccess('Consignment created successfully.')
      setItems([])
      setFormState({
        hospital_id: '',
        branch_id: '',
        delivery_staff_id: '',
        dc_number: '',
      })
      setStep(1)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Unable to create consignment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Create Consignment</h2>
          <p className="text-sm text-white/60">
            Guided flow to assemble consignments with automatic documentation.
          </p>
        </div>
      </header>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error || success}
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
              <span>Assign destination & delivery</span>
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
                className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <label className="text-sm text-white/70">Add product</label>
                <select
                  onChange={(event) => {
                    if (event.target.value) {
                      addItem(event.target.value)
                      event.target.value = ''
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select product</option>
                  {productInventory.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.brand_name} • {product.size} • Stock {product.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-4">
                {items.map((item) => {
                  const product = productInventory.find((prod) => prod.id === item.product_id)
                  const stock = product?.stock ?? 0
                  return (
                    <div
                      key={item.product_id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-white">{item.brand_name}</h4>
                          <p className="text-sm text-white/60">
                            Size: {item.size} • Stock available: {stock}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max={stock}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.product_id, {
                                quantity: Number(event.target.value),
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          Price
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(event) =>
                              updateItem(item.product_id, {
                                price: Number(event.target.value),
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase text-white/50">
                          MFG Date
                          <input
                            type="date"
                            value={item.manufacture_date}
                            onChange={(event) =>
                              updateItem(item.product_id, {
                                manufacture_date: event.target.value,
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
                              updateItem(item.product_id, {
                                expiry_date: event.target.value,
                              })
                            }
                            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                      </div>
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
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 flex flex-col gap-6">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">DC Number</span>
                <input
                  value={formState.dc_number}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, dc_number: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  placeholder="DC-2025-001"
                />
              </label>

              <FluentCard accent className="border border-primary/40 bg-primary/15">
                <h4 className="text-sm uppercase tracking-widest text-white/70">
                  Review Summary
                </h4>
                <div className="mt-4 text-sm text-white/80">
                  <p>
                    Hospital:{' '}
                    <strong>
                      {hospitals.find((h) => h.id === formState.hospital_id)?.name ?? '-'}
                    </strong>
                  </p>
                  <p>
                    Branch:{' '}
                    <strong>
                      {branches.find((b) => b.id === formState.branch_id)?.name ?? '-'}
                    </strong>
                  </p>
                  <p>
                    Delivery Staff:{' '}
                    <strong>
                      {deliveryStaff.find((s) => s.id === formState.delivery_staff_id)?.full_name ??
                        '-'}
                    </strong>
                  </p>
                  <p>Total Value: ₹{totalValue.toLocaleString()}</p>
                  <p>Products: {items.length}</p>
                </div>
              </FluentCard>

              <div className="flex items-center justify-between">
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
                  {saving ? 'Creating...' : 'Create Consignment'}
                </button>
              </div>
            </div>
          )}
        </FluentCard>

        <FluentCard glass>
          <h3 className="text-lg font-semibold text-white">Consignment Summary</h3>
          <p className="mt-2 text-sm text-white/60">
            Track key metrics before final submission.
          </p>
          <div className="mt-6 flex flex-col gap-4 text-sm text-white/80">
            <div className="rounded-2xl bg-white/5 p-3">
              <span className="text-xs uppercase text-white/40">Items</span>
              <p className="mt-1 text-2xl font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <span className="text-xs uppercase text-white/40">Total Value</span>
              <p className="mt-1 text-2xl font-semibold text-white">
                ₹{totalValue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <span className="text-xs uppercase text-white/40">Status</span>
              <p className="mt-1 text-lg font-semibold text-emerald-300">Prepared</p>
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

export default CreateConsignment

