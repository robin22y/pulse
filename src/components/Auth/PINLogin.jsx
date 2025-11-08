import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'

const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

const PINLogin = () => {
  const { loginWithPin } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const displayPin = useMemo(() => (pin ? pin.replace(/./g, '•') : '••••'), [pin])

  const updatePin = (key) => {
    if (key === 'clear') {
      setPin('')
      setError('')
      return
    }
    if (key === 'back') {
      setPin((prev) => prev.slice(0, -1))
      return
    }
    setPin((prev) => (prev.length >= 6 ? prev : prev + key))
  }

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginWithPin({ pin })
    } catch (err) {
      setError(err.message ?? 'PIN authentication failed.')
    } finally {
      setLoading(false)
      setPin('')
    }
  }

  return (
    <div className="acrylic-card space-y-6 p-8">
      <div className="text-center">
        <h2 className="text-3xl font-light text-gray-800">Staff PIN Access</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your 4-6 digit PIN to access delivery console
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 py-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-blue-500">PIN</p>
        <p className="mt-2 text-4xl font-semibold text-gray-800 tracking-[0.6em]">
          {displayPin}
        </p>
      </div>

      {error && (
        <div className="animate-shake rounded-xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {PIN_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => updatePin(key)}
            className="h-16 rounded-2xl border border-gray-200 bg-white text-lg font-semibold text-gray-700 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:text-blue-600 active:translate-y-0"
          >
            {key === 'clear' ? 'Clear' : key === 'back' ? '⌫' : key}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="fluent-button h-12 w-full text-lg font-medium"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Verifying...
          </div>
        ) : (
          'Unlock'
        )}
      </button>
    </div>
  )
}

export default PINLogin

