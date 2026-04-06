import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSession, saveSession, clearSession } from '../lib/session'
import { getMe, logout as apiLogout } from '../lib/api'
import { eventLogger } from '../utils/eventLogger'

type User = {
  id: string
  email: string
  phone?: string
  location?: string
  is_email_verified: boolean
  is_active: boolean
}

type AuthContextType = {
  session: string | null
  user: User | null
  loading: boolean
  loginSuccess: (token: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)


  const hydrateSession = useCallback(async (token: string): Promise<boolean> => {
    try {
      const data = await getMe(token)
      if (!data?.user) throw new Error('Invalid user response')
      setSession(token)
      setUser(data.user)
      eventLogger.setToken(token)
      return true
    } catch {
      await clearSession()
      setSession(null)
      setUser(null)
      return false
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const stored = await getSession()
        if (stored) {
          await hydrateSession(stored)
        }
      } catch {
        await clearSession()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loginSuccess = async (token: string): Promise<void> => {
    await saveSession(token)
    const ok = await hydrateSession(token)
    if (!ok) throw new Error('Login failed — could not verify session')
  }

  const logout = async (): Promise<void> => {
    if (session) {
      try {
        await apiLogout(session)
      } catch {
        // best effort — still clear locally
      }
    }
    await clearSession()
    setSession(null)
    setUser(null)
    eventLogger.setToken(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, loginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}