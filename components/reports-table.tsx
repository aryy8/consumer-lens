'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { SearchInput, FilterSelect } from '@/components/toolbar'
import type { ReportRecord } from '@/lib/types'

export function ReportsTable({ reports }: { reports: ReportRecord[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q || r.product.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.inspector.toLowerCase().includes(q)
      const matchesStatus = status === 'all' || r.status === status
      return matchesQuery && matchesStatus
    })
  }, [reports, query, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search reports…" className="sm:max-w-xs" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'compliant', label: 'Compliant' },
            { value: 'non-compliant', label: 'Non-Compliant' },
          ]}
        />
        <Button variant="outline" className="gap-1.5 sm:ml-auto">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Report ID</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Inspector</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="group transition-colors hover:bg-muted/40">
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate">
                      <FileText className="size-3.5 text-muted-foreground" />
                      {r.id}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">{r.product}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{r.inspector}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">{r.date}</td>
                  <td className="px-5 py-3"><ScoreBadge score={r.score} /></td>
                  <td className="whitespace-nowrap px-5 py-3"><StatusTag status={r.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/inspections/${r.inspectionId}`}
                      className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
