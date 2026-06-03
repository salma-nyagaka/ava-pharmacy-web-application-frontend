import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { apiClient, extractAuthTokens, refreshAccessToken, saveTokens, clearTokens } from '../lib/apiClient'
import { cartService } from '../services/cartService'
import '../styles/components/SessionExpiredModal.css'

export type UserRole = 'patient' | 'customer' | 'doctor' | 'pediatrician' | 'pharmacist' | 'admin' | 'lab_partner' | 'lab_technician'

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
const SESSION_EXPIRED_NOTICE_KEY = 'ava_session_expired_notice'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(() => shouldRestoreSession())
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false)

  // Listen for token expiry dispatched by apiClient interceptor
  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      setShowSessionExpiredModal(true)
    }
    window.addEventListener('ava:session-expired', handleExpired)
    return () => window.removeEventListener('ava:session-expired', handleExpired)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === '1') {
      sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY)
      setShowSessionExpiredModal(true)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const expiresAt = getAccessTokenExpiryMs(localStorage.getItem('ava_access_token'))
    if (!expiresAt || expiresAt <= Date.now()) {
      clearStoredSession(true)
      setUser(null)
      setShowSessionExpiredModal(true)
      return
    }
    const timeoutId = window.setTimeout(() => {
      clearStoredSession(true)
      setUser(null)
      setShowSessionExpiredModal(true)
    }, expiresAt - Date.now())
    return () => window.clearTimeout(timeoutId)
  }, [user])

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
      setShowSessionExpiredModal(false)
      setUser(mapped)
      localStorage.setItem('ava_user', JSON.stringify(mapped))
      await cartService.mergeLocalCart()
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
    setShowSessionExpiredModal(false)
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
      {showSessionExpiredModal && (
        <div className="session-expired-modal__overlay" role="presentation">
          <div className="session-expired-modal" role="dialog" aria-modal="true" aria-labelledby="session-expired-title">
            <div className="session-expired-modal__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="session-expired-modal__eyebrow">Session expired</p>
            <h2 id="session-expired-title">Your session has expired</h2>
            <p className="session-expired-modal__message">Please log in again to continue using AVA Pharmacy.</p>
            <a className="session-expired-modal__button" href="/login" onClick={() => setShowSessionExpiredModal(false)}>
              Log in again
            </a>
          </div>
        </div>
      )}
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
  if (isAccessTokenExpired()) {
    clearStoredSession(true)
    return null
  }

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
  if (accessToken && isAccessTokenExpired()) {
    clearStoredSession(true)
    return false
  }
  return (!accessToken && !!refreshToken) || (!!accessToken && !getStoredUser())
}

function clearStoredSession(showNotice = false) {
  clearTokens()
  localStorage.removeItem('ava_user')
  if (showNotice) {
    sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, '1')
  }
}

function isAccessTokenExpired() {
  const expiresAt = getAccessTokenExpiryMs(localStorage.getItem('ava_access_token'))
  return !!expiresAt && expiresAt <= Date.now()
}

function getAccessTokenExpiryMs(token: string | null): number | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
