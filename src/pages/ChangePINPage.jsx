import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import PulseLogo from '../components/PulseLogo.jsx'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ChangePINPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialMessage = location.state?.message ?? ''
  const initialPin = location.state?.initialPin ?? ''
  const locationUserId = location.state?.userId

  const [oldPin, setOldPin] = useState(initialPin)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (oldPin.length !== 6) {
      setError('Current PIN must be 6 digits')
      return
    }

    if (newPin.length !== 6) {
      setError('New PIN must be 6 digits')
      return
    }

    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match')
      return
    }

    if (oldPin === newPin) {
      setError('New PIN must be different from current PIN')
      return
    }

    setLoading(true)

    try {
      let staffUserId = locationUserId
      if (!staffUserId) {
        const storedUser = JSON.parse(localStorage.getItem('staff_user') || '{}')
        staffUserId = storedUser?.id
      }

      const { data, error: rpcError } = await supabase.rpc('change_my_pin', {
        p_old_pin: oldPin,
        p_new_pin: newPin,
        p_user_id: staffUserId ?? null,
      })

      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Failed to change PIN')

      setSuccess('PIN changed successfully! Redirecting…')

      const staffUser = JSON.parse(localStorage.getItem('staff_user') || '{}')
      const destination =
        staffUser.role === 'delivery'
          ? '/delivery'
          : staffUser.role === 'office' || staffUser.role === 'manager'
            ? '/staff'
            : '/dashboard'

      setTimeout(() => navigate(destination), 1500)
    } catch (err) {
      setError(err.message || 'Failed to change PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <PulseLogo size="default" variant="default" />
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Change Your PIN</h2>
          {initialMessage && (
            <div className="mt-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-orange-700 text-sm">{initialMessage}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-emerald-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Current PIN <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={oldPin}
              onChange={(event) => setOldPin(event.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              autoComplete="off"
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-center text-3xl tracking-[0.5em] font-bold transition-all"
              placeholder="••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Enter your current 6-digit PIN</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              New PIN <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              autoComplete="off"
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-center text-3xl tracking-[0.5em] font-bold transition-all"
              placeholder="••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Choose a new 6-digit PIN</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Confirm New PIN <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              autoComplete="off"
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-center text-3xl tracking-[0.5em] font-bold transition-all"
              placeholder="••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Re-enter your new PIN</p>
          </div>

          <button
            type="submit"
            disabled={loading || oldPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Changing PIN...
              </span>
            ) : (
              'Change PIN'
            )}
          </button>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Forgot your current PIN?{' '}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-blue-600 hover:underline font-medium"
              >
                Go back
              </button>{' '}
              and contact your manager
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
