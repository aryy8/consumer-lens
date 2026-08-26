'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ScanSearch, ShieldCheck } from 'lucide-react'
import { DEMO_ROLES, useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  'Scan packaged product labels and auto-detect the 9 mandatory declarations',
  'Verify compliance against the Legal Metrology (Packaged Commodities) Rules, 2011',
  'Generate signed inspection reports with rule-level violation citations',
]

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [loading, user, router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = login(employeeId, password)
    if (!res.ok) {
      setError(res.error ?? 'Login failed.')
      setSubmitting(false)
      return
    }
    router.replace('/dashboard')
  }

  function quickFill(id: string, pw: string) {
    setEmployeeId(id)
    setPassword(pw)
    setError('')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScanSearch className="size-6" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-semibold tracking-tight text-white">Consumer Lens</span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/55">
              Legal Metrology Enforcement
            </span>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-pretty text-3xl font-semibold leading-tight tracking-tight text-white">
            Label compliance verification for field enforcement officers.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-3 text-sm leading-relaxed text-sidebar-foreground/80">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs leading-relaxed text-sidebar-foreground/50">
          Ministry of Consumer Affairs, Food &amp; Public Distribution · Government of India.
          Authorized personnel only. All activity is logged.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ScanSearch className="size-5" strokeWidth={2.25} />
              </div>
              <span className="text-lg font-semibold tracking-tight">Consumer Lens</span>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight">Officer sign in</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your official credentials to access the enforcement workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="employeeId" className="text-sm font-medium text-foreground">
                Employee ID
              </label>
              <input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. INS001"
                autoComplete="username"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="mt-1 h-10 w-full font-medium">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Demo access
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DEMO_ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => quickFill(r.employeeId, r.password)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5',
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">{r.label}</span>
                  <span className="text-[11px] text-muted-foreground">{r.blurb}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Select a role to auto-fill credentials, then press Sign in. Password for all demo accounts is
              <span className="font-medium text-foreground"> demo</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
