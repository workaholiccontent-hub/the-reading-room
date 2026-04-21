import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchMember(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchMember(session.user.id)
        else { setMember(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchMember(authUserId) {
  try {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    setMember(data ?? null)
  } catch (e) {
    setMember(null)
  } finally {
    setLoading(false)
  }
}

  async function signUp({ email, password, fullName, phone }) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  
  const { error: memberError } = await supabase.from('members').insert({
    auth_user_id: data.user.id,
    full_name: fullName,
    email,
    phone: phone || null,
    status: 'pending',
    role: 'member'
  })
  
  if (memberError) throw new Error('Account created but profile failed: ' + memberError.message)
  return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setMember(null)
  }

  const isAdmin = member?.role === 'admin'
  const isActive = member?.status === 'active'

  return (
    <AuthContext.Provider value={{
      user, member, loading,
      isAdmin, isActive,
      signUp, signIn, signOut,
      refreshMember: () => user && fetchMember(user.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
