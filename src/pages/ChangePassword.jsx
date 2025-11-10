import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import PulseLogo from '../components/PulseLogo.jsx'
import { resolveLandingRoute } from '../utils/navigation.js'

const ChangePassword = () => {
  const navigate = useNavigate()
  const { profile, role, refreshProfile, loading: authLoading } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, profile, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Let’s try at least 6 characters 💪')
      return
    }

    if (newPassword === currentPassword && currentPassword) {
      setError('New password needs a fresh vibe 🔄')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Those passwords aren’t twins yet 😅')
      return
    }

    setLoading(true)
    try {
      if (currentPassword && profile?.username) {
        const email = `${profile.username}@pulse.internal`
        const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
        if (reauthError) {
          throw new Error('Current password feels off 🤔')
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      if (profile?.id) {
        const { error: flagError } = await supabase
          .from('users')
          .update({ must_change_password: false })
          .eq('id', profile.id)

        if (flagError) throw flagError
        await refreshProfile(profile.id)
      }

      setSuccess('Password locked in! 🔐')
      setTimeout(() => {
        const target = resolveLandingRoute(role ?? profile?.role)
        navigate(target, { replace: true })
      }, 1200)
    } catch (err) {
      console.error('Change password failed', err)
      setError(err.message ?? 'Something glitched. Try again 😅')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <motion.div
        className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ scale: 1.1, opacity: 0.6 }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse' }}
      />
      <motion.div
        className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl"
        initial={{ scale: 0.9, opacity: 0.3 }}
        animate={{ scale: 1.2, opacity: 0.6 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          <div className="text-center">
            <PulseLogo size="large" />
            <p className="mt-4 text-sm text-gray-600">Fresh password, fresh wins. Let’s lock this in 🔒</p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 16 }}
            className="mt-8 rounded-3xl border border-white/40 bg-white/90 p-8 shadow-2xl backdrop-blur"
          >
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-gray-900">New password time! 🔄</h2>
              <p className="mt-2 text-sm text-gray-500">Keep it unique. Keep it strong.</p>
            </div>

            {error && (
              <motion.div
                className="mb-4 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-600"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {success}
              </motion.div>
            )}

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Required if you know it"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Skip if this is your first login.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Your new secret"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="One more time"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Locking it in…
                  </span>
                ) : (
                  'Save password'
                )}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </div>
  )
}

export default ChangePassword
