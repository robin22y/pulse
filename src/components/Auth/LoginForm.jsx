import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'

const LoginForm = ({ onSuccess }) => {
  const { loginWithPassword } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })
      onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="acrylic-card space-y-5 p-8">
      <div className="text-center">
        <h2 className="text-3xl font-light text-gray-800">Welcome Back</h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to manage consignments and deliveries
        </p>
      </div>

      {error && (
        <div className="animate-shake rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="input-group">
        <Mail className="input-icon" size={20} />
        <input
          type="email"
          required
          placeholder="Email address"
          value={formData.email}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, email: event.target.value }))
          }
          className="fluent-input"
        />
      </div>

      <div className="input-group">
        <Lock className="input-icon" size={20} />
        <input
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="Password"
          value={formData.password}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, password: event.target.value }))
          }
          className="fluent-input pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="fluent-button h-12 w-full text-lg font-medium"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}

export default LoginForm

