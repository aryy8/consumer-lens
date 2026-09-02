'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, FileText, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { SearchInput, FilterSelect } from '@/components/toolbar'
import { generateInspectionPDF } from '@/lib/pdf-report'
import type { Inspection, ReportRecord } from '@/lib/types'

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

  async function handleDownloadPDF(r: ReportRecord) {
    try {
      const res = await fetch(`/api/inspections/${r.inspectionId}`)
      if (!res.ok) {
        alert('Inspection details not found.')
        return
      }
      const data = (await res.json()) as { inspection: Inspection | null }
      if (data.inspection) {
        await generateInspectionPDF(data.inspection)
      } else {
        alert('Inspection details not found.')
      }
    } catch {
      alert('Could not load this report.')
    }
  }

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
        {/* Mobile Cards List View */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="p-4 flex flex-col gap-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-slate">
                    <FileText className="size-3 text-muted-foreground" />
                    {r.id}
                  </span>
                  <p className="mt-1 font-semibold text-sm text-foreground">{r.product}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.inspector} · {r.date}
                  </p>
                </div>
                <div className="shrink-0">
                  <ScoreBadge score={r.score} />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-0.5">
                <StatusTag status={r.status} />
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleDownloadPDF(r)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    title="Download PDF Report"
                  >
                    <FileDown className="size-3.5" /> PDF
                  </button>
                  <Link
                    href={`/inspections/${r.inspectionId}`}
                    className="text-xs font-semibold text-primary"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No reports found.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleDownloadPDF(r)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground md:opacity-0 transition-opacity md:group-hover:opacity-100 flex items-center gap-1 cursor-pointer"
                        title="Download PDF Report"
                      >
                        <FileDown className="size-3.5" /> PDF
                      </button>
                      <Link
                        href={`/inspections/${r.inspectionId}`}
                        className="text-xs font-medium text-primary md:opacity-0 transition-opacity md:group-hover:opacity-100"
                      >
                        Open
                      </Link>
                    </div>
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
