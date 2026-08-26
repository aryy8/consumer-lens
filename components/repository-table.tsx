'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Panel } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { SearchInput, FilterSelect } from '@/components/toolbar'
import { CATEGORIES } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { ProductRecord } from '@/lib/types'

export function RepositoryTable({ products }: { products: ProductRecord[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [open, setOpen] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.manufacturer.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || p.category === category
      return matchesQuery && matchesCategory
    })
  }, [products, query, category])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products or manufacturers…" className="sm:max-w-xs" />
        <FilterSelect
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
        />
        <span className="text-sm text-muted-foreground sm:ml-auto">{filtered.length} products</span>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Last inspected</th>
                <th className="px-5 py-3 font-medium">Latest score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const isOpen = open === p.id
                return (
                  <Fragment key={p.id}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : p.id)}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.manufacturer}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{p.category}</td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">{p.lastInspection}</td>
                      <td className="px-5 py-3"><ScoreBadge score={p.score} /></td>
                      <td className="whitespace-nowrap px-5 py-3"><StatusTag status={p.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <ChevronDown className={cn('ml-auto size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${p.id}-history`} className="bg-muted/30">
                        <td colSpan={6} className="px-5 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspection history</p>
                          <ol className="space-y-2">
                            {p.history.map((h, i) => (
                              <li key={i} className="flex items-center gap-4 rounded-md border border-border bg-card px-3 py-2">
                                <span className="w-24 shrink-0 tabular-nums text-sm text-muted-foreground">{h.date}</span>
                                <ScoreBadge score={h.score} />
                                <StatusTag status={h.status} />
                                <span className="ml-auto text-sm text-muted-foreground">{h.inspector}</span>
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
