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
  PieChart,
  Pie,
  Cell,
  Line,
} from 'recharts'
import {
  ClipboardCheck,
  FileWarning,
  Gauge,
  ScanLine,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  COMPLIANCE_TREND,
  INSPECTIONS,
  INSPECTIONS_OVER_TIME,
  OFFICERS,
  COMMON_VIOLATIONS,
  STATE_VOLUME,
} from '@/lib/data'
import { Panel, PanelHeader } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IndiaMap } from '@/components/analytics/india-map'

function DashboardStatCard({
  label,
  value,
  trend,
}: {
  label: string
  value: string | number
  trend: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">{trend}</div>
    </div>
  )
}

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

  // INSPECTOR ROLE
  if (user.role === 'inspector') {
    const mine = INSPECTIONS.filter((i) => i.inspectorId === user.employeeId)
    const officer = OFFICERS.find((o) => o.id === user.employeeId)
    
    // Inspections today (using latest date '2026-08-26' as "today")
    const todayStr = '2026-08-26'
    const todayCount = mine.filter((i) => i.date === todayStr).length
    const thisMonthCount = officer?.inspectionsThisMonth ?? mine.length
    const violationsCount = officer?.violationsFound ?? mine.reduce((acc, i) => acc + i.fields.filter(f => f.status !== 'compliant').length, 0)
    const avgScore = mine.length ? Math.round(mine.reduce((a, i) => a + i.score, 0) / mine.length) : 0
    const compliantCount = mine.filter((i) => i.status === 'compliant').length
    const complianceRate = mine.length ? Math.round((compliantCount / mine.length) * 100) : 0

    // Dynamic Violation Breakdown (donut chart)
    let critical = 0
    let major = 0
    let minor = 0
    mine.forEach((i) => {
      i.fields.forEach((f) => {
        if (f.status !== 'compliant') {
          if (f.severity === 'critical') critical++
          else if (f.severity === 'major') major++
          else if (f.severity === 'minor') minor++
        }
      })
    })

    // If zero violations, mock some values so chart is visible/instructive
    const hasViolations = (critical + major + minor) > 0
    const breakdownData = [
      { name: 'Critical', value: hasViolations ? critical : 3, fill: 'oklch(0.627 0.194 29.18)' },
      { name: 'Major', value: hasViolations ? major : 8, fill: 'oklch(0.795 0.184 71.15)' },
      { name: 'Minor', value: hasViolations ? minor : 5, fill: 'oklch(0.439 0.049 255.43)' },
    ]

    // Ranked list of most common violations
    const violationRules: Record<string, { label: string; count: number }> = {}
    mine.forEach((i) => {
      i.fields.forEach((f) => {
        if (f.status !== 'compliant') {
          const key = f.rule
          if (!violationRules[key]) {
            violationRules[key] = { label: f.label, count: 0 }
          }
          violationRules[key].count++
        }
      })
    })
    const commonViolations = Object.entries(violationRules)
      .map(([rule, val]) => ({ rule, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return (
      <div className="flex flex-col gap-6">
        {/* Welcome Section */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <p className="text-lg font-semibold text-foreground">{firstName} · {user.district}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan a new product label to verify its declarations against LMPC Rules 2011.
            </p>
          </div>
          <Link href="/inspections/new" className={cn(buttonVariants(), 'h-10 shrink-0')}>
            <ScanLine className="size-4" /> New inspection
          </Link>
        </div>

        {/* Compact Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <DashboardStatCard label="Inspections Today" value={todayCount} trend={<span className="text-success font-medium">↑ 100% vs yesterday</span>} />
          <DashboardStatCard label="Inspections This Month" value={thisMonthCount} trend={<span className="text-success font-medium">On track for target</span>} />
          <DashboardStatCard label="Violations Found" value={violationsCount} trend={<span className="text-danger font-medium">+12 cited recently</span>} />
          <DashboardStatCard label="Compliance Rate" value={`${complianceRate}%`} trend={<span className="text-muted-foreground">Officer average: {avgScore}%</span>} />
        </div>

        {/* Two-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Recent Inspections Table */}
          <div className="lg:col-span-2">
            <Panel>
              <PanelHeader
                title="Recent Inspections"
                action={
                  <Link href="/inspections" className="text-xs font-medium text-primary hover:underline">
                    View all
                  </Link>
                }
              />
              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-border">
                {mine.slice(0, 6).map((insp) => (
                  <Link
                    key={insp.id}
                    href={`/inspections/${insp.id}`}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="truncate text-sm font-semibold text-foreground">{insp.productName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {insp.category} · {insp.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreBadge score={insp.score} />
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Product Name</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mine.slice(0, 6).map((insp) => (
                      <tr key={insp.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3 font-medium text-foreground truncate max-w-[200px]" title={insp.productName}>
                          {insp.productName}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{insp.category}</td>
                        <td className="px-5 py-3">
                          <ScoreBadge score={insp.score} />
                        </td>
                        <td className="px-5 py-3 font-medium text-xs tracking-wider">
                          <span className={insp.status === 'compliant' ? 'text-success' : 'text-danger'}>
                            {insp.status === 'compliant' ? 'Compliant' : 'Non-Compliant'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{insp.date}</td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/inspections/${insp.id}`} className="text-xs font-medium text-primary hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* Right: Violation Breakdown & Common Violations */}
          <div className="flex flex-col gap-6">
            <Panel className="flex-1 p-5">
              <h3 className="text-sm font-semibold text-foreground">Violation Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">By severity class</p>
              
              {/* Dynamic Side-by-Side Pie Chart & Vertical Legend */}
              <div className="flex flex-row items-center justify-center gap-6 py-4 border-b border-border pb-6">
                <div className="size-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={46}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {breakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5">
                  {breakdownData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{item.name}</span>
                        <span className="mt-1 text-sm font-bold text-foreground leading-none">{item.value} cases</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Violations */}
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Breaches This Month</h4>
                <ul className="mt-2 divide-y divide-border">
                  {commonViolations.length > 0 ? (
                    commonViolations.map((v) => (
                      <li key={v.rule} className="py-2 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <span className="font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded text-[10px] mr-1">{v.rule}</span>
                          <span className="text-foreground font-medium truncate inline-block align-middle max-w-[140px]" title={v.label}>
                            {v.label}
                          </span>
                        </div>
                        <span className="font-bold text-foreground tabular-nums shrink-0">{v.count} cases</span>
                      </li>
                    ))
                  ) : (
                    <li className="py-2 text-xs text-muted-foreground text-center">No violations logged this month.</li>
                  )}
                </ul>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    )
  }

  // SUPERVISOR ROLE
  if (user.role === 'supervisor') {
    const team = OFFICERS.filter((o) => o.role === 'inspector')
    
    // Compute team metrics
    const totalInspThisMonth = team.reduce((a, o) => a + o.inspectionsThisMonth, 0)
    const totalViolations = team.reduce((a, o) => a + o.violationsFound, 0)
    const teamAvgScore = Math.round(team.reduce((a, o) => a + o.avgScore, 0) / team.length)

    // Mock today's inspections count for the team
    const teamTodayCount = 8

    return (
      <div className="flex flex-col gap-6">
        {/* Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <DashboardStatCard label="Team Inspections Today" value={teamTodayCount} trend={<span className="text-success font-medium">↑ 15% vs yesterday</span>} />
          <DashboardStatCard label="Inspections This Month" value={totalInspThisMonth} trend={<span className="text-muted-foreground">{team.length} active officers</span>} />
          <DashboardStatCard label="Violations Cited" value={totalViolations} trend={<span className="text-danger font-medium">+24 cited this week</span>} />
          <DashboardStatCard label="Team Avg. Score" value={`${teamAvgScore}%`} trend={<span className="text-success font-medium">Above state benchmark (75%)</span>} />
        </div>

        {/* Inspector Activity Table */}
        <Panel>
          <PanelHeader
            title="Inspector Activity"
            description="Overview of performance metrics for your team this month"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Officer Name</th>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Inspections This Month</th>
                  <th className="px-5 py-3">Average Score</th>
                  <th className="px-5 py-3">Violations Found</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded bg-navy text-[10px] font-semibold text-white">
                        {o.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </span>
                      {o.name}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.district}</td>
                    <td className="px-5 py-3 tabular-nums text-foreground font-medium">{o.inspectionsThisMonth}</td>
                    <td className="px-5 py-3">
                      <ScoreBadge score={o.avgScore} />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-danger font-medium">{o.violationsFound}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        o.active ? 'bg-success-muted text-success' : 'bg-muted-foreground/10 text-muted-foreground'
                      )}>
                        {o.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <RecentInspections items={INSPECTIONS} />
      </div>
    )
  }

  // ADMIN ROLE
  const totalInsp = INSPECTIONS_OVER_TIME.reduce((a, m) => a + m.inspections, 0)
  const latestRate = COMPLIANCE_TREND[COMPLIANCE_TREND.length - 1].rate
  const totalOfficers = OFFICERS.filter((o) => o.role !== 'admin')
  const activeOfficers = totalOfficers.filter((o) => o.active).length
  const statesCoveredCount = Object.keys(STATE_VOLUME).length

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <DashboardStatCard label="Total Inspections" value={totalInsp.toLocaleString()} trend={<span className="text-muted-foreground">All jurisdictions · 6 mo</span>} />
        <DashboardStatCard label="Compliance Rate" value={`${latestRate}%`} trend={<span className="text-success font-medium">+2% vs last month</span>} />
        <DashboardStatCard label="Active Officers" value={`${activeOfficers}/${totalOfficers.length}`} trend={<span className="text-muted-foreground">Currently on-duty</span>} />
        <DashboardStatCard label="States Covered" value={statesCoveredCount} trend={<span className="text-muted-foreground">Active metrology cells</span>} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Inspections Over Time" description="Monthly enforcement activity and violations detected" />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={INSPECTIONS_OVER_TIME}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="inspections" name="Inspections" stroke="var(--primary)" strokeWidth={2} fill="url(#rateFill)" />
                <Line type="monotone" dataKey="violations" name="Violations" stroke="var(--slate)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Top Violated Provisions" description="Most frequently breached rules under LMPC 2011" />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={COMMON_VIOLATIONS} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="rule" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={70} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="count" name="Violations" radius={[0, 3, 3, 0]}>
                  {COMMON_VIOLATIONS.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? 'var(--primary)' : 'var(--slate)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* SVG Map Section at the bottom */}
      <Panel>
        <PanelHeader title="Geographic Distribution" description="State-level metrology enforcement intensity (Inspections volume)" />
        <div className="p-6">
          <IndiaMap />
        </div>
      </Panel>

      <RecentInspections items={INSPECTIONS} />
    </div>
  )
}
