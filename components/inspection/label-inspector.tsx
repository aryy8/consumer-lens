'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DeclarationField, AnalysisField } from '@/lib/types'

type InspectorField = DeclarationField | (AnalysisField & { box?: { x: number; y: number; w: number; h: number } })

const BOX_TONE: Record<string, string> = {
  compliant: 'border-emerald-500/80 bg-emerald-500/15 text-emerald-900',
  violation: 'border-rose-500/90 bg-rose-500/20 text-rose-900',
  missing: 'border-amber-500/80 bg-amber-500/15 text-amber-900',
  misleading: 'border-purple-600/90 bg-purple-600/20 text-purple-900',
}

const BOX_TONE_ACTIVE: Record<string, string> = {
  compliant: 'border-emerald-500 bg-emerald-500/30 ring-2 ring-emerald-500/50 shadow-md',
  violation: 'border-rose-500 bg-rose-500/35 ring-2 ring-rose-500/50 shadow-md',
  missing: 'border-amber-500 bg-amber-500/30 ring-2 ring-amber-500/50 shadow-md',
  misleading: 'border-purple-600 bg-purple-600/35 ring-2 ring-purple-600/50 shadow-md',
}

const MARKER_TONE: Record<string, string> = {
  compliant: 'bg-emerald-600 text-white',
  violation: 'bg-rose-600 text-white',
  missing: 'bg-amber-600 text-white',
  misleading: 'bg-purple-700 text-white',
}

export function LabelInspector({
  image,
  fields,
  activeKey,
  onHover,
  scanning = false,
  className,
}: {
  image: string
  fields: InspectorField[]
  activeKey?: string | null
  onHover?: (key: string | null) => void
  scanning?: boolean
  className?: string
}) {
  const [internalHover, setInternalHover] = useState<string | null>(null)
  const currentActive = activeKey ?? internalHover

  // Filter fields that actually have visible bounding boxes (> 0 size)
  const visibleBoxFields = fields.filter(
    (f) => f.box && typeof f.box.w === 'number' && f.box.w > 0 && f.box.h > 0
  )

  const handleMouseEnter = (key: string) => {
    setInternalHover(key)
    onHover?.(key)
  }

  const handleMouseLeave = () => {
    setInternalHover(null)
    onHover?.(null)
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg border border-border bg-neutral-900/95 select-none flex items-center justify-center min-h-[380px] max-h-[520px]', className)}>
      {/* Label Image Container */}
      <div className="relative inline-block max-h-[500px] max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image || '/placeholder.svg'}
          alt="Scanned product label"
          className="max-h-[500px] w-auto max-w-full object-contain block mx-auto"
        />

        {/* Scanning animation overlay */}
        {scanning && (
          <div className="absolute inset-0 z-20 bg-navy/20 pointer-events-none">
            <div className="scan-line absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_16px_3px_var(--primary)] animate-pulse" />
          </div>
        )}

        {/* Bounding Boxes Layer */}
        {!scanning &&
          visibleBoxFields.map((f, idx) => {
            const active = currentActive === f.key
            const isMisleading = Boolean(f.misleadingFlags?.isMisleading)
            const toneKey = isMisleading ? 'misleading' : f.status
            const box = f.box!

            return (
              <button
                key={f.key}
                type="button"
                onMouseEnter={() => handleMouseEnter(f.key)}
                onMouseLeave={handleMouseLeave}
                onFocus={() => handleMouseEnter(f.key)}
                onBlur={handleMouseLeave}
                className={cn(
                  'group absolute rounded border-2 transition-all duration-200 cursor-pointer pointer-events-auto',
                  active ? BOX_TONE_ACTIVE[toneKey] : BOX_TONE[toneKey],
                  active ? 'z-30 scale-[1.01]' : 'z-10 hover:z-20'
                )}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                }}
                aria-label={`${f.label}: ${f.status}`}
              >
                {/* Numeric Pill Badge */}
                <span
                  className={cn(
                    'absolute -left-2 -top-2 flex size-5 items-center justify-center rounded-full text-[10px] font-bold shadow-md transition-transform',
                    MARKER_TONE[toneKey],
                    active ? 'scale-110' : ''
                  )}
                >
                  {idx + 1}
                </span>

                {/* Floating tooltip on hover */}
                {active && (
                  <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 z-40 whitespace-nowrap rounded bg-slate-900/95 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg pointer-events-none backdrop-blur-xs flex items-center gap-1">
                    <span>{f.label}</span>
                    <span className="opacity-75 font-mono text-[9px]">({f.rule})</span>
                  </div>
                )}
              </button>
            )
          })}
      </div>
    </div>
  )
}
