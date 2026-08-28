'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Menu, ScanSearch, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { navForRole } from '@/lib/nav'
import { AppSidebar } from './app-sidebar'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<string, string> = {
  inspector: 'Inspector',
  supervisor: 'Supervisor',
  admin: 'Administrator',
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const val = localStorage.getItem('sidebar-collapsed')
    if (val === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    const newVal = !collapsed
    setCollapsed(newVal)
    localStorage.setItem('sidebar-collapsed', String(newVal))
  }

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [pathname])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanSearch className="size-4 animate-pulse text-primary" />
          Loading workspace…
        </div>
      </div>
    )
  }

  const items = navForRole(user.role)
  const current = items.find((i) => {
    if (i.href === '/inspections') {
      return pathname === '/inspections' || (pathname.startsWith('/inspections/') && pathname !== '/inspections/new')
    }
    return pathname === i.href || pathname.startsWith(i.href + '/')
  })
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar collapsed={collapsed} toggleCollapsed={toggleCollapsed} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ScanSearch className="size-5" strokeWidth={2.25} />
                </div>
                <span className="text-sm font-semibold text-white">Consumer Lens</span>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-sidebar-foreground/70">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4">
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active =
                    item.href === '/inspections'
                      ? pathname === '/inspections' || (pathname.startsWith('/inspections/') && pathname !== '/inspections/new')
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md border-l-2 py-2 pl-3 text-sm font-medium',
                          active
                            ? 'border-primary bg-sidebar-accent text-white'
                            : 'border-transparent text-sidebar-foreground/75',
                        )}
                      >
                        <Icon className="size-[18px]" strokeWidth={2} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-5">
          <div className="flex items-center gap-3">
            <button
              className="text-slate lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {current?.label ?? 'Consumer Lens'}
            </h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-md border border-border py-1.5 pl-1.5 pr-2.5 text-left transition-colors hover:bg-muted"
            >
              <span className="flex size-8 items-center justify-center rounded bg-navy text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="hidden flex-col leading-none sm:flex">
                <span className="text-sm font-medium text-foreground">{user.name}</span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  {ROLE_LABEL[user.role]} · {user.employeeId}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-sm">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {user.district}, {user.state}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout()
                      router.replace('/login')
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-muted"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 pb-24 lg:p-8 lg:pb-8">{children}</main>

        {/* Mobile bottom navigation bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-safe-bottom lg:hidden shadow-lg">
          <ul className="flex h-16 items-center justify-around px-2">
            {items.slice(0, 5).map((item) => {
              const active =
                item.href === '/inspections'
                  ? pathname === '/inspections' || (pathname.startsWith('/inspections/') && pathname !== '/inspections/new')
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 py-1.5 text-center transition-colors',
                      active ? 'text-primary' : 'text-slate hover:text-primary',
                    )}
                  >
                    <Icon className="size-[20px]" strokeWidth={active ? 2.25 : 2} />
                    <span className="text-[10px] font-semibold leading-none tracking-tight">
                      {item.label === 'Product Repository' ? 'Repository' : item.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
