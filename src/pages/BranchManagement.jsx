import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const BranchManagement = () => {
  const { ownerId } = useAuth()
  const [branches, setBranches] = useState([])
  const [staff, setStaff] = useState([])
  const [consignments, setConsignments] = useState([])
  const [formState, setFormState] = useState({
    name: '',
    city: '',
    state: '',
    address: '',
  })
  const [assignment, setAssignment] = useState({
    branch_id: '',
    staff_id: '',
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
        { data: branchData, error: branchError },
        { data: staffData, error: staffError },
        { data: consignmentData, error: consignmentError },
      ] = await Promise.all([
        supabase.from('branches').select('id, name, city, state, address').eq('owner_id', ownerId),
        supabase
          .from('users')
          .select('id, full_name, role, branch_id')
          .eq('owner_id', ownerId)
          .not('role', 'in', '(owner,admin)'),
        supabase
          .from('consignments')
          .select('id, branch_id, status, total_value')
          .eq('owner_id', ownerId),
      ])

      if (branchError || staffError || consignmentError) {
        throw branchError ?? staffError ?? consignmentError
      }

      setBranches(branchData ?? [])
      setStaff(staffData ?? [])
      setConsignments(consignmentData ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to load branches.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [ownerId])

  const branchSummaries = useMemo(() => {
    return branches.map((branch) => {
      const branchStaff = staff.filter((member) => member.branch_id === branch.id)
      const activeConsignments = consignments.filter(
        (consignment) =>
          consignment.branch_id === branch.id && consignment.status !== 'delivered',
      )
      return {
        ...branch,
        staffCount: branchStaff.length,
        activeConsignments: activeConsignments.length,
        value: activeConsignments.reduce(
          (total, consignment) => total + Number(consignment.total_value ?? 0),
          0,
        ),
      }
    })
  }, [branches, staff, consignments])

  const handleAddBranch = async (event) => {
    event.preventDefault()
    if (!ownerId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: insertError } = await supabase.from('branches').insert({
        ...formState,
        owner_id: ownerId,
      })
      if (insertError) throw insertError
      setFormState({ name: '', city: '', state: '', address: '' })
      setSuccess('Branch created.')
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Unable to create branch.')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignStaff = async (event) => {
    event.preventDefault()
    if (!assignment.branch_id || !assignment.staff_id) {
      setError('Select branch and staff to assign.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ branch_id: assignment.branch_id })
        .eq('id', assignment.staff_id)

      if (updateError) throw updateError
      setAssignment({ branch_id: '', staff_id: '' })
      setSuccess('Staff assigned to branch.')
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Unable to assign staff.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Branch Management</h2>
          <p className="text-sm text-white/60">
            Oversee branches, teams, and workload distribution across the network.
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
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Branches</h3>
            <span className="text-xs uppercase tracking-widest text-white/40">
              {branchSummaries.length} locations
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {branchSummaries.map((branch) => (
              <div
                key={branch.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{branch.name}</h4>
                    <p className="text-sm text-white/60">
                      {branch.city}, {branch.state}
                    </p>
                    <p className="text-xs text-white/50">{branch.address}</p>
                  </div>
                  <div className="text-right text-sm text-white/70">
                    <p className="text-white">
                      Staff: <strong>{branch.staffCount}</strong>
                    </p>
                    <p className="text-white">
                      Active consignments: <strong>{branch.activeConsignments}</strong>
                    </p>
                    <p className="text-white/70 text-xs">
                      Value ₹{branch.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!branchSummaries.length && !loading && (
              <p className="text-center text-sm text-white/60">
                No branches yet. Add one using the form.
              </p>
            )}
          </div>
        </FluentCard>

        <div className="flex flex-col gap-6">
          <FluentCard glass>
            <h3 className="mb-4 text-lg font-semibold text-white">Add Branch</h3>
            <form onSubmit={handleAddBranch} className="flex flex-col gap-3">
              <input
                required
                placeholder="Branch name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
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
              <textarea
                placeholder="Address"
                value={formState.address}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, address: event.target.value }))
                }
                rows={3}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Create Branch'}
              </button>
            </form>
          </FluentCard>

          <FluentCard glass>
            <h3 className="mb-4 text-lg font-semibold text-white">Assign Staff</h3>
            <form onSubmit={handleAssignStaff} className="flex flex-col gap-3">
              <select
                value={assignment.branch_id}
                onChange={(event) =>
                  setAssignment((prev) => ({ ...prev, branch_id: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <select
                value={assignment.staff_id}
                onChange={(event) =>
                  setAssignment((prev) => ({ ...prev, staff_id: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select staff</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} • {member.role}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed"
              >
                {saving ? 'Assigning...' : 'Assign'}
              </button>
            </form>
          </FluentCard>
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

export default BranchManagement

