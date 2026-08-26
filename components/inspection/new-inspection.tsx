'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  RotateCcw,
  ScanLine,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { LabelInspector } from '@/components/inspection/label-inspector'
import { FieldList } from '@/components/inspection/field-list'
import { CATEGORIES, INSPECTIONS } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Inspection } from '@/lib/types'

type Step = 'capture' | 'scanning' | 'result'

const SAMPLES = INSPECTIONS.slice(0, 6)

const STEPS: { id: Step; label: string }[] = [
  { id: 'capture', label: 'Capture Label' },
  { id: 'scanning', label: 'AI Analysis' },
  { id: 'result', label: 'Compliance Report' },
]

export function NewInspection() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('capture')
  const [selected, setSelected] = useState<Inspection>(SAMPLES[1])
  const [activeKey, setActiveKey] = useState<string | null>(null)

  function startScan() {
    setStep('scanning')
    setTimeout(() => setStep('result'), 2600)
  }

  function reset() {
    setActiveKey(null)
    setStep('capture')
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < stepIndex
          const current = i === stepIndex
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    done && 'bg-success text-success-foreground',
                    current && 'bg-primary text-primary-foreground',
                    !done && !current && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <CheckCircle2 className="size-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-sm font-medium sm:block',
                    current ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={cn('h-px flex-1', done ? 'bg-success' : 'bg-border')} />
              )}
            </li>
          )
        })}
      </ol>

      {step === 'capture' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Panel className="lg:col-span-3">
            <PanelHeader title="Capture or upload label" description="Position the principal display panel within the frame" />
            <div className="p-5">
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border bg-muted/40 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-navy/5 text-navy">
                  <Camera className="size-7" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Drag a label image here</p>
                  <p className="mt-1 text-xs text-muted-foreground">or use one of the demo samples on the right</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Upload className="size-4" /> Upload
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Camera className="size-4" /> Camera
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-foreground">Product category</span>
                  <select
                    defaultValue={selected.category}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-foreground">Batch / lot number</span>
                  <input
                    defaultValue={selected.batchNumber}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </label>
              </div>
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader title="Demo samples" description="Select a product to analyze" />
            <div className="grid max-h-[420px] gap-2 overflow-y-auto p-3">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className={cn(
                    'flex items-center gap-3 rounded-md border p-2 text-left transition-colors',
                    selected.id === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image || '/placeholder.svg'} alt="" className="size-12 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.productName}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.manufacturer}</p>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <div className="lg:col-span-5 flex justify-end">
            <Button onClick={startScan} className="gap-1.5">
              Run AI analysis <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 'scanning' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <LabelInspector image={selected.image} fields={selected.fields} scanning />
          </div>
          <Panel className="lg:col-span-3">
            <PanelHeader title="Analyzing declarations" description="Extracting mandatory fields under LMPC Rules, 2011" />
            <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ScanLine className="size-8 animate-pulse" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Running optical character recognition</p>
                <p className="mt-1 text-xs text-muted-foreground">Matching extracted text against 9 mandatory declarations</p>
              </div>
              <div className="h-1 w-56 overflow-hidden rounded-full bg-muted">
                <div className="scan-progress h-full bg-primary" />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {step === 'result' && (
        <ResultView
          inspection={selected}
          activeKey={activeKey}
          setActiveKey={setActiveKey}
          onReset={reset}
          onSave={() => router.push('/inspections')}
        />
      )}
    </div>
  )
}

function ResultView({
  inspection,
  activeKey,
  setActiveKey,
  onReset,
  onSave,
}: {
  inspection: Inspection
  activeKey: string | null
  setActiveKey: (k: string | null) => void
  onReset: () => void
  onSave: () => void
}) {
  const violations = inspection.fields.filter((f) => f.status !== 'compliant').length
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-4">
        <LabelInspector
          image={inspection.image}
          fields={inspection.fields}
          activeKey={activeKey}
          onHover={setActiveKey}
        />
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Compliance score</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{inspection.score}</span>
                <ScoreBadge score={inspection.score} />
              </div>
            </div>
            <div className="text-right">
              <StatusTag status={inspection.status} />
              <p className="mt-1 text-xs text-muted-foreground">
                {violations === 0 ? 'All declarations present' : `${violations} issue${violations > 1 ? 's' : ''} detected`}
              </p>
            </div>
          </div>
        </Panel>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} className="flex-1 gap-1.5">
            <RotateCcw className="size-4" /> Scan another
          </Button>
          <Button onClick={onSave} className="flex-1 gap-1.5">
            Save report <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="lg:col-span-3">
        <Panel>
          <PanelHeader
            title={inspection.productName}
            description={`${inspection.manufacturer} · Batch ${inspection.batchNumber}`}
          />
          <FieldList fields={inspection.fields} activeKey={activeKey} onHover={setActiveKey} />
        </Panel>
      </div>
    </div>
  )
}

export function BackLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  )
}
