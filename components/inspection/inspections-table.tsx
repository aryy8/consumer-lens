'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, ChevronRight, Loader2, Trash2, X } from 'lucide-react'
import { Panel } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { SearchInput, FilterSelect } from '@/components/toolbar'
import { CATEGORIES } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Inspection } from '@/lib/types'

export function InspectionsTable({ inspections: initialInspections }: { inspections: Inspection[] }) {
  const router = useRouter()
  const [inspections, setInspections] = useState<Inspection[]>(initialInspections)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Inspection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setInspections(initialInspections)
  }, [initialInspections])

  const filtered = useMemo(() => {
    return inspections.filter((i) => {
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
  }, [inspections, query, status, category])

  async function handleDelete(target: Inspection) {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/inspections/${target.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setDeleteError(data.error ?? 'Failed to delete inspection.')
        return
      }
      setInspections((prev) => prev.filter((item) => item.id !== target.id))
      setDeleteTarget(null)
      router.refresh()
    } catch {
      setDeleteError('Network error. Could not delete inspection.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-[scaleIn_0.15s_ease-out]">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground">Delete inspection record?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.productName}</span> ({deleteTarget.id})? This will permanently remove the record and any generated reports.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:bg-danger/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" /> Delete record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {/* Mobile Cards List View */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
            >
              <Link
                href={`/inspections/${i.id}`}
                className="flex items-center gap-3 min-w-0 flex-1 pr-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image || '/placeholder.svg'} alt="" className="size-10 shrink-0 rounded object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{i.productName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {i.category} · {i.date}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <ScoreBadge score={i.score} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setDeleteTarget(i)
                  }}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                  title="Delete inspection"
                  aria-label="Delete inspection"
                >
                  <Trash2 className="size-4" />
                </button>
                <Link href={`/inspections/${i.id}`} className="text-muted-foreground">
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No inspections match your filters.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Inspector</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
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
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/inspections/${i.id}`}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:underline"
                      >
                        View <ChevronRight className="size-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(i)}
                        className="flex size-7 items-center justify-center rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                        title="Delete inspection"
                        aria-label="Delete inspection"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
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

