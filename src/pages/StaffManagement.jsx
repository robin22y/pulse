import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { Copy, Share2, Edit, Ban, Check } from 'lucide-react'

const roleOptions = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Sales', value: 'sales' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Office', value: 'office' },
]

const StaffManagement = () => {
  const { ownerId, profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formState, setFormState] = useState({
    full_name: '',
    role: roleOptions[0].value,
    city: '',
    state: '',
    manager_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [shareModal, setShareModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const isOwner = profile?.role === 'owner'
  const canApprove = useMemo(() => isOwner, [isOwner])
  const businessCode = profile?.business_code ?? ''

  const buildShortLink = (staffCode) =>
    businessCode && staffCode
      ? `${window.location.origin}/${businessCode}/${staffCode}`
      : `${window.location.origin}/staff/${ownerId}`

  const loadStaff = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(
          'id, full_name, role, city, state, status, manager_id, owner_id, pin, is_active, staff_code, manager:manager_id(full_name)'
        )
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setStaff(data ?? [])
      setManagers((data ?? []).filter((user) => ['manager', 'owner', 'admin'].includes(user.role)))
    } catch (err) {
      setError(err.message ?? 'Unable to load staff.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [ownerId])

  const resetForm = () => {
    setFormState({
      full_name: '',
      role: roleOptions[0].value,
      city: '',
      state: '',
      manager_id: '',
    })
  }

  const handleAddStaff = async (event) => {
    event.preventDefault()
    if (!ownerId) return
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { data, error } = await supabase.rpc('create_staff_member', {
        p_full_name: formState.full_name,
        p_role: formState.role,
        p_city: formState.city || null,
        p_state: formState.state || null,
        p_manager_id: formState.manager_id || null,
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Failed to create staff')

      const staffCode = data?.staff_code ?? ''
      const shortLink = buildShortLink(staffCode)

      setShareModal({
        name: formState.full_name,
        pin: data.pin,
        link: shortLink,
        message: 'Welcome the staff member and share their PIN securely. They must change it after first login.',
      })

      resetForm()
      await loadStaff()
    } catch (err) {
      setError(err.message ?? 'Unable to create staff.')
    } finally {
      setSaving(false)
    }
  }

  const handleApproval = async (userId, status) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId)

      if (updateError) throw updateError
      await loadStaff()
    } catch (err) {
      setError(err.message ?? 'Unable to update staff status.')
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Clipboard copy failed', err)
    }
  }

  const handleResetPin = async (member) => {
    if (!window.confirm(`Reset PIN for ${member.full_name}?`)) return
    setSaving(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('reset_staff_pin', { p_staff_id: member.id })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Unable to reset PIN')

      const newPin = data.new_pin ?? data.pin
      const shortLink = buildShortLink(member.staff_code)
      setShareModal({
        name: member.full_name,
        pin: newPin,
        link: shortLink,
        message: 'Staff PIN reset. Share the new PIN—staff must change it on next login.',
      })

      await loadStaff()
    } catch (err) {
      setError(err.message ?? 'Unable to reset PIN.')
    } finally {
      setSaving(false)
    }
  }

  const handleShareLogin = (member) => {
    const shortLink = buildShortLink(member.staff_code)
    setShareModal({
      name: member.full_name,
      pin: member.pin ?? null,
      link: shortLink,
      message: 'Share the login link with your staff. Reset the PIN if they need a fresh one.',
    })
  }

  const handleUpdateStaff = async (event) => {
    event.preventDefault()
    if (!editModal?.id) return
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: editModal.full_name,
          city: editModal.city || null,
          state: editModal.state || null,
          role: editModal.role,
          is_active: editModal.is_active,
        })
        .eq('id', editModal.id)

      if (updateError) throw updateError
      setStaff((prev) =>
        prev.map((staffMember) =>
          staffMember.id === editModal.id
            ? {
                ...staffMember,
                full_name: editModal.full_name,
                city: editModal.city,
                state: editModal.state,
                role: editModal.role,
                is_active: editModal.is_active,
              }
            : staffMember,
        ),
      )
      setEditModal(null)
      setSuccessMessage('✅ Saved successfully!')
    } catch (err) {
      setError(err.message ?? 'Unable to update staff.')
    } finally {
      setSaving(false)
    }
  }

  const handlePromoteStaff = async (member, newRole) => {
    if (!window.confirm(`Promote ${member.full_name} to ${newRole}?`)) return
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase.rpc('promote_staff', {
        p_staff_id: member.id,
        p_new_role: newRole,
      })
      if (error) throw error
      await loadStaff()
    } catch (err) {
      setError(err.message ?? 'Unable to promote staff member.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivateStaff = async (member) => {
    if (!window.confirm(`Deactivate ${member.full_name}?`)) return
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', member.id)
      if (error) throw error
      await loadStaff()
      setSuccessMessage('Staff member deactivated.')
    } catch (err) {
      setError(err.message ?? 'Unable to deactivate staff member.')
    } finally {
      setSaving(false)
    }
  }

  const handleActivateStaff = async (member) => {
    if (profile?.role !== 'owner') return
    if (!window.confirm(`Activate ${member.full_name}?`)) return
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true, status: 'active' })
        .eq('id', member.id)
      if (error) throw error
      await loadStaff()
      setSuccessMessage('Staff member activated.')
    } catch (err) {
      setError(err.message ?? 'Unable to activate staff member.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Staff Management</h2>
          <p className="text-sm text-white/60">
            Manage staff, assign managers, and control approval workflows.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setModalOpen(true)
          }}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Add Staff Member
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {successMessage}
        </div>
      )}

      <FluentCard glass>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Active Team</h3>
          <span className="text-xs uppercase tracking-widest text-white/40">
            {staff.length} members
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {staff.map((member) => {
            const managerName = member.manager?.full_name ?? null
            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{member.full_name}</p>
                  <p className="text-xs text-white/40">
                    {member.city}, {member.state}
                  </p>
                  <p className="text-xs text-white/50">
                    Manager: {managerName ?? '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
                  >
                    {member.role}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                      member.is_active
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-red-500/10 text-red-300'
                    }`}
                  >
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {member.status && member.status !== 'active' && (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
                      {member.status}
                    </span>
                  )}
                  {isOwner && member.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => handleApproval(member.id, 'active')}
                        className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(member.id, 'rejected')}
                        className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      setEditModal({
                        id: member.id,
                        full_name: member.full_name,
                        city: member.city ?? '',
                        state: member.state ?? '',
                        role: member.role,
                        is_active: Boolean(member.is_active),
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleResetPin(member)}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                  >
                    Reset PIN
                  </button>
                  <button
                    onClick={() => handleShareLogin(member)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                  >
                    <Share2 size={14} /> Share Login
                  </button>
                  {member.is_active ? (
                    <button
                      onClick={() => isOwner && handleDeactivateStaff(member)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                      disabled={!isOwner}
                    >
                      <Ban size={14} /> Deactivate
                    </button>
                  ) : isOwner ? (
                    <button
                      onClick={() => handleActivateStaff(member)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                    >
                      <Check size={14} /> Activate
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
          {!staff.length && !loading && (
            <p className="text-center text-sm text-white/50">No staff members yet.</p>
          )}
        </div>
      </FluentCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <FluentCard glass className="w-full max-w-2xl p-8">
            <header className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Add Staff Member</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/10"
              >
                Close
              </button>
            </header>

            <form
              onSubmit={handleAddStaff}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Full Name</span>
                <input
                  value={formState.full_name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                  required
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  placeholder="Jane Doe"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Role</span>
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, role: event.target.value }))
                  }
                  className="appearance-none rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">City</span>
                <input
                  value={formState.city}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  placeholder="Bengaluru"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">State</span>
                <input
                  value={formState.state}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, state: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  placeholder="Karnataka"
                />
              </label>

              {formState.role !== 'owner' && (
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Assign Manager</span>
                  <select
                    value={formState.manager_id}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, manager_id: event.target.value }))
                    }
                    className="appearance-none rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name} • {manager.role}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="sm:col-span-2 mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {saving ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>

            {shareModal && null}
          </FluentCard>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
          <FluentCard glass className="w-full max-w-lg p-8 text-white">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Edit Staff Details</h3>
                <p className="text-sm text-white/70">Update name or location information.</p>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/20"
              >
                Close
              </button>
            </header>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Full Name</span>
                <input
                  value={editModal.full_name}
                  onChange={(event) =>
                    setEditModal((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                  required
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">City</span>
                <input
                  value={editModal.city}
                  onChange={(event) =>
                    setEditModal((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">State</span>
                <input
                  value={editModal.state}
                  onChange={(event) =>
                    setEditModal((prev) => ({ ...prev, state: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70">Role</span>
                <select
                  value={editModal.role}
                  onChange={(event) =>
                    setEditModal((prev) => ({ ...prev, role: event.target.value }))
                  }
                  className="appearance-none rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={Boolean(editModal.is_active)}
                  onChange={(event) =>
                    setEditModal((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
                Active
              </label>
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

      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
          <FluentCard glass className="w-full max-w-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Share Staff Credentials</h3>
                <p className="text-sm text-white/70">{shareModal.message}</p>
              </div>
              <button
                onClick={() => setShareModal(null)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/60 hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-white/60">Staff Name</p>
              <p className="text-lg font-semibold text-white">{shareModal.name}</p>

              {shareModal.pin && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary/70">PIN</p>
                    <p className="text-3xl font-semibold tracking-[0.4em] text-primary">
                      {shareModal.pin}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(shareModal.pin)}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    <Copy size={16} /> Copy PIN
                  </button>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Login Link</p>
                <p className="mt-1 break-all text-sm text-white/90">{shareModal.link}</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => copyToClipboard(shareModal.link)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  <Copy size={16} /> Copy Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Your FieldFlow login\n${shareModal.pin ? `PIN: ${shareModal.pin}\n` : ''}${shareModal.link}\nChange your PIN after first login.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  <Share2 size={16} /> Share on WhatsApp
                </a>
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

export default StaffManagement

