import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import PulseLogo from '../components/PulseLogo.jsx'

const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

const StaffPINLogin = () => {
  const { business, staff } = useParams()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState(null)
  const [locked, setLocked] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [ownerId, setOwnerId] = useState(null)
  const [staffInfo, setStaffInfo] = useState(null)
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    const resolveLink = async () => {
      setResolving(true)
      setError('')
      setInfoMessage('Resolving link...')
      setAttemptsRemaining(null)
      setLocked(false)
      setOwnerId(null)
      setStaffInfo(null)
      try {
        if (!business || !staff) {
          throw new Error('Invalid login link.')
        }

        const trimmedBusiness = business.trim()
        const trimmedStaff = staff.trim()
        const businessIsUuid = /^[0-9a-fA-F-]{32,36}$/.test(trimmedBusiness)

        let owner
        if (businessIsUuid) {
          const { data: ownerById, error: ownerIdError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'owner')
            .eq('id', trimmedBusiness)
            .maybeSingle()
          if (ownerIdError) throw ownerIdError
          owner = ownerById
        }

        if (!owner) {
          const { data: ownerByCode, error: ownerCodeError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'owner')
            .ilike('business_code', trimmedBusiness)
            .maybeSingle()
          if (ownerCodeError) throw ownerCodeError
          owner = ownerByCode
        }

        if (!owner) {
          throw new Error('Business not found.')
        }

        const { data: staffUser, error: staffError } = await supabase
          .from('users')
          .select('id, full_name, staff_code')
          .eq('owner_id', owner.id)
          .ilike('staff_code', trimmedStaff)
          .neq('role', 'owner')
          .maybeSingle()

        if (staffError || !staffUser) {
          throw new Error('Staff not found.')
        }

        setOwnerId(owner.id)
        setStaffInfo(staffUser)
        setInfoMessage(`Hello ${staffUser.full_name}. Enter your PIN to continue.`)
      } catch (err) {
        setError(err.message)
        setInfoMessage('')
      } finally {
        setResolving(false)
        setLoading(false)
      }
    }

    resolveLink()
  }, [business, staff])

  const maskedPin = useMemo(() => pin.padEnd(6, '•'), [pin])

  const handleKeyPress = (key) => {
    if (loading || locked || resolving) return
    setError('')
    if (key === 'clear') {
      setPin('')
      return
    }
    if (key === 'back') {
      setPin((prev) => prev.slice(0, -1))
      return
    }
    if (pin.length >= 6) return
    setPin((prev) => prev + key)
  }

  const handleVerify = async () => {
    if (pin.length < 4 || !ownerId || resolving) {
      setError('Enter your 6-digit PIN')
      return
    }
    setLoading(true)
    setError('')
    setInfoMessage('')

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_pin_login', {
        p_pin: pin,
        p_owner_id: ownerId,
      })

      if (rpcError) throw rpcError

      if (!data?.success) {
        setPin('')
        if (data?.locked) {
          setLocked(true)
          setError('PIN locked. Please contact your manager to reset.')
        } else {
          setAttemptsRemaining(data?.attempts_remaining ?? null)
          setError(data?.error || 'Invalid PIN. Try again.')
        }
        return
      }

      if (data?.session) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (setSessionError) {
          throw setSessionError
        }
      }

      if (data?.must_change_pin) {
        navigate('/change-pin', {
          replace: true,
          state: { message: 'You need to change your PIN before continuing.', initialPin: pin },
        })
        return
      }

      if (data?.pin_expired) {
        navigate('/change-pin', {
          replace: true,
          state: { message: 'Your PIN has expired. Please change it now.', initialPin: pin },
        })
        return
      }

      const redirectTo = data?.redirect_to || '/delivery'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to verify PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pin.length === 6 && !loading && !resolving) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f1a2b] to-[#13213a] flex flex-col items-center justify-center px-4 py-10 text-slate-100">
      <div className="w-full max-w-sm rounded-3xl bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/10">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="mt-6 text-center space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Staff Access
            </span>
          </div>
          <div className="flex justify-center">
            <PulseLogo size="default" variant="white" />
          </div>
          <p className="text-sm text-slate-300">
            Business code: {business ?? '—'} • Staff code: {staff ?? '—'}
          </p>
          {staffInfo && (
            <p className="text-xs text-slate-400">Staff: {staffInfo.full_name}</p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 py-6 text-center">
          <span className="text-xs uppercase tracking-[0.6em] text-slate-400">PIN</span>
          <p className="mt-2 text-4xl font-semibold tracking-[0.5em] text-white">{maskedPin}</p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle size={18} />
            <div>
              <p>{error}</p>
              {attemptsRemaining != null && !locked && (
                <p className="mt-1 text-red-300/80 text-xs">
                  Attempts remaining: {attemptsRemaining}
                </p>
              )}
            </div>
          </div>
        )}
        {infoMessage && !error && (
          <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
            {infoMessage}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {PIN_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              className={`h-16 rounded-2xl border border-white/10 bg-white/10 text-lg font-semibold text-white shadow-inner transition active:scale-95 hover:border-primary/60 hover:bg-primary/20 ${
                loading || locked || resolving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading || locked || resolving}
            >
              {key === 'clear' ? 'Clear' : key === 'back' ? '⌫' : key}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || locked || resolving || pin.length < 4}
          className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {loading ? 'Verifying...' : 'Unlock'}
        </button>

        <p className="mt-6 text-center text-xs text-slate-400">
          Trouble logging in? Contact your office for a PIN reset.
        </p>
      </div>
    </div>
  )
}

export default StaffPINLogin
