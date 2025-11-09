import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PulseLogo from '../PulseLogo.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { resolveLandingRoute } from '../../utils/navigation.js'

const PageHeader = ({ title, description, actions }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, logout } = useAuth()

  const goToDashboard = useCallback(() => {
    const destination = resolveLandingRoute(profile?.role)
    if (location.pathname !== destination) {
      navigate(destination)
    }
  }, [location.pathname, navigate, profile?.role])

  const handleSignOut = useCallback(async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to sign out', error)
    }
  }, [logout, navigate])

  return (
    <div className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToDashboard}
            className="group inline-flex items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-white/5 active:scale-95"
          >
            <PulseLogo size="small" variant="white" />
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-slate-300 group-hover:text-white sm:inline">
              Go to Dashboard
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToDashboard}
              className="inline-flex items-center rounded-full border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center rounded-full bg-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-red-600 active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
        {(title || description || actions) && (
          <div className="flex flex-col gap-2 text-white">
            {title ? <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1> : null}
            {description ? <p className="text-sm text-white/70">{description}</p> : null}
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
