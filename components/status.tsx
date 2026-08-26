import { cn } from '@/lib/utils'
import type { ComplianceStatus, Role, ViolationSeverity } from '@/lib/types'

const STATUS_META: Record<ComplianceStatus, { label: string; dot: string; text: string }> = {
  compliant: { label: 'Compliant', dot: 'bg-success', text: 'text-success' },
  'non-compliant': { label: 'Non-Compliant', dot: 'bg-danger', text: 'text-danger' },
  pending: { label: 'Pending', dot: 'bg-warning', text: 'text-warning-foreground' },
}

export function StatusTag({ status, className }: { status: ComplianceStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', meta.text, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}

/** Score badge: colored by range. >=85 green, 60-84 amber, <60 red */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 85
      ? 'bg-success-muted text-success'
      : score >= 60
        ? 'bg-warning-muted text-warning-foreground'
        : 'bg-danger-muted text-danger'
  return (
    <span
      className={cn(
        'inline-flex min-w-9 items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        tone,
        className,
      )}
    >
      {score}
    </span>
  )
}

const SEVERITY_META: Record<ViolationSeverity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-danger-muted text-danger' },
  major: { label: 'Major', className: 'bg-warning-muted text-warning-foreground' },
  minor: { label: 'Minor', className: 'bg-secondary text-slate' },
}

export function SeverityTag({ severity, className }: { severity: ViolationSeverity; className?: string }) {
  const meta = SEVERITY_META[severity]
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', meta.className, className)}>
      {meta.label}
    </span>
  )
}

/** Small monospace-style rule reference tag */
export function RuleTag({ rule, className }: { rule: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate',
        className,
      )}
    >
      {rule}
    </span>
  )
}

const ROLE_META: Record<Role, { label: string; className: string }> = {
  inspector: { label: 'Inspector', className: 'bg-secondary text-slate' },
  supervisor: { label: 'Supervisor', className: 'bg-warning-muted text-warning-foreground' },
  admin: { label: 'Admin', className: 'bg-navy/10 text-navy' },
}

export function RoleTag({ role, className }: { role: Role; className?: string }) {
  const meta = ROLE_META[role]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
