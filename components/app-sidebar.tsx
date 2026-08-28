'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScanSearch, ChevronLeft, ChevronRight } from 'lucide-react'
import { navForRole } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  collapsed: boolean
  toggleCollapsed: () => void
}

export function AppSidebar({ collapsed, toggleCollapsed }: AppSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  if (!user) return null
  const items = navForRole(user.role)

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex transition-[width] duration-300 ease-in-out border-r border-sidebar-border',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      {/* Header with App Icon and Hover Collapse Button */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border px-4 overflow-hidden',
          collapsed ? 'justify-center' : 'gap-2.5'
        )}
      >
        <div className="group/logo relative size-8 shrink-0">
          {/* App Icon (Logo) */}
          <div className="flex size-8 items-center justify-center rounded-md bg-transparent overflow-hidden transition-opacity duration-200 group-hover/logo:opacity-0">
            <img src="/favicon.png" alt="Logo" className="size-full object-cover" />
          </div>
          {/* Collapse Button Overlay */}
          <button
            onClick={toggleCollapsed}
            className="absolute inset-0 flex size-8 items-center justify-center rounded-md bg-[#DBEAFE] border border-[#E2E8F0] text-[#2563EB] opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 cursor-pointer shadow-sm"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="flex flex-col leading-none transition-opacity duration-300">
            <span className="text-[15px] font-semibold tracking-tight text-[#12203c] whitespace-nowrap">
              Consumer Lens
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#64748B]/80 whitespace-nowrap">
              Legal Metrology
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]/60 transition-opacity duration-300">
            Enforcement
          </p>
        )}
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
                    'group flex items-center rounded-md py-2 px-3 transition-all duration-300 text-sm font-medium',
                    collapsed ? 'gap-0 justify-center' : 'gap-3',
                    active
                      ? 'bg-[#DBEAFE] text-[#2563EB]'
                      : 'text-[#64748B] hover:bg-[#DBEAFE]/50 hover:text-[#2563EB]',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn('size-[18px] shrink-0 transition-transform duration-300', active ? 'text-[#2563EB]' : 'text-[#64748B]/80')}
                    strokeWidth={2}
                  />
                  {!collapsed && (
                    <span className="truncate transition-opacity duration-300">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4 overflow-hidden">
        {!collapsed ? (
          <p className="text-[11px] leading-relaxed text-[#64748B]/70 whitespace-nowrap transition-opacity duration-300">
            Ministry of Consumer Affairs
            <br />
            Govt. of India
          </p>
        ) : (
          <p
            className="text-[10px] text-center font-bold text-[#64748B]/60 transition-all duration-300"
            title="Ministry of Consumer Affairs · Govt. of India"
          >
            MCA
          </p>
        )}
      </div>
    </aside>
  )
}
