import { createContext, useContext, useState, useCallback } from 'react'

export type UserRole = 'patient' | 'doctor' | 'pediatrician' | 'pharmacist' | 'admin' | 'lab_technician'

export interface User {
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('ava_user')
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<User>
    return { name: parsed.name ?? '', email: parsed.email ?? '', role: parsed.role ?? 'patient' }
  })

  const login = useCallback((userData: User) => {
    localStorage.setItem('ava_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ava_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
