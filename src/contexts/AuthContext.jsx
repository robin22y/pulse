import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../utils/supabaseClient.js'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  loginWithPassword: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, role, owner_id, must_change_password')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile', error)
      return
    }

    setProfile(data)
  }, [])

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error retrieving session', error)
      } else {
        setSession(currentSession)
        if (currentSession?.user?.id) {
          await loadProfile(currentSession.user.id)
        }
      }
      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const loginWithPassword = useCallback(
    async ({ username, password, isEmail = false }) => {
      setLoading(true)
      const email = isEmail ? username : `${username.trim()}@pulse.internal`
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setLoading(false)
        throw error
      }

      setSession(data.session)
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
      return data
    },
    [loadProfile],
  )

  const logout = useCallback(async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (error) {
      throw error
    }
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      role: profile?.role,
      mustChangePassword: profile?.must_change_password ?? false,
      ownerId: profile?.owner_id ?? profile?.id ?? null,
      loginWithPassword,
      logout,
      refreshProfile: loadProfile,
    }),
    [session, profile, loading, loginWithPassword, logout, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

