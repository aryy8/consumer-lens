'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/section'
import { SearchInput, FilterSelect } from '@/components/toolbar'
import { RoleTag } from '@/components/status'
import { STATES } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Officer, Role } from '@/lib/types'

export function UserManagement({ officers }: { officers: Officer[] }) {
  const [rows, setRows] = useState(officers)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [addOpen, setAddOpen] = useState(false)

  const filtered = useMemo(() => {
    return rows.filter((o) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        o.name.toLowerCase().includes(q) ||
        o.employeeId.toLowerCase().includes(q) ||
        o.district.toLowerCase().includes(q)
      const matchesRole = role === 'all' || o.role === role
      return matchesQuery && matchesRole
    })
  }, [rows, query, role])

  async function toggleActive(id: string) {
    const target = rows.find((o) => o.id === id)
    if (!target) return
    const nextActive = !target.active
    setRows((prev) => prev.map((o) => (o.id === id ? { ...o, active: nextActive } : o)))
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      })
      if (!res.ok) {
        setRows((prev) => prev.map((o) => (o.id === id ? { ...o, active: target.active } : o)))
      }
    } catch {
      setRows((prev) => prev.map((o) => (o.id === id ? { ...o, active: target.active } : o)))
    }
  }

  function handleCreated(o: Officer) {
    setRows((prev) => [o, ...prev])
    setAddOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search officers…" className="sm:max-w-xs" />
        <FilterSelect
          value={role}
          onChange={setRole}
          options={[
            { value: 'all', label: 'All roles' },
            { value: 'inspector', label: 'Inspector' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 sm:ml-auto">
          <Plus className="size-4" /> Add Officer
        </Button>
      </div>

      <Panel className="overflow-hidden">
        {/* Mobile Cards List View */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="p-4 flex flex-col gap-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground">{o.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{o.employeeId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.district} · {o.state}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RoleTag role={o.role} />
                  <button
                    type="button"
                    aria-label={`Edit ${o.name}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-0.5">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                <button
                  type="button"
                  onClick={() => toggleActive(o.id)}
                  role="switch"
                  aria-checked={o.active}
                  aria-label={`Toggle ${o.name} active status`}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    o.active ? 'bg-success' : 'bg-muted-foreground/30',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block size-4 rounded-full bg-card shadow-sm transition-transform',
                      o.active ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No officers found.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Officer</th>
                <th className="px-5 py-3 font-medium">Employee ID</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">District</th>
                <th className="px-5 py-3 font-medium">State</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3 font-medium text-foreground">{o.name}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">{o.employeeId}</td>
                  <td className="px-5 py-3"><RoleTag role={o.role} /></td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{o.district}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{o.state}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(o.id)}
                      role="switch"
                      aria-checked={o.active}
                      aria-label={`Toggle ${o.name} active status`}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        o.active ? 'bg-success' : 'bg-muted-foreground/30',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block size-4 rounded-full bg-card shadow-sm transition-transform',
                          o.active ? 'translate-x-4' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Edit ${o.name}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {addOpen && <AddOfficerModal onClose={() => setAddOpen(false)} onCreated={handleCreated} />}
    </div>
  )
}

function AddOfficerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (o: Officer) => void
}) {
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('demo')
  const [role, setRole] = useState<Role>('inspector')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState(STATES[0])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !employeeId.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, employeeId, password, role, district, state }),
      })
      const data = (await res.json()) as { ok: boolean; officer?: Officer; error?: string }
      if (!res.ok || !data.ok || !data.officer) {
        setError(data.error ?? 'Failed to add officer.')
        setSubmitting(false)
        return
      }
      onCreated(data.officer)
    } catch {
      setError('Could not reach the server.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add officer"
        className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Add Officer</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Ravi Sharma" required />
          </Field>
          <Field label="Employee ID">
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls} placeholder="e.g. INS009" required />
          </Field>
          <Field label="Password">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="default: demo" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
                <option value="inspector">Inspector</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="State">
              <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="District">
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} placeholder="e.g. Pune" />
          </Field>
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Officer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}
