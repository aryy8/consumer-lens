'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { navForRole } from '@/lib/nav'
import type { AuthUser } from '@/lib/types'
import { AppSidebar } from './app-sidebar'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<string, string> = {
  inspector: 'Inspector',
  supervisor: 'Supervisor',
  admin: 'Administrator',
}

export function AppShell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
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
    setMenuOpen(false)
  }, [pathname])

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
    <div className="flex min-h-screen bg-muted/30 w-full max-w-full overflow-x-hidden">
      <AppSidebar collapsed={collapsed} toggleCollapsed={toggleCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col w-full max-w-full overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-5">
          <div className="flex items-center gap-3">
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
                    onClick={async () => {
                      await logout()
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

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5 pb-28 sm:pb-28 lg:p-8 lg:pb-8 w-full max-w-full overflow-x-hidden">{children}</main>

        {/* Mobile bottom navigation bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe-bottom lg:hidden shadow-lg">
          <ul className="flex h-16 items-center justify-around px-2">
            {items.slice(0, 5).map((item) => {
              const active =
                item.href === '/inspections'
                  ? pathname === '/inspections' || (pathname.startsWith('/inspections/') && pathname !== '/inspections/new')
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <li key={item.href} className="flex-1 px-1">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 py-1 text-center transition-all rounded-md',
                      active
                        ? 'bg-[#DBEAFE] text-[#2563EB]'
                        : 'text-[#64748B] hover:bg-[#DBEAFE]/30 hover:text-[#2563EB]',
                    )}
                  >
                    <Icon className="size-[20px]" strokeWidth={active ? 2.5 : 2} />
                    <span className="text-[10px] font-semibold leading-none tracking-tight">
                      {item.label === 'Product Repository'
                        ? 'Repository'
                        : item.label === 'New Inspection'
                        ? 'Scan'
                        : item.label.includes('Inspections')
                        ? 'Inspections'
                        : item.label}
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
