'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  ClipboardCheck,
  FileWarning,
  Gauge,
  ScanLine,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  COMPLIANCE_TREND,
  INSPECTIONS,
  INSPECTIONS_OVER_TIME,
  OFFICERS,
} from '@/lib/data'
import { Panel, PanelHeader, StatCard } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { Button } from '@/components/ui/button'

function RecentInspections({ items }: { items: typeof INSPECTIONS }) {
  return (
    <Panel>
      <PanelHeader
        title="Recent inspections"
        action={
          <Link href="/inspections" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        }
      />
      <ul className="divide-y divide-border">
        {items.slice(0, 6).map((insp) => (
          <li key={insp.id}>
            <Link
              href={`/inspections/${insp.id}`}
              className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="relative size-11 shrink-0 overflow-hidden rounded border border-border bg-muted">
                <Image src={insp.image || '/placeholder.svg'} alt="" fill className="object-cover" sizes="44px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{insp.productName}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {insp.id} · {insp.inspectorName} · {insp.date}
                </p>
              </div>
              <ScoreBadge score={insp.score} />
              <div className="hidden w-28 sm:block">
                <StatusTag status={insp.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  fontSize: 12,
  color: 'var(--foreground)',
}

export function DashboardView() {
  const { user } = useAuth()
  if (!user) return null

  const firstName = user.name.split(' ')[0]

  if (user.role === 'inspector') {
    const mine = INSPECTIONS.filter((i) => i.inspectorId === user.employeeId)
    const officer = OFFICERS.find((o) => o.id === user.employeeId)
    const compliant = mine.filter((i) => i.status === 'compliant').length
    const avg = mine.length ? Math.round(mine.reduce((a, i) => a + i.score, 0) / mine.length) : 0

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <p className="text-lg font-semibold text-foreground">{firstName} · {user.district}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan a new product label to verify its declarations against LMPC Rules 2011.
            </p>
          </div>
          <Button asChild className="h-10 shrink-0">
            <Link href="/new-inspection">
              <ScanLine className="size-4" /> New inspection
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Inspections this month" value={officer?.inspectionsThisMonth ?? mine.length} icon={ClipboardCheck} hint="Across your jurisdiction" />
          <StatCard label="Avg. compliance score" value={avg} icon={Gauge} tone={avg >= 85 ? 'success' : avg >= 60 ? 'warning' : 'danger'} hint="Weighted by declarations" />
          <StatCard label="Compliant products" value={`${compliant}/${mine.length}`} icon={TrendingUp} tone="success" hint="Passed all 9 checks" />
          <StatCard label="Violations found" value={officer?.violationsFound ?? 0} icon={FileWarning} tone="danger" hint="Cited this month" />
        </div>

        <RecentInspections items={mine} />
      </div>
    )
  }

  if (user.role === 'supervisor') {
    const team = OFFICERS.filter((o) => o.role === 'inspector')
    const totalInsp = team.reduce((a, o) => a + o.inspectionsThisMonth, 0)
    const totalViol = team.reduce((a, o) => a + o.violationsFound, 0)
    const teamAvg = Math.round(team.reduce((a, o) => a + o.avgScore, 0) / team.length)

    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Team inspections" value={totalInsp} icon={ClipboardCheck} hint={`${team.length} officers · ${user.district}`} />
          <StatCard label="Team avg. score" value={teamAvg} icon={Gauge} tone={teamAvg >= 85 ? 'success' : 'warning'} hint="This month" />
          <StatCard label="Violations cited" value={totalViol} icon={FileWarning} tone="danger" hint="Across the team" />
          <StatCard label="Active officers" value={`${team.filter((o) => o.active).length}/${team.length}`} icon={Users} tone="default" hint="On duty" />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Panel className="lg:col-span-3">
            <PanelHeader title="Inspections vs. violations" description="Last 6 months" />
            <div className="p-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={INSPECTIONS_OVER_TIME} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="inspections" name="Inspections" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="violations" name="Violations" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader title="Officer performance" description="Compliance score by officer" />
            <ul className="divide-y divide-border">
              {[...team].sort((a, b) => b.avgScore - a.avgScore).map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-8 items-center justify-center rounded bg-navy text-xs font-semibold text-white">
                    {o.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">{o.district} · {o.inspectionsThisMonth} inspections</p>
                  </div>
                  <ScoreBadge score={o.avgScore} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <RecentInspections items={INSPECTIONS} />
      </div>
    )
  }

  // admin
  const totalInsp = INSPECTIONS_OVER_TIME.reduce((a, m) => a + m.inspections, 0)
  const latestRate = COMPLIANCE_TREND[COMPLIANCE_TREND.length - 1].rate
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total inspections" value={totalInsp.toLocaleString()} icon={ClipboardCheck} hint="All jurisdictions · 6 mo" />
        <StatCard label="Compliance rate" value={`${latestRate}%`} icon={Gauge} tone="success" hint="+2 pts vs. last month" />
        <StatCard label="Registered officers" value={OFFICERS.filter((o) => o.role !== 'admin').length} icon={Users} hint="Across states" />
        <StatCard label="Open violations" value={152} icon={FileWarning} tone="danger" hint="Pending resolution" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="National compliance trend" description="Share of products passing all declarations" />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={COMPLIANCE_TREND}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis domain={[60, 90]} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={32} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="rate" name="Compliance %" stroke="var(--primary)" strokeWidth={2} fill="url(#rateFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Inspection volume"
            description="Monthly enforcement activity"
            action={
              <Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Analytics <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={INSPECTIONS_OVER_TIME}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="inspections" name="Inspections" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <RecentInspections items={INSPECTIONS} />
    </div>
  )
}
