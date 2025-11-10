import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  Plus,
  Users,
  Search,
  Copy,
  Share2,
  Pencil,
  Ban,
  Check,
} from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'

const roleOptions = [
  { label: 'Delivery', value: 'delivery' },
  { label: 'Office', value: 'office' },
  { label: 'Manager', value: 'manager' },
  { label: 'Admin', value: 'admin' },
]

const StaffManagement = () => {
  const { ownerId, profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [shareModal, setShareModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formState, setFormState] = useState({
    full_name: '',
    username: '',
    role: roleOptions[0].value,
    phone: '',
    city: '',
    state: '',
    manager_id: '',
  })

  const isOwnerOrAdmin = ['owner', 'admin'].includes(profile?.role ?? '')

  const loadStaff = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, full_name, username, role, city, state, phone, is_active, status, manager_id, must_change_password, manager:manager_id(full_name)')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setStaff(data ?? [])
      setManagers((data ?? []).filter((user) => ['manager', 'owner', 'admin'].includes(user.role)))
    } catch (err) {
      console.error('Load staff failed', err)
      setError(err.message ?? 'Unable to load staff')
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
      username: '',
      role: roleOptions[0].value,
      phone: '',
      city: '',
      state: '',
      manager_id: '',
    })
  }

  const handleAddStaff = async (event) => {
    event.preventDefault()
    if (!ownerId) return

    const username = formState.username.trim().toLowerCase()
    if (!/^[a-z0-9_.-]{3,}$/i.test(username)) {
      setError('Username must be at least 3 characters and contain only letters, numbers, dots, hyphens, or underscores.')
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'createStaff',
          payload: {
            ownerId,
            fullName: formState.full_name,
            username,
            role: formState.role,
            phone: formState.phone || null,
            city: formState.city || null,
            state: formState.state || null,
            managerId: formState.manager_id || null,
          },
        },
      })

      if (fnError) throw fnError
      if (!data?.success) throw new Error(data?.error || 'Unable to create staff member.')

      setShareModal({
        name: formState.full_name,
        username,
        password: data.temporaryPassword,
        contact: formState.phone,
      })

      resetForm()
      await loadStaff()
      setSuccessMessage('Staff member created and credentials generated.')
    } catch (err) {
      console.error('Create staff failed', err)
      setError(err.message ?? 'Unable to create staff member.')
    } finally {
      setSaving(false)
    }
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
          role: editModal.role,
          city: editModal.city || null,
          state: editModal.state || null,
          phone: editModal.phone || null,
          is_active: editModal.is_active,
        })
        .eq('id', editModal.id)

      if (updateError) throw updateError
      await loadStaff()
      setEditModal(null)
      setSuccessMessage('Staff updated successfully.')
    } catch (err) {
      setError(err.message ?? 'Unable to update staff member.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (member, active) => {
    if (!isOwnerOrAdmin) return
    if (!window.confirm(`${active ? 'Activate' : 'Deactivate'} ${member.full_name}?`)) return
    setSaving(true)
    setError('')
    try {
      const { error: toggleError } = await supabase
        .from('users')
        .update({ is_active: active })
        .eq('id', member.id)

      if (toggleError) throw toggleError
      await loadStaff()
    } catch (err) {
      setError(err.message ?? 'Unable to update staff status.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (member) => {
    if (!isOwnerOrAdmin) return
    if (!window.confirm(`Generate a new password for ${member.full_name}?`)) return
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'resetPassword',
          payload: {
            userId: member.id,
            username: member.username,
          },
        },
      })

      if (fnError) throw fnError
      if (!data?.success) throw new Error(data?.error || 'Unable to reset password.')

      setShareModal({
        name: member.full_name,
        username: member.username,
        password: data.temporaryPassword,
        contact: member.phone,
      })
      setSuccessMessage('Temporary password generated.')
    } catch (err) {
      console.error('Reset password failed', err)
      setError(err.message ?? 'Unable to reset password.')
    } finally {
      setSaving(false)
    }
  }

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staff
    const term = searchTerm.toLowerCase()
    return staff.filter((member) =>
      [member.full_name, member.username, member.role, member.city, member.state]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [staff, searchTerm])

  return (
    <>
      <PageHeader
        title="Staff Management"
        description="Manage team members, credentials, and access permissions."
        actions={
          isOwnerOrAdmin && (
            <button
              onClick={() => {
                resetForm()
                setModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/30"
            >
              <Plus size={16} /> Add Staff
            </button>
          )
        }
      />

      <div className="flex flex-col gap-6">
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-white">
              <Users size={20} />
              <span className="text-sm uppercase tracking-widest text-white/60">{staff.length} team members</span>
            </div>
            <div className="relative w-full max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
                placeholder="Search name, username, role"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
                Loading team members…
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
                No staff found. Add team members to get started.
              </div>
            ) : (
              filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{member.full_name}</p>
                    <p className="text-xs text-white/50">Username: {member.username}</p>
                    <p className="text-xs text-white/40">
                      {member.city || '—'}, {member.state || '—'}
                    </p>
                    {member.manager?.full_name && (
                      <p className="text-xs text-white/40">Manager: {member.manager.full_name}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                      {member.role}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                        member.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                      }`}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {member.must_change_password && (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
                        Needs Password Reset
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setEditModal({
                          id: member.id,
                          full_name: member.full_name,
                          role: member.role,
                          city: member.city ?? '',
                          state: member.state ?? '',
                          phone: member.phone ?? '',
                          is_active: member.is_active,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => handleResetPassword(member)}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        <Share2 size={14} /> Reset Password
                      </button>
                    )}
                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => handleToggleActive(member, !member.is_active)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                      >
                        {member.is_active ? (
                          <>
                            <Ban size={14} /> Deactivate
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Activate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </FluentCard>
      </div>

      {modalOpen && (
        <StaffModal
          formState={formState}
          setFormState={setFormState}
          managers={managers}
          onClose={() => {
            setModalOpen(false)
            resetForm()
          }}
          onSubmit={handleAddStaff}
          saving={saving}
        />
      )}

      {shareModal && (
        <ShareCredentialsModal data={shareModal} onClose={() => setShareModal(null)} />
      )}

      {editModal && (
        <EditStaffModal
          editModal={editModal}
          setEditModal={setEditModal}
          saving={saving}
          onSubmit={handleUpdateStaff}
        />
      )}
    </>
  )
}

const StaffModal = ({ formState, setFormState, managers, onClose, onSubmit, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Add Team Member</h3>
        <button onClick={onClose} className="text-xs uppercase tracking-widest text-white/60">
          Close
        </button>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-xs uppercase tracking-widest text-white/50">Full Name</label>
          <input
            type="text"
            value={formState.full_name}
            onChange={(event) => setFormState((prev) => ({ ...prev, full_name: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-white/50">Username</label>
          <input
            type="text"
            value={formState.username}
            onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
            placeholder="e.g. raj"
            required
          />
          <p className="mt-1 text-xs text-white/40">Username will become username@pulse.internal</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">Role</label>
            <select
              value={formState.role}
              onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">Manager</label>
            <select
              value={formState.manager_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, manager_id: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="">None</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">City</label>
            <input
              type="text"
              value={formState.city}
              onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">State</label>
            <input
              type="text"
              value={formState.state}
              onChange={(event) => setFormState((prev) => ({ ...prev, state: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-white/50">Phone (optional)</label>
          <input
            type="tel"
            value={formState.phone}
            onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Staff'}
          </button>
        </div>
      </form>
    </div>
  </div>
)

const EditStaffModal = ({ editModal, setEditModal, saving, onSubmit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Staff Member</h3>
        <button onClick={() => setEditModal(null)} className="text-xs uppercase tracking-widest text-white/60">
          Close
        </button>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-xs uppercase tracking-widest text-white/50">Full Name</label>
          <input
            type="text"
            value={editModal.full_name}
            onChange={(event) => setEditModal((prev) => ({ ...prev, full_name: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">Role</label>
            <select
              value={editModal.role}
              onChange={(event) => setEditModal((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">Phone</label>
            <input
              type="tel"
              value={editModal.phone}
              onChange={(event) => setEditModal((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">City</label>
            <input
              type="text"
              value={editModal.city}
              onChange={(event) => setEditModal((prev) => ({ ...prev, city: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">State</label>
            <input
              type="text"
              value={editModal.state}
              onChange={(event) => setEditModal((prev) => ({ ...prev, state: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={editModal.is_active}
            onChange={(event) => setEditModal((prev) => ({ ...prev, is_active: event.target.checked }))}
            className="h-4 w-4 rounded border border-white/20 text-primary focus:ring-primary"
          />
          Active account
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setEditModal(null)}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  </div>
)

const ShareCredentialsModal = ({ data, onClose }) => {
  const copyCredentials = async () => {
    const message = `Login credentials for ${data.name}\nUsername: ${data.username}\nPassword: ${data.password}\nLogin: https://pulse.digiget.org`
    try {
      await navigator.clipboard.writeText(message)
    } catch (err) {
      console.error('Clipboard write failed', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Share Credentials</h3>
          <button onClick={onClose} className="text-xs uppercase tracking-widest text-white/60">
            Close
          </button>
        </div>

        <div className="space-y-3 text-sm text-white/80">
          <p className="text-white">Share these credentials securely with {data.name}.</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <p>Username: <span className="font-semibold text-white">{data.username}</span></p>
            <p>Password: <span className="font-semibold text-white">{data.password}</span></p>
            <p>Login URL: https://pulse.digiget.org</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCredentials}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Copy size={16} /> Copy
            </button>
            <button
              onClick={copyCredentials}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              <Share2 size={16} /> Share via chat
            </button>
          </div>
          <p className="text-xs text-white/50">
            Encourage the staff member to change their password on first login. Their account is flagged to enforce this.
          </p>
        </div>
      </div>
    </div>
  )
}

export default StaffManagement

