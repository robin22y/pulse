import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import PulseLogo from '../components/PulseLogo.jsx'

const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const { profile, role, refreshProfile } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (currentPassword && profile?.username) {
        const email = `${profile.username}@pulse.internal`
        const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
        if (reauthError) {
          throw new Error('Current password is incorrect')
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

      setSuccess('Password updated successfully!')
      const destination = resolveAfterChange(role ?? profile?.role)
      setTimeout(() => navigate(destination, { replace: true }), 1200)
    } catch (err) {
      console.error('Failed to update password', err)
      setError(err.message ?? 'Unable to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <PulseLogo size="large" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Update Your Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Set a new password to continue using Pulse by DigiGet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-4 rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••"
                autoComplete="current-password"
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank if this is your first login.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="New password"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const resolveAfterChange = (role) => {
  switch (role) {
    case 'owner':
    case 'admin':
      return '/dashboard'
    case 'manager':
    case 'office':
      return '/staff'
    case 'delivery':
      return '/delivery'
    default:
      return '/'
  }
}

export default ChangePasswordPage
