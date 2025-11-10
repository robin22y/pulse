import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Building2, User, AtSign } from 'lucide-react'
import { supabase } from '../utils/supabaseClient.js'
import PulseLogo from '../components/PulseLogo.jsx'

const Signup = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedUsername = username.trim().toLowerCase()

    if (!trimmedName || !trimmedEmail || !trimmedUsername) {
      setError('Let’s fill every field 🤔')
      return
    }

    if (!trimmedEmail.includes('@')) {
      setError('Need a valid email for magic ✉️')
      return
    }

    if (password.length < 6) {
      setError('Password needs 6+ characters 💪')
      return
    }

    setSubmitting(true)
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            username: trimmedUsername,
            company_name: company.trim(),
          },
        },
      })

      if (signUpError) throw signUpError
      if (!signUpData?.user?.id) throw new Error('Signup did a disappearing act 😅')

      const ownerId = signUpData.user.id
      const { error: insertError } = await supabase.from('users').insert({
        id: ownerId,
        owner_id: ownerId,
        full_name: trimmedName,
        username: trimmedUsername,
        role: 'owner',
        must_change_password: false,
        is_active: true,
      })

      if (insertError) throw insertError

      setSuccess('Account created! Check email & jump in 🎉')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err) {
      console.error('Signup failed', err)
      setError(err.message ?? 'Signup hit a snag 😅')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <motion.div
        className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ scale: 1.1, opacity: 0.6 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
      />
      <motion.div
        className="absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl"
        initial={{ scale: 0.9, opacity: 0.3 }}
        animate={{ scale: 1.2, opacity: 0.6 }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-xl"
        >
          <div className="text-center">
            <PulseLogo size="large" />
            <p className="mt-4 text-sm text-gray-600">Create your Pulse HQ. Launch in minutes 🚀</p>
          </div>

          <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 16 }}
          className="mt-8 rounded-3xl border border-white/40 bg-white/90 p-8 shadow-2xl backdrop-blur"
        >
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Let’s spin up your hub 💼</h2>
            <p className="mt-2 text-sm text-gray-500">We’ll email you a confirmation link. Password is ready to use now.</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-4 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-600"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Full name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Asha Rao"
                  required
                />
              </div>
            </label>
            <label className="text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Company</span>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Pulse Logistics"
                />
              </div>
            </label>
          </div>

          <label className="text-sm mt-3 block">
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Work email</span>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="you@company.com"
                required
              />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <label className="text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="team.owner"
                required
                minLength={3}
              />
              <p className="mt-1 text-xs text-gray-500">You’ll also sign in with {username ? `${username}@pulse.internal` : 'username@pulse.internal'}</p>
            </label>
            <label className="text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Choose a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Spinning up your HQ…⚡
              </span>
            ) : (
              'Create account'
            )}
          </motion.button>

          <p className="mt-6 text-center text-xs text-gray-500">
            Already have a Pulse HQ?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </motion.form>
        </motion.div>
      </div>
    </div>
  )
}

export default Signup
