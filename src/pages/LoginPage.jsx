import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoginForm from '../components/Auth/LoginForm.jsx'
import SignupForm from '../components/Auth/SignupForm.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { resolveLandingRoute } from '../utils/navigation.js'

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('login')
  const navigate = useNavigate()
  const location = useLocation()
  const { role, loading } = useAuth()

  useEffect(() => {
    if (role) {
      const target = location.state?.from?.pathname ?? resolveLandingRoute(role)
      navigate(target, { replace: true })
    }
  }, [role, navigate, location.state])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f4faff] via-white to-[#e6f2ff] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="mb-2 text-5xl font-light text-gray-800">FieldFlow</h1>
          <p className="mx-auto max-w-sm leading-relaxed text-gray-600">
            Seamless consignment tracking inspired by clean Windows Phone aesthetics
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('login')}
            className={`rounded-lg py-3 font-medium transition ${
              activeTab === 'login'
                ? 'bg-white text-blue-600 shadow-md'
                : 'bg-white/60 text-gray-600 hover:bg-white/80'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`rounded-lg py-3 font-medium transition ${
              activeTab === 'signup'
                ? 'bg-white text-blue-600 shadow-md'
                : 'bg-white/60 text-gray-600 hover:bg-white/80'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="animate-fade-in">
          {activeTab === 'login' && <LoginForm />}
          {activeTab === 'signup' && <SignupForm onSuccess={() => setActiveTab('login')} />}
        </div>

        {loading && (
          <p className="mt-4 text-center text-xs text-gray-500">Checking your session...</p>
        )}
      </div>
    </div>
  )
}

export default LoginPage

