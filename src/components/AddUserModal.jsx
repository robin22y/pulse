import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wand2, Copy, Smartphone } from 'lucide-react'

const roleOptions = [
  { label: 'Delivery', value: 'delivery' },
  { label: 'Office', value: 'office' },
  { label: 'Manager', value: 'manager' },
]

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const sanitizeUsername = (fullName) =>
  fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 20)

const AddUserModal = ({ open, onClose }) => {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState(roleOptions[0].value)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState(randomPassword())
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    if (!open) return
    setFullName('')
    setUsername('')
    setRole(roleOptions[0].value)
    setPhone('')
    setPassword(randomPassword())
    setShowCredentials(false)
  }, [open])

  const email = useMemo(() => (username ? `${username}@pulse.internal` : ''), [username])

  const handleGenerate = () => {
    setPassword(randomPassword())
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!fullName.trim() || !username.trim()) return
    setShowCredentials(true)
  }

  const copyCredentials = async () => {
    const message = `Pulse credentials\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}\nRole: ${role}`
    try {
      await navigator.clipboard.writeText(message)
    } catch (error) {
      console.error('Clipboard copy failed', error)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Add teammate</h3>
              <p className="text-sm text-white/60">Generate credentials, then create them in Supabase auth.</p>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    const value = event.target.value
                    setFullName(value)
                    if (!showCredentials) {
                      setUsername(sanitizeUsername(value))
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Raj Malhotra"
                  required
                />
              </label>
              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="raj.malhotra"
                  minLength={3}
                  pattern="[a-z0-9._-]+"
                  required
                />
                <p className="mt-1 text-xs text-white/40">Becomes {username ? email : 'username@pulse.internal'}</p>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Role</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Phone (optional)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="+91 98765 43210"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <div className="flex items-center justify-between gap-2">
                <span>Temporary password</span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20"
                >
                  <Wand2 size={14} /> Generate
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-lg tracking-wide">
                {password}
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
            >
              Show credentials
            </button>
          </form>

          <AnimatePresence>
            {showCredentials && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 space-y-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-sm text-emerald-100"
              >
                <p className="text-white">
                  ✅ Credentials ready! Create this user inside Supabase Auth, then add matching entry in `users` table.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Username</p>
                    <p className="mt-1 text-base font-semibold text-white">{username}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Email</p>
                    <p className="mt-1 text-base font-semibold text-white break-all">{email}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Password</p>
                    <p className="mt-1 text-base font-semibold text-white">{password}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Phone</p>
                    <p className="mt-1 text-base font-semibold text-white">{phone || 'Optional'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    <Copy size={16} /> Copy to clipboard
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Pulse credentials for ${fullName}\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    <Smartphone size={16} /> Share via WhatsApp
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AddUserModal
