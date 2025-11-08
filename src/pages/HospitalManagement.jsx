import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { Edit } from 'lucide-react'

const HospitalManagement = () => {
  const { ownerId } = useAuth()
  const [hospitals, setHospitals] = useState([])
  const [consignments, setConsignments] = useState([])
  const [filters, setFilters] = useState({ query: '', city: '', state: '' })
  const [formState, setFormState] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    contact_person: '',
    phone: '',
    branchName: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [editModal, setEditModal] = useState(null)

  const loadData = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const [{ data: hospitalData, error: hospitalError }, { data: consignmentData, error: consignmentError }] =
        await Promise.all([
          supabase
            .from('hospitals')
            .select('id, name, address, city, state, contact_person, phone, owner_id, branch_id')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false }),
          supabase
            .from('consignments')
            .select('id, hospital_id, status, total_value, delivered_at')
            .eq('owner_id', ownerId),
        ])

      if (hospitalError || consignmentError) throw hospitalError ?? consignmentError

      setHospitals(hospitalData ?? [])
      setConsignments(consignmentData ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to load hospitals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [ownerId])

  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((hospital) => {
        const matchesQuery =
          !filters.query ||
          hospital.name.toLowerCase().includes(filters.query.toLowerCase()) ||
          (hospital.city ?? '').toLowerCase().includes(filters.query.toLowerCase())
        const matchesCity =
          !filters.city ||
          (hospital.city ?? '').toLowerCase() === filters.city.toLowerCase()
        const matchesState =
          !filters.state ||
          (hospital.state ?? '').toLowerCase() === filters.state.toLowerCase()
        return matchesQuery && matchesCity && matchesState
      })
      .map((hospital) => {
        const relatedConsignments = consignments.filter(
          (consignment) => consignment.hospital_id === hospital.id,
        )
        const totalDeliveries = relatedConsignments.filter(
          (consignment) => consignment.status === 'delivered',
        ).length
        const stockValue = relatedConsignments
          .filter((consignment) =>
            ['prepared', 'in_transit', 'delivered'].includes(consignment.status),
          )
          .reduce((total, consignment) => total + Number(consignment.total_value ?? 0), 0)

        return {
          ...hospital,
          totalDeliveries,
          stockValue,
        }
      })
  }, [filters, hospitals, consignments])

  const uniqueCities = useMemo(
    () => Array.from(new Set(hospitals.map((hospital) => hospital.city).filter(Boolean))),
    [hospitals],
  )
  const uniqueStates = useMemo(
    () => Array.from(new Set(hospitals.map((hospital) => hospital.state).filter(Boolean))),
    [hospitals],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user?.id) throw new Error('Unable to determine current user.')

      let branchId = null
      const trimmedBranch = formState.branchName.trim()
      if (trimmedBranch) {
        const { data: existingBranch, error: branchLookupError } = await supabase
          .from('branches')
          .select('id')
          .eq('owner_id', user.id)
          .ilike('name', trimmedBranch)
          .maybeSingle()

        if (branchLookupError) throw branchLookupError
        branchId = existingBranch?.id ?? null

        if (!branchId) {
          const { data: newBranch, error: branchInsertError } = await supabase
            .from('branches')
            .insert({
              owner_id: user.id,
              name: trimmedBranch,
              city: formState.city,
              state: formState.state,
            })
            .select('id')
            .single()

          if (branchInsertError) throw branchInsertError
          branchId = newBranch?.id ?? null
        }
      }

      const { error: insertError } = await supabase.from('hospitals').insert({
        owner_id: user.id,
        branch_id: branchId,
        name: formState.name,
        address: formState.address,
        city: formState.city,
        state: formState.state,
        contact_person: formState.contact_person,
        phone: formState.phone,
      })
      if (insertError) throw insertError
      setFormState({
        name: '',
        address: '',
        city: '',
        state: '',
        contact_person: '',
        phone: '',
        branchName: '',
      })
      await loadData()
      setSuccessMessage('✅ Hospital added successfully')
    } catch (err) {
      setError(err.message ?? 'Unable to add hospital.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateHospital = async (event) => {
    event.preventDefault()
    if (!editModal?.id) return
    if (!editModal.name.trim() || !editModal.address.trim() || !editModal.city.trim()) {
      setError('Name, address, and city are required.');
      return
    }
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { error: updateError } = await supabase
        .from('hospitals')
        .update({
          name: editModal.name,
          address: editModal.address,
          city: editModal.city,
          state: editModal.state,
          contact_person: editModal.contact_person,
          contact_phone: editModal.phone,
        })
        .eq('id', editModal.id)

      if (updateError) throw updateError

      setHospitals((prev) =>
        prev.map((hospital) =>
          hospital.id === editModal.id
            ? {
                ...hospital,
                name: editModal.name,
                address: editModal.address,
                city: editModal.city,
                state: editModal.state,
                contact_person: editModal.contact_person,
                phone: editModal.phone,
              }
            : hospital,
        ),
      )
      setEditModal(null)
      setSuccessMessage('✅ Hospital updated successfully')
    } catch (err) {
      setError(err.message ?? 'Unable to update hospital.')
    } finally {
      setSaving(false)
    }
  }

  const totalValue = useMemo(
    () =>
      filteredHospitals.reduce(
        (total, hospital) => total + Number(hospital.stockValue ?? 0),
        0,
      ),
    [filteredHospitals],
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Hospital Network</h2>
          <p className="text-sm text-white/60">
            Monitor partner hospitals, manage key contacts, and track delivery performance.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FluentCard glass>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-white">Hospitals</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                placeholder="Search hospital or city"
                value={filters.query}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, query: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <select
                value={filters.city}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, city: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select
                value={filters.state}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, state: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All states</option>
                {uniqueStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {filteredHospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{hospital.name}</h4>
                    <p className="text-sm text-white/60">
                      {hospital.city}, {hospital.state}
                    </p>
                    <p className="text-xs text-white/50">
                      Contact: {hospital.contact_person ?? '—'} • {hospital.phone ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-widest text-white/40">
                        Deliveries
                      </span>
                      <p className="text-xl font-semibold text-white">
                        {hospital.totalDeliveries}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditModal({
                          id: hospital.id,
                          name: hospital.name,
                          address: hospital.address ?? '',
                          city: hospital.city ?? '',
                          state: hospital.state ?? '',
                          contact_person: hospital.contact_person ?? '',
                          phone: hospital.phone ?? '',
                          branch_id: hospital.branch_id ?? '',
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                    >
                      <Edit size={14} /> Edit
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-900/50 p-3 text-sm text-white/70">
                    <span className="text-xs uppercase text-white/40">Address</span>
                    <p className="mt-1 text-sm text-white/80">
                      {hospital.address || 'Not provided'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/50 p-3 text-sm text-white/70">
                    <span className="text-xs uppercase text-white/40">Owner ID</span>
                    <p className="mt-1 text-sm text-white/80">{hospital.owner_id}</p>
                  </div>
                </div>
              </div>
            ))}
            {!filteredHospitals.length && !loading && (
              <p className="text-center text-sm text-white/50">No hospitals found.</p>
            )}
          </div>
        </FluentCard>

        <div className="flex flex-col gap-6">
          <FluentCard glass>
            <h3 className="mb-4 text-lg font-semibold text-white">Add Hospital</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="Hospital Name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <div>
                <input
                  placeholder="Assign Branch (optional)"
                  value={formState.branchName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, branchName: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
                <p className="mt-1 text-xs text-white/50">
                  If the branch doesn’t exist, it will be created automatically.
                </p>
              </div>
              <input
                placeholder="Address"
                value={formState.address}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, address: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="City"
                  value={formState.city}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
                <input
                  placeholder="State"
                  value={formState.state}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, state: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <input
                placeholder="Contact Person"
                value={formState.contact_person}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, contact_person: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                placeholder="Phone"
                value={formState.phone}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
              >
                {saving ? 'Saving...' : 'Add Hospital'}
              </button>
            </form>
          </FluentCard>

          <FluentCard glass>
            <h4 className="text-sm uppercase tracking-widest text-white/60">Total Inventory Value</h4>
            <p className="mt-2 text-3xl font-semibold text-white">
              ₹{totalValue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Across {filteredHospitals.length} hospitals
            </p>
          </FluentCard>
        </div>
      </div>

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
          <FluentCard glass className="w-full max-w-lg p-8 text-white">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Edit Hospital</h3>
                <p className="text-sm text-white/70">Modify hospital details and save your changes.</p>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/20"
              >
                Close
              </button>
            </header>

            <form onSubmit={handleUpdateHospital} className="space-y-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Name</span>
                <input
                  value={editModal.name}
                  onChange={(event) => setEditModal((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Address</span>
                <textarea
                  value={editModal.address}
                  onChange={(event) => setEditModal((prev) => ({ ...prev, address: event.target.value }))}
                  required
                  rows={3}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">City</span>
                  <input
                    value={editModal.city}
                    onChange={(event) => setEditModal((prev) => ({ ...prev, city: event.target.value }))}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">State</span>
                  <input
                    value={editModal.state}
                    onChange={(event) => setEditModal((prev) => ({ ...prev, state: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Contact Person</span>
                <input
                  value={editModal.contact_person}
                  onChange={(event) =>
                    setEditModal((prev) => ({ ...prev, contact_person: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Contact Phone</span>
                <input
                  value={editModal.phone}
                  onChange={(event) => setEditModal((prev) => ({ ...prev, phone: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Branch</span>
                  <select
                    value={editModal.branch_id ?? ''}
                    onChange={(event) =>
                      setEditModal((prev) => ({ ...prev, branch_id: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">None</option>
                    {/* Branches are now managed by the user, so this dropdown is no longer needed */}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
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

export default HospitalManagement

