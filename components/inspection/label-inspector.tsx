'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { DeclarationField } from '@/lib/types'

const BOX_TONE: Record<DeclarationField['status'], string> = {
  compliant: 'border-success/80 bg-success/10',
  violation: 'border-warning/90 bg-warning/15',
  missing: 'border-danger/80 bg-danger/10',
}

const BOX_TONE_ACTIVE: Record<DeclarationField['status'], string> = {
  compliant: 'border-success bg-success/25 ring-2 ring-success/40',
  violation: 'border-warning bg-warning/30 ring-2 ring-warning/40',
  missing: 'border-danger bg-danger/25 ring-2 ring-danger/40',
}

const MARKER_TONE: Record<DeclarationField['status'], string> = {
  compliant: 'bg-success text-success-foreground',
  violation: 'bg-warning text-warning-foreground',
  missing: 'bg-danger text-danger-foreground',
}

export function LabelInspector({
  image,
  fields,
  activeKey,
  onHover,
  scanning = false,
}: {
  image: string
  fields: DeclarationField[]
  activeKey?: string | null
  onHover?: (key: string | null) => void
  scanning?: boolean
}) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-muted">
      <Image src={image || '/placeholder.svg'} alt="Scanned product label" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 40vw" priority />

      {/* Scanning animation overlay */}
      {scanning && (
        <div className="absolute inset-0 z-20 bg-navy/10">
          <div className="scan-line absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_12px_2px_var(--primary)]" />
        </div>
      )}

      {/* Detection boxes */}
      {!scanning &&
        fields.map((f, idx) => {
          const active = activeKey === f.key
          return (
            <button
              key={f.key}
              type="button"
              onMouseEnter={() => onHover?.(f.key)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(f.key)}
              onBlur={() => onHover?.(null)}
              className={cn(
                'group absolute rounded border-2 transition-all duration-150',
                active ? BOX_TONE_ACTIVE[f.status] : BOX_TONE[f.status],
                active ? 'z-10' : 'z-0',
              )}
              style={{
                left: `${f.box.x}%`,
                top: `${f.box.y}%`,
                width: `${f.box.w}%`,
                height: `${f.box.h}%`,
              }}
              aria-label={`${f.label}: ${f.status}`}
            >
              <span
                className={cn(
                  'absolute -left-2 -top-2 flex size-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm',
                  MARKER_TONE[f.status],
                )}
              >
                {idx + 1}
              </span>
            </button>
          )
        })}
    </div>
  )
}
