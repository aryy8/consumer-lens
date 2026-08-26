'use client'

import { useState } from 'react'
import { Download, MapPin, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { LabelInspector } from '@/components/inspection/label-inspector'
import { FieldList } from '@/components/inspection/field-list'
import type { Inspection } from '@/lib/types'

export function InspectionDetail({ inspection }: { inspection: Inspection }) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const violations = inspection.fields.filter((f) => f.status !== 'compliant')

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
                {violations.length === 0 ? 'All declarations present' : `${violations.length} issue${violations.length > 1 ? 's' : ''} detected`}
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Batch / lot</dt>
              <dd className="font-medium tabular-nums text-foreground">{inspection.batchNumber}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-muted-foreground"><User className="size-3.5" /> Inspector</dt>
              <dd className="font-medium text-foreground">{inspection.inspectorName}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5" /> State</dt>
              <dd className="font-medium text-foreground">{inspection.state}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium tabular-nums text-foreground">{inspection.date}</dd>
            </div>
          </dl>
          <Button variant="outline" className="mt-4 w-full gap-1.5">
            <Download className="size-4" /> Export PDF report
          </Button>
        </Panel>
      </div>

      <div className="lg:col-span-3">
        <Panel>
          <PanelHeader
            title="Declaration analysis"
            description="9 mandatory declarations under LMPC Rules, 2011 — hover a field to locate it on the label"
          />
          <FieldList fields={inspection.fields} activeKey={activeKey} onHover={setActiveKey} />
        </Panel>
      </div>
    </div>
  )
}
