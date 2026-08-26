'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScanSearch } from 'lucide-react'
import { navForRole } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  if (!user) return null
  const items = navForRole(user.role)

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ScanSearch className="size-5" strokeWidth={2.25} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-white">Consumer Lens</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
            Legal Metrology
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
          Enforcement
        </p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md border-l-2 py-2 pl-3 pr-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-sidebar-accent text-white'
                      : 'border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white',
                  )}
                >
                  <Icon
                    className={cn('size-[18px] shrink-0', active ? 'text-primary' : 'text-sidebar-foreground/60')}
                    strokeWidth={2}
                  />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
          Ministry of Consumer Affairs
          <br />
          Govt. of India
        </p>
      </div>
    </aside>
  )
}
