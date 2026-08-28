'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { AuthUser, Role } from './types'

type LoginResult = { ok: boolean; error?: string }

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (employeeId: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser)

  const login: AuthContextValue['login'] = useCallback(async (employeeId, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password }),
      })
      const data: { ok: boolean; user?: AuthUser; error?: string } = await res.json()
      if (!res.ok || !data.ok || !data.user) {
        return { ok: false, error: data.error ?? 'Login failed.' }
      }
      // Hard navigation so the server components re-run with the new session cookie.
      window.location.href = '/dashboard'
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not reach the server. Please try again.' }
    }
  }, [])

  const logout: AuthContextValue['logout'] = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const DEMO_ROLES: { role: Role; label: string; employeeId: string; password: string; blurb: string }[] = [
  { role: 'inspector', label: 'Inspector', employeeId: 'INS001', password: 'demo', blurb: 'Field officer' },
  { role: 'supervisor', label: 'Supervisor', employeeId: 'SUP001', password: 'demo', blurb: 'Jurisdiction lead' },
  { role: 'admin', label: 'Admin', employeeId: 'ADM001', password: 'demo', blurb: 'System-wide' },
]
