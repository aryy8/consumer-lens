'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Role } from './types'

export interface AuthUser {
  employeeId: string
  name: string
  role: Role
  district: string
  state: string
}

interface Credential extends AuthUser {
  password: string
}

const CREDENTIALS: Credential[] = [
  { employeeId: 'INS001', password: 'demo', name: 'Rajesh Kumar', role: 'inspector', district: 'Pune', state: 'Maharashtra' },
  { employeeId: 'SUP001', password: 'demo', name: 'Vikram Menon', role: 'supervisor', district: 'Pune', state: 'Maharashtra' },
  { employeeId: 'ADM001', password: 'demo', name: 'Anjali Sharma', role: 'admin', district: 'New Delhi', state: 'Delhi' },
]

const STORAGE_KEY = 'consumer-lens-auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (employeeId: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [])

  const login: AuthContextValue['login'] = (employeeId, password) => {
    const match = CREDENTIALS.find(
      (c) => c.employeeId.toLowerCase() === employeeId.trim().toLowerCase() && c.password === password,
    )
    if (!match) return { ok: false, error: 'Invalid Employee ID or password.' }
    const { password: _pw, ...authUser } = match
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
    return { ok: true }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
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
