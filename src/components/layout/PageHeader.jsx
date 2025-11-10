import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PulseLogo from '../PulseLogo.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { resolveLandingRoute } from '../../utils/navigation.js'

const PageHeader = ({ title, description, actions }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, logout } = useAuth()

  const dashboardTarget = useMemo(() => resolveLandingRoute(profile?.role), [profile?.role])
  const isOnDashboard = location.pathname === dashboardTarget

  const handleNavigateDashboard = () => {
    if (!isOnDashboard && dashboardTarget) {
      navigate(dashboardTarget)
    }
  }

  const handleSignOut = useCallback(async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to sign out', error)
    }
  }, [logout, navigate])

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#050915] text-white shadow-lg">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <PulseLogo size="default" variant="white" />
            <button
              type="button"
              onClick={handleNavigateDashboard}
              className="group relative inline-flex items-center overflow-hidden rounded-full border border-white/30 px-6 py-2 text-xs font-semibold uppercase tracking-[0.5em] text-white/70 transition hover:text-white"
              disabled={isOnDashboard}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/30 to-pink-500/20 opacity-0 transition group-hover:opacity-100" />
              <span className="relative">Go to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateDashboard}
              className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isOnDashboard}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-lg shadow-rose-500/30 transition hover:shadow-rose-500/50 active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
        {(title || description || actions) && (
          <div className="mt-6 flex flex-col gap-3">
            {title ? <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1> : null}
            {description ? <p className="text-sm text-white/70 md:max-w-3xl">{description}</p> : null}
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
