'use client'

import { AuthProvider } from '@/lib/auth'
import type { AuthUser } from '@/lib/types'

export function Providers({
  user,
  children,
}: {
  user: AuthUser | null
  children: React.ReactNode
}) {
  return <AuthProvider initialUser={user}>{children}</AuthProvider>
}
