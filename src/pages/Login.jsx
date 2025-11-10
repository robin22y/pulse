import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { resolveLandingRoute } from '../utils/navigation.js'
import PulseLogo from '../components/PulseLogo.jsx'
import { supabase } from '../utils/supabaseClient.js'

const rememberKey = 'pulse-login-remember'
const usernameKey = 'pulse-login-username'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, loading: authLoading, loginWithPassword, mustChangePassword } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const savedRemember = localStorage.getItem(rememberKey)
    const savedUser = localStorage.getItem(usernameKey)
    if (savedRemember === 'true' && savedUser) {
      setUsername(savedUser)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (mustChangePassword) {
      navigate('/change-password', { replace: true })
      return
    }

    if (role) {
      const target = resolveLandingRoute(role)
      if (location.pathname !== target) {
        navigate(target, { replace: true })
      }
    }
  }, [role, authLoading, mustChangePassword, navigate, location.pathname])

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')

    const identifier = username.trim()
    if (!identifier) {
      setError('Enter your username or email')
      return
    }

    const isEmail = identifier.includes('@')
    const normalized = identifier.toLowerCase()

    setSubmitting(true)
    try {
      const { user } = await loginWithPassword({ username: normalized, password, isEmail })
      if (!user?.id) {
        throw new Error('Authentication failed')
      }

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role, must_change_password')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      if (rememberMe) {
        localStorage.setItem(rememberKey, 'true')
        localStorage.setItem(usernameKey, normalized)
      } else {
        localStorage.removeItem(rememberKey)
        localStorage.removeItem(usernameKey)
      }

      if (userRecord?.must_change_password) {
        navigate('/change-password', { replace: true })
        return
      }

      const target = resolveLandingRoute(userRecord?.role)
      navigate(target, { replace: true })
    } catch (err) {
      console.error('Login failed', err)
      setError('Invalid username/email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <motion.div
        className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-200 opacity-60 blur-3xl"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ scale: 1.1, opacity: 0.6 }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse' }}
      />
      <motion.div
        className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-purple-200 opacity-60 blur-3xl"
        initial={{ scale: 0.9, opacity: 0.3 }}
        animate={{ scale: 1.2, opacity: 0.6 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="text-center">
            <PulseLogo size="large" />
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-4 text-sm text-gray-600"
            >
              Secure access to Pulse by DigiGet. Use your assigned username or email with your password.
            </motion.p>
          </div>

          <motion.form
            onSubmit={handleLogin}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6, type: 'spring', stiffness: 120, damping: 18 }}
            className="mt-10 rounded-3xl border border-white/40 bg-white/90 p-8 shadow-2xl backdrop-blur"
          >
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back! 👋</h2>
              <p className="mt-2 text-sm text-gray-500">You’re one step away from keeping operations in rhythm.</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-6 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-600"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Username or Email</label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="raj or owner@pulse.internal"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Password</label>
                <div className="relative">
                  <motion.input
                    whileFocus={{ scale: 1.01 }}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="••••••"
                    autoComplete="current-password"
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
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Keep me logged in
              </label>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </span>
                ) : (
                  'Login'
                )}
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 transition group-hover:opacity-100" />
              </motion.button>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">Forgot password? Contact your manager.</p>
            <p className="mt-3 text-center text-xs text-gray-500">
              New to Pulse?{' '}
              <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-500">
                Create your owner account
              </Link>
            </p>
          </motion.form>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
