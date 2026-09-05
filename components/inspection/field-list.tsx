'use client'

import { CheckCircle2, CircleAlert, CircleX, ShieldAlert, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RuleTag, SeverityTag } from '@/components/status'
import type { DeclarationField } from '@/lib/types'

const ICON: Record<DeclarationField['status'], { icon: typeof CheckCircle2; tone: string }> = {
  compliant: { icon: CheckCircle2, tone: 'text-success' },
  violation: { icon: CircleAlert, tone: 'text-warning' },
  missing: { icon: CircleX, tone: 'text-danger' },
}

export function FieldList({
  fields,
  activeKey,
  onHover,
}: {
  fields: DeclarationField[]
  activeKey?: string | null
  onHover?: (key: string | null) => void
}) {
  return (
    <ul className="divide-y divide-border">
      {fields.map((f, idx) => {
        const meta = ICON[f.status]
        const Icon = meta.icon
        const active = activeKey === f.key
        const isMisleading = Boolean(f.misleadingFlags?.isMisleading)

        return (
          <li
            key={f.key}
            onMouseEnter={() => onHover?.(f.key)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              'flex gap-3 px-5 py-3.5 transition-colors',
              active ? 'bg-muted' : 'hover:bg-muted/50',
            )}
          >
            <span className="relative mt-0.5 shrink-0">
              <span className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-background text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                {idx + 1}
              </span>
            </span>
            <Icon className={cn('mt-0.5 size-[18px] shrink-0', meta.tone)} strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{f.label}</p>
                <RuleTag rule={f.rule} />
                {f.severity && <SeverityTag severity={f.severity} />}
                {isMisleading && (
                  <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    <ShieldAlert className="size-3" /> Misleading
                  </span>
                )}
                {f.fontSizeCompliance && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                      f.fontSizeCompliance.status === 'compliant'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-900 font-semibold'
                    )}
                    title={f.fontSizeCompliance.assessment}
                  >
                    <Type className="size-3" />
                    {f.fontSizeCompliance.status === 'compliant' ? 'Font OK' : 'Font Warning'}
                    {f.fontSizeCompliance.isBold && ' · Bold'}
                  </span>
                )}
              </div>
              <p className={cn('mt-1 text-sm', f.extracted ? 'text-slate' : 'italic text-muted-foreground')}>
                {f.extracted ? `“${f.extracted}”` : 'Not detected on label'}
              </p>

              {f.fontSizeCompliance?.assessment && f.fontSizeCompliance.status !== 'compliant' && (
                <p className="mt-1 text-xs text-amber-800 font-medium bg-amber-50 rounded p-1.5 border border-amber-200/60">
                  📏 Font Rule: {f.fontSizeCompliance.assessment}
                </p>
              )}

              {isMisleading && f.misleadingFlags?.reason && (
                <p className="mt-1 text-xs text-purple-950 font-medium bg-purple-50 rounded p-1.5 border border-purple-200">
                  ⚠️ Misleading Claim: {f.misleadingFlags.reason}
                </p>
              )}

              {f.explanation && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.explanation}</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

