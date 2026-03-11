import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { apiClient, extractAuthTokens, refreshAccessToken, saveTokens, clearTokens } from '../lib/apiClient'

export type UserRole = 'patient' | 'doctor' | 'pediatrician' | 'pharmacist' | 'admin' | 'lab_technician'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  phone?: string
  labPartnerId?: string
  labPartnerName?: string
  labTechId?: string
}

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(() => shouldRestoreSession())

  // Listen for token expiry dispatched by apiClient interceptor
  useEffect(() => {
    const handleExpired = () => setUser(null)
    window.addEventListener('ava:session-expired', handleExpired)
    return () => window.removeEventListener('ava:session-expired', handleExpired)
  }, [])

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const accessToken = localStorage.getItem('ava_access_token')
      const refreshToken = localStorage.getItem('ava_refresh_token')
      const storedUser = getStoredUser()
      const needsAccessToken = !accessToken && !!refreshToken
      const needsUserHydration = (!!accessToken || needsAccessToken) && !storedUser

      if (!needsAccessToken && !needsUserHydration) {
        if (isMounted) setIsLoading(false)
        return
      }

      if (isMounted) setIsLoading(true)

      try {
        let nextAccessToken = accessToken
        if (!nextAccessToken && refreshToken) {
          nextAccessToken = await refreshAccessToken(refreshToken)
        }

        if (!storedUser && nextAccessToken) {
          const res = await apiClient.get('/auth/me/')
          const data = res.data?.data ?? res.data
          const mapped = mapApiUser(data)
          localStorage.setItem('ava_user', JSON.stringify(mapped))
          if (isMounted) setUser(mapped)
        }
      } catch {
        // clearSession() dispatches ava:session-expired which sets user to null
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true)
    try {
      const res = await apiClient.post('/auth/login/', { email, password })
      const data = res.data?.data ?? res.data
      const { access, refresh } = extractAuthTokens(data)
      saveTokens(access, refresh)
      const mapped = mapApiUser(data.user ?? data)
      setUser(mapped)
      localStorage.setItem('ava_user', JSON.stringify(mapped))
      return mapped
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('ava_refresh_token')
    try {
      if (refresh) await apiClient.post('/auth/logout/', { refresh })
    } catch {}
    clearTokens()
    localStorage.removeItem('ava_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...updates } : (updates as User)
      localStorage.setItem('ava_user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function mapApiUser(data: Record<string, unknown>): User {
  return {
    id: data.id as number,
    name: (data.full_name ?? data.name ?? (data.email as string)?.split('@')[0] ?? '') as string,
    email: data.email as string,
    role: (data.role ?? 'patient') as UserRole,
    phone: data.phone as string | undefined,
  }
}

function getStoredUser(): User | null {
  const stored = localStorage.getItem('ava_user')
  if (!stored) return null

  try {
    return JSON.parse(stored) as User
  } catch {
    localStorage.removeItem('ava_user')
    return null
  }
}

function shouldRestoreSession() {
  const accessToken = localStorage.getItem('ava_access_token')
  const refreshToken = localStorage.getItem('ava_refresh_token')
  return (!accessToken && !!refreshToken) || (!!accessToken && !getStoredUser())
}
