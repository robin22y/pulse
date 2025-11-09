import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import PulseLogo from '../components/PulseLogo.jsx'

const PIN_REGEX = /^\d{6}$/

const ChangePINPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialMessage = location.state?.message ?? ''
  const initialPin = location.state?.initialPin ?? ''

  const [oldPin, setOldPin] = useState(initialPin)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validate = () => {
    if (!PIN_REGEX.test(oldPin)) return 'Current PIN must be 6 digits'
    if (!PIN_REGEX.test(newPin)) return 'New PIN must be 6 digits'
    if (!PIN_REGEX.test(confirmPin)) return 'Confirm PIN must be 6 digits'
    if (newPin === oldPin) return 'New PIN must be different from current PIN'
    if (newPin !== confirmPin) return 'PINs do not match'
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('change_my_pin', {
        p_old_pin: oldPin,
        p_new_pin: newPin,
      })

      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Failed to change PIN')

      const staffUser = JSON.parse(localStorage.getItem('staff_user') || '{}')
      const role = staffUser.role
      if (role === 'delivery') {
        navigate('/delivery', { replace: true })
      } else if (role === 'office' || role === 'manager') {
        navigate('/staff', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Unable to change PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <PulseLogo size="default" variant="default" />
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Change PIN</h2>
          {initialMessage && <p className="text-orange-600 mt-2">{initialMessage}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={oldPin}
              onChange={(event) => setOldPin(event.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 text-center text-2xl tracking-widest"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">New PIN (6 digits)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 text-center text-2xl tracking-widest"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 text-center text-2xl tracking-widest"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {loading ? 'Changing PIN...' : 'Change PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChangePINPage
