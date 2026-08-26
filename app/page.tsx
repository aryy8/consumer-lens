'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScanSearch } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function IndexPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScanSearch className="size-4 animate-pulse text-primary" />
        Consumer Lens
      </div>
    </div>
  )
}
