import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { resolveLandingRoute } from '../utils/navigation.js'
import PulseLogo from '../components/PulseLogo.jsx'
import { supabase } from '../utils/supabaseClient.js'

const LoginPage = () => {
  const navigate = useNavigate()
  const { role, loading, loginWithPassword } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && role) {
      const target = resolveLandingRoute(role)
      navigate(target, { replace: true })
    }
  }, [role, loading, navigate])

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <PulseLogo size="large" />
          <p className="mt-4 text-sm text-gray-600">
            Secure access to Pulse by DigiGet. Use your assigned username or email with your password.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-10 rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your credentials to continue.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="raj or owner@pulse.internal"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••"
                autoComplete="current-password"
                required
              />
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">Forgot password? Contact your manager.</p>
        </form>
      </div>
    </div>
  )
}

export default LoginPage

