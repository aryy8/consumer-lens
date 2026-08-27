import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  ScanLine,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from './types'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export function navForRole(role: Role): NavItem[] {
  const inspectionsLabel =
    role === 'inspector' ? 'My Inspections' : role === 'supervisor' ? 'Team Inspections' : 'All Inspections'

  const items: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'New Inspection', href: '/inspections/new', icon: ScanLine },
    { label: inspectionsLabel, href: '/inspections', icon: ClipboardList },
    { label: 'Product Repository', href: '/repository', icon: Package },
    { label: 'Reports', href: '/reports', icon: FileText },
  ]

  if (role === 'admin') {
    items.push(
      { label: 'User Management', href: '/users', icon: Users },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    )
  }

  return items
}
