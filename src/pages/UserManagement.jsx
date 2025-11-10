import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Table, Loader2, UserPlus, ShieldOff, KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import AddUserModal from '../components/AddUserModal.jsx'

const columnClasses = 'px-4 py-3 text-left text-sm text-white/70 uppercase tracking-[0.3em]'
const cellClasses = 'px-4 py-4 text-sm text-white/80'

const UserManagement = () => {
  const { ownerId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const loadUsers = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, username, role, is_active, status, created_at, must_change_password')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message ?? 'Could not load teammates 😔')
    } else {
      setUsers(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [ownerId])

  const handleDeactivate = async (userId, active) => {
    const label = active ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Ready to ${label} this teammate?`)) return
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active: active })
      .eq('id', userId)
    if (updateError) {
      setActionMessage('Hmm, that update fizzled 😅')
    } else {
      setActionMessage(active ? 'Reactivated! Back in the game ⚡' : 'Deactivated. Rest up! 😴')
      loadUsers()
    }
  }

  const handleResetPassword = async (user) => {
    setActionMessage(
      `Ping your admin to generate a fresh password for ${user.full_name}. Remember: username@pulse.internal`,
    )
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this teammate? This cannot be undone.')) return
    const { error: deleteError } = await supabase.from('users').delete().eq('id', userId)
    if (deleteError) {
      setActionMessage('Delete didn’t stick. Try again 😅')
    } else {
      setActionMessage('User removed. Onward! 🚀')
      loadUsers()
    }
  }

  const formattedUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        createdLabel: new Date(user.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
      })),
    [users],
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Squad roster</h1>
            <p className="text-sm text-white/60">All teammates linked to this business hub.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
          >
            <UserPlus size={16} /> Add user
          </button>
        </div>
        <p className="text-xs text-white/50">
          Tip: Create auth user in Supabase first, then mirror info in this roster.
        </p>
      </header>

      {error && (
        <div className="rounded-3xl border border-pink-400/50 bg-pink-500/10 p-4 text-sm text-pink-100">{error}</div>
      )}

      {actionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100"
        >
          {actionMessage}
        </motion.div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr className="bg-white/5 text-xs uppercase tracking-[0.35em] text-white/60">
              <th className={columnClasses}>Name</th>
              <th className={columnClasses}>Username</th>
              <th className={columnClasses}>Role</th>
              <th className={columnClasses}>Status</th>
              <th className={columnClasses}>Created</th>
              <th className={columnClasses}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-white/60">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Loading crew…
                </td>
              </tr>
            ) : formattedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-white/60">
                  Nothing here yet! Time to build your dream team 💪
                </td>
              </tr>
            ) : (
              formattedUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-white/5">
                  <td className={`${cellClasses} font-semibold text-white`}>{user.full_name}</td>
                  <td className={cellClasses}>{user.username}</td>
                  <td className={cellClasses}>{user.role}</td>
                  <td className={cellClasses}>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                        user.is_active ? 'bg-emerald-500/10 text-emerald-200' : 'bg-red-500/10 text-red-200'
                      }`}
                    >
                      {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {user.must_change_password && (
                      <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200">
                        needs reset
                      </span>
                    )}
                  </td>
                  <td className={cellClasses}>{user.createdLabel}</td>
                  <td className={`${cellClasses} space-x-2 text-xs`}>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(user.id, !user.is_active)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:bg-white/10"
                    >
                      <ShieldOff size={14} /> {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:bg-white/10"
                    >
                      <KeyRound size={14} /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-400/40 px-3 py-1 text-red-200 transition hover:bg-red-500/10"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddUserModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export default UserManagement
