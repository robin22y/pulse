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
  loginWithPin: async () => {},
  logout: async () => {},
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
      .select('*')
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

    // Temporarily disable auth state change listener while debugging signup hang
    // const { data: listener } = supabase.auth.onAuthStateChange(
    //   async (_event, newSession) => {
    //     setSession(newSession)
    //     if (newSession?.user?.id) {
    //       await loadProfile(newSession.user.id)
    //     } else {
    //       setProfile(null)
    //     }
    //   },
    // )

    return () => {
      // listener?.subscription?.unsubscribe()
    }
  }, [loadProfile])

  const loginWithPassword = useCallback(async ({ email, password }) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      throw error
    }

    setSession(data.session)
    if (data.session?.user?.id) {
      await loadProfile(data.session.user.id)
    }
    return data
  }, [loadProfile])

  const loginWithPin = useCallback(
    async ({ pin }) => {
      setLoading(true)
      const { data, error } = await supabase.rpc('login_with_pin', { pin_code: pin })
      if (error) {
        setLoading(false)
        throw error
      }

      // Expecting RPC to return { session, user, profile }
      if (data?.session) {
        const { session: rpcSession } = data
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: rpcSession.access_token,
          refresh_token: rpcSession.refresh_token,
        })
        if (setSessionError) {
          console.error('Failed to set session from PIN login', setSessionError)
        } else {
          setSession(rpcSession)
          await loadProfile(rpcSession.user.id)
        }
      } else if (data?.user?.id) {
        setSession((prev) => ({ ...prev, user: data.user }))
        setProfile(data.user)
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
      ownerId: profile?.owner_id ?? profile?.id ?? null,
      loginWithPassword,
      loginWithPin,
      logout,
    }),
    [session, profile, loading, loginWithPassword, loginWithPin, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

