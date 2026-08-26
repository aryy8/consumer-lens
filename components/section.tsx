import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageIntro({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>{children}</div>
  )
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  tone?: 'default' | 'success' | 'danger' | 'warning'
}) {
  const toneMap = {
    default: 'bg-navy/5 text-navy',
    success: 'bg-success-muted text-success',
    danger: 'bg-danger-muted text-danger',
    warning: 'bg-warning-muted text-warning-foreground',
  }
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex size-8 items-center justify-center rounded-md', toneMap[tone])}>
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
