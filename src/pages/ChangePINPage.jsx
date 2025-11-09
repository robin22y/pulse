import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import { AlertCircle, CheckCircle2, Key, Lock, MessageCircle } from 'lucide-react'

const PIN_REGEX = /^\d{6}$/

const ChangePINPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialMessage = location.state?.message ?? ''
  const initialPin = location.state?.initialPin ?? ''
 
  const [currentPin, setCurrentPin] = useState(initialPin)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState(initialMessage ? '' : '')
  const [infoMessage, setInfoMessage] = useState(initialMessage)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = () => {
    if (!PIN_REGEX.test(currentPin)) return 'Current PIN must be 6 digits'
    if (!PIN_REGEX.test(newPin)) return 'New PIN must be 6 digits'
    if (!PIN_REGEX.test(confirmPin)) return 'Confirm PIN must be 6 digits'
    if (newPin === currentPin) return 'New PIN must be different from current PIN'
    if (newPin !== confirmPin) return 'New PIN and confirm PIN must match'
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfoMessage('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('change_my_pin', {
        p_old_pin: currentPin,
        p_new_pin: newPin,
      })

      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Unable to change PIN')

      setSuccess(true)
      setTimeout(() => navigate('/delivery', { replace: true }), 2000)
    } catch (err) {
      setError(err.message || 'Unable to change PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const whatsappMessage = encodeURIComponent(
    'Hi, I need help resetting my Pulse PIN. Please assist.',
  )

  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f1a2b] to-[#13213a] flex items-center justify-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2">
            <Key className="text-primary" size={20} />
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Change PIN
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Secure Your Access</h1>
          <p className="text-sm text-slate-300">
            Update your 6-digit PIN regularly to keep your account secure.
          </p>
        </div>

        {(error || infoMessage) && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${
              error
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-100'
            }`}
          >
            <div className="flex items-start gap-2">
              {error ? <AlertCircle size={18} /> : <Lock size={18} />}
              <p>{error || infoMessage}</p>
            </div>
          </div>
        )}

        {success ? (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">PIN changed successfully!</h2>
            <p className="text-sm text-slate-300">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Current PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-lg font-semibold tracking-[0.6em] text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                New PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-lg font-semibold tracking-[0.6em] text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Confirm New PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-lg font-semibold tracking-[0.6em] text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {loading ? 'Updating PIN...' : 'Update PIN'}
            </button>
          </form>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 text-sm text-slate-300">
          <p className="flex items-center gap-2">
            <MessageCircle size={16} className="text-primary" /> Forgot PIN? Contact the office.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/30"
          >
            <MessageCircle size={16} /> WhatsApp Office
          </a>
        </div>
      </div>
    </div>
  )
}

export default ChangePINPage
