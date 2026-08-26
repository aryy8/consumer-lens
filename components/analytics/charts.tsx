'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { COMMON_VIOLATIONS, COMPLIANCE_TREND, INSPECTIONS_OVER_TIME } from '@/lib/data'

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }
const GRID = 'var(--border)'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="mb-0.5 font-medium text-popover-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="tabular-nums text-muted-foreground">
          <span style={{ color: p.color }}>■</span> {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export function InspectionsLineChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={INSPECTIONS_OVER_TIME} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradInsp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="inspections"
          name="Inspections"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#gradInsp)"
        />
        <Line
          type="monotone"
          dataKey="violations"
          name="Violations"
          stroke="var(--slate)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ViolationsBarChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={COMMON_VIOLATIONS}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          type="category"
          dataKey="rule"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={72}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="count" name="Violations" radius={[0, 3, 3, 0]}>
          {COMMON_VIOLATIONS.map((_, i) => (
            <Cell key={i} fill={i === 0 ? 'var(--primary)' : 'var(--slate)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ComplianceTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={COMPLIANCE_TREND} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={[60, 90]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="rate"
          name="Compliance rate"
          stroke="var(--success)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--success)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
