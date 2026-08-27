'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Panel } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { SearchInput, FilterSelect } from '@/components/toolbar'
import { CATEGORIES, DECLARATION_TEMPLATE } from '@/lib/data'
import { getSavedInspections } from '@/lib/storage'
import type { Inspection } from '@/lib/types'

export function InspectionsTable({ inspections }: { inspections: Inspection[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [savedInspections, setSavedInspections] = useState<Inspection[]>([])

  // Hydrate saved inspections from localStorage (client-side only)
  useEffect(() => {
    const saved = getSavedInspections()
    const asInspections: Inspection[] = saved.map((s) => ({
      id: s.id,
      productName: s.productName,
      manufacturer: s.manufacturer,
      category: s.category,
      score: s.score,
      status: s.status,
      date: s.date,
      state: s.state,
      batchNumber: s.batchNumber,
      inspectorId: 'SELF',
      inspectorName: s.inspectorName,
      image: s.image || '/placeholder.svg',
      fields: s.fields.map((f, idx) => ({
        ...f,
        box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
      })),
    }))
    setSavedInspections(asInspections)
  }, [])

  const allInspections = useMemo(
    () => [...savedInspections, ...inspections],
    [savedInspections, inspections]
  )

  const filtered = useMemo(() => {
    return allInspections.filter((i) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        i.productName.toLowerCase().includes(q) ||
        i.manufacturer.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      const matchesStatus = status === 'all' || i.status === status
      const matchesCategory = category === 'all' || i.category === category
      return matchesQuery && matchesStatus && matchesCategory
    })
  }, [allInspections, query, status, category])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by product, manufacturer or ID…"
          className="sm:max-w-xs"
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'compliant', label: 'Compliant' },
            { value: 'non-compliant', label: 'Non-Compliant' },
          ]}
        />
        <FilterSelect
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
        />
        <span className="text-sm text-muted-foreground sm:ml-auto">{filtered.length} results</span>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Inspector</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <tr key={i.id} className="group transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.image || '/placeholder.svg'} alt="" className="size-9 shrink-0 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{i.productName}</p>
                        <p className="truncate text-xs text-muted-foreground">{i.manufacturer}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{i.category}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{i.inspectorName}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">{i.date}</td>
                  <td className="px-5 py-3">
                    <ScoreBadge score={i.score} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <StatusTag status={i.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/inspections/${i.id}`}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      View <ChevronRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No inspections match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
