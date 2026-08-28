import bcrypt from 'bcryptjs'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { inspections, reports, users } from '@/drizzle/schema'
import type { InspectionRow, UserRow } from '@/drizzle/schema'
import { db } from './db'
import { DECLARATION_TEMPLATE } from './data'
import type {
  AnalysisField,
  AuthUser,
  ComplianceStatus,
  Inspection,
  Officer,
  ProductRecord,
  ReportRecord,
  Role,
} from './types'

// ---------------------------------------------------------------------------
// Domain shapes returned to the UI
// ---------------------------------------------------------------------------

export interface DashboardData {
  inspections: Inspection[]
  officers: Officer[]
  inspectionsOverTime: { month: string; inspections: number; violations: number }[]
  complianceTrend: { month: string; rate: number }[]
  commonViolations: { rule: string; label: string; count: number }[]
  stateVolume: Record<string, number>
}

export interface AnalyticsData {
  overTime: { month: string; inspections: number; violations: number }[]
  complianceTrend: { month: string; rate: number }[]
  commonViolations: { rule: string; label: string; count: number }[]
  stateVolume: Record<string, number>
  totalInspections: number
}

export interface NewInspectionPayload {
  productName: string
  manufacturer: string
  category: string
  score: number
  status: ComplianceStatus
  sourceType: 'image' | 'url'
  fields: AnalysisField[]
  batchNumber: string
  state: string
  notes: string
  image: string | null
  productLink: string | null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type InspectionJoinRow = {
  insp: InspectionRow
  inspectorName: string | null
  employeeId?: string | null
}

async function resolveUser(employeeId: string): Promise<UserRow | null> {
  const [u] = await db.select().from(users).where(eq(users.employeeId, employeeId))
  return u ?? null
}

/** Map a DB inspection row (joined with its inspector) to the domain Inspection. */
function mapInspection(row: InspectionJoinRow): Inspection {
  const r = row.insp
  return {
    id: r.id,
    productName: r.productName,
    manufacturer: r.manufacturer,
    category: r.category,
    score: r.score,
    status: r.status as ComplianceStatus,
    date: r.date,
    state: r.state,
    batchNumber: r.batchNumber,
    inspectorId: row.employeeId ?? '',
    inspectorName: row.inspectorName ?? 'Unknown',
    image: r.image ?? '/placeholder.svg',
    sourceType: (r.sourceType as 'image' | 'url') ?? 'image',
    productLink: r.productLink,
    notes: r.notes,
    fields: ((r.fields as AnalysisField[]) ?? []).map((f, idx) => ({
      ...f,
      box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
    })),
  }
}

const MONTH_KEYS = 6

function lastNMonthKeys(n: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function monthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00Z`).toLocaleString('en', { month: 'short', timeZone: 'UTC' })
}

function fieldCount(fields: unknown): number {
  const arr = (fields as AnalysisField[]) ?? []
  return arr.filter((f) => f.status !== 'compliant').length
}

/** Build Officer[] (identity + stats computed from inspections). id = employeeId. */
function computeOfficers(userRows: UserRow[], inspRows: { insp: InspectionRow }[]): Officer[] {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const byUser = new Map<string, { countMonth: number; scores: number[]; violations: number }>()
  for (const { insp } of inspRows) {
    const g = byUser.get(insp.inspectorId) ?? { countMonth: 0, scores: [], violations: 0 }
    if (insp.date.slice(0, 7) === currentMonth) g.countMonth++
    g.scores.push(insp.score)
    g.violations += fieldCount(insp.fields)
    byUser.set(insp.inspectorId, g)
  }
  return userRows.map((u) => {
    const g = byUser.get(u.id)
    return {
      id: u.employeeId,
      employeeId: u.employeeId,
      name: u.name,
      role: u.role as Role,
      district: u.district,
      state: u.state,
      active: u.active,
      inspectionsThisMonth: g?.countMonth ?? 0,
      avgScore: g && g.scores.length ? Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length) : 0,
      violationsFound: g?.violations ?? 0,
    }
  })
}

/** Aggregate analytics from raw inspection rows (JS-side; cheap at demo scale). */
function aggregateAnalytics(inspRows: { insp: InspectionRow }[]): AnalyticsData {
  const keys = lastNMonthKeys(MONTH_KEYS)
  const byMonth = new Map(keys.map((k) => [k, { inspections: 0, violations: 0, compliant: 0 }]))
  const byRule = new Map<string, { rule: string; label: string; count: number }>()
  const byState = new Map<string, number>()
  let totalInspections = 0

  for (const { insp } of inspRows) {
    totalInspections++
    const mk = insp.date.slice(0, 7)
    const m = byMonth.get(mk)
    if (m) {
      m.inspections++
      if (insp.status === 'compliant') m.compliant++
    }
    byState.set(insp.state, (byState.get(insp.state) ?? 0) + 1)
    for (const f of (insp.fields as AnalysisField[]) ?? []) {
      if (f.status !== 'compliant') {
        if (m) m.violations++
        const entry = byRule.get(f.rule) ?? { rule: f.rule, label: f.label, count: 0 }
        entry.count++
        byRule.set(f.rule, entry)
      }
    }
  }

  return {
    overTime: keys.map((k) => ({
      month: monthLabel(k),
      inspections: byMonth.get(k)!.inspections,
      violations: byMonth.get(k)!.violations,
    })),
    complianceTrend: keys.map((k) => {
      const m = byMonth.get(k)!
      return { month: monthLabel(k), rate: m.inspections ? Math.round((m.compliant / m.inspections) * 100) : 0 }
    }),
    commonViolations: [...byRule.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    stateVolume: Object.fromEntries(byState.entries()),
    totalInspections,
  }
}

async function allInspectionRows() {
  return db
    .select({ insp: inspections, inspectorName: users.name, employeeId: users.employeeId })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
}

// ---------------------------------------------------------------------------
// Users / officers
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<Officer[]> {
  const [userRows, inspRows] = await Promise.all([
    db.select().from(users),
    db.select({ insp: inspections }).from(inspections),
  ])
  return computeOfficers(userRows, inspRows)
}

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

export async function getInspectionsForUser(user: AuthUser): Promise<Inspection[]> {
  const rows = await allInspectionRows()
  const inspections = rows.map(mapInspection)
  if (user.role === 'admin') return inspections
  const me = await resolveUser(user.employeeId)
  if (!me) return []
  if (user.role === 'inspector') {
    return inspections.filter((i) => i.inspectorId === me.employeeId)
  }
  // supervisor: inspections by inspector-role officers in their state
  const team = new Set(
    (await db
      .select({ employeeId: users.employeeId })
      .from(users)
      .where(and(eq(users.role, 'inspector'), eq(users.state, me.state)))).map((r) => r.employeeId),
  )
  return inspections.filter((i) => team.has(i.inspectorId))
}

export async function getInspectionById(id: string): Promise<Inspection | null> {
  const rows = await db
    .select({ insp: inspections, inspectorName: users.name, employeeId: users.employeeId })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .where(eq(inspections.id, id))
  if (!rows.length) return null
  return mapInspection(rows[0])
}

export async function createInspection(
  user: AuthUser,
  payload: NewInspectionPayload,
): Promise<Inspection> {
  const me = await resolveUser(user.employeeId)
  if (!me) throw new Error('Session user not found.')
  const date = new Date().toISOString().slice(0, 10)

  const [insp] = await db
    .insert(inspections)
    .values({
      productName: payload.productName,
      manufacturer: payload.manufacturer,
      category: payload.category,
      score: payload.score,
      status: payload.status,
      date,
      state: payload.state,
      batchNumber: payload.batchNumber,
      inspectorId: me.id,
      sourceType: payload.sourceType,
      image: payload.image,
      productLink: payload.productLink,
      notes: payload.notes,
      fields: payload.fields as unknown as unknown[],
    })
    .returning()

  await db.insert(reports).values({
    inspectionId: insp.id,
    product: payload.productName,
    inspector: user.name,
    date,
    score: payload.score,
    status: payload.status,
  })

  return mapInspection({ insp, inspectorName: user.name, employeeId: user.employeeId })
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getReportsForUser(user: AuthUser): Promise<ReportRecord[]> {
  const me = user.role === 'admin' ? null : await resolveUser(user.employeeId)
  const rows = await db
    .select({
      id: reports.id,
      inspectionId: reports.inspectionId,
      product: reports.product,
      inspector: reports.inspector,
      date: reports.date,
      score: reports.score,
      status: reports.status,
      employeeId: users.employeeId,
      state: users.state,
      role: users.role,
    })
    .from(reports)
    .innerJoin(inspections, eq(reports.inspectionId, inspections.id))
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .where(
      user.role === 'inspector'
        ? eq(users.employeeId, user.employeeId)
        : user.role === 'supervisor' && me
          ? and(eq(users.role, 'inspector'), eq(users.state, me.state))
          : undefined,
    )

  return rows
    .map((r) => ({
      id: r.id,
      inspectionId: r.inspectionId,
      product: r.product,
      inspector: r.inspector,
      date: r.date,
      score: r.score,
      status: r.status as ComplianceStatus,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// ---------------------------------------------------------------------------
// Products (repository) — aggregated live from inspections
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<ProductRecord[]> {
  const rows = await db
    .select({ insp: inspections, inspectorName: users.name })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .orderBy(desc(inspections.date))

  const groups = new Map<string, { insp: Inspection; history: ProductRecord['history'] }>()
  for (const row of rows) {
    const insp = mapInspection(row)
    const key = `${insp.productName}||${insp.manufacturer}`
    if (!groups.has(key)) groups.set(key, { insp, history: [] })
    groups.get(key)!.history.push({
      date: insp.date,
      score: insp.score,
      status: insp.status,
      inspector: insp.inspectorName,
    })
  }

  return [...groups.values()].map((g) => ({
    id: g.insp.id,
    name: g.insp.productName,
    manufacturer: g.insp.manufacturer,
    category: g.insp.category,
    lastInspection: g.insp.date,
    score: g.insp.score,
    status: g.insp.status,
    history: g.history,
  }))
}

// ---------------------------------------------------------------------------
// Dashboard + Analytics
// ---------------------------------------------------------------------------

export async function getDashboardData(user: AuthUser): Promise<DashboardData> {
  const me = await resolveUser(user.employeeId)
  const [allRows, userRows] = await Promise.all([
    allInspectionRows(),
    db.select().from(users),
  ])
  const inspections = allRows.map(mapInspection)
  const officers = computeOfficers(userRows, allRows)

  let scoped = inspections
  if (user.role === 'inspector' && me) {
    scoped = inspections.filter((i) => i.inspectorId === me.employeeId)
  } else if (user.role === 'supervisor' && me) {
    const team = new Set(
      userRows.filter((u) => u.role === 'inspector' && u.state === me.state).map((u) => u.employeeId),
    )
    scoped = inspections.filter((i) => team.has(i.inspectorId))
  }

  const analytics = aggregateAnalytics(allRows)
  return {
    inspections: scoped,
    officers,
    inspectionsOverTime: analytics.overTime,
    complianceTrend: analytics.complianceTrend,
    commonViolations: analytics.commonViolations,
    stateVolume: analytics.stateVolume,
  }
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const rows = await db.select({ insp: inspections }).from(inspections)
  return aggregateAnalytics(rows)
}

// ---------------------------------------------------------------------------
// User management (admin)
// ---------------------------------------------------------------------------

export interface NewOfficerPayload {
  name: string
  employeeId: string
  role: Role
  district: string
  state: string
  password: string
}

function toOfficerSummary(u: UserRow): Officer {
  return {
    id: u.employeeId,
    employeeId: u.employeeId,
    name: u.name,
    role: u.role as Role,
    district: u.district,
    state: u.state,
    active: u.active,
    inspectionsThisMonth: 0,
    avgScore: 0,
    violationsFound: 0,
  }
}

export async function createUser(payload: NewOfficerPayload): Promise<Officer> {
  const passwordHash = await bcrypt.hash(payload.password, 10)
  const [row] = await db
    .insert(users)
    .values({
      employeeId: payload.employeeId,
      name: payload.name,
      role: payload.role,
      district: payload.district,
      state: payload.state,
      passwordHash,
      active: true,
    })
    .returning()
  return toOfficerSummary(row)
}

export async function updateUser(employeeId: string, patch: { active?: boolean }): Promise<Officer | null> {
  const [row] = await db.update(users).set(patch).where(eq(users.employeeId, employeeId)).returning()
  return row ? toOfficerSummary(row) : null
}

export async function verifyCredentials(
  employeeId: string,
  password: string,
): Promise<{ ok: true; user: UserRow } | { ok: false; error: string }> {
  const [u] = await db.select().from(users).where(eq(users.employeeId, employeeId))
  if (!u) return { ok: false, error: 'Invalid Employee ID or password.' }
  const valid = await bcrypt.compare(password, u.passwordHash)
  if (!valid) return { ok: false, error: 'Invalid Employee ID or password.' }
  if (!u.active) return { ok: false, error: 'Your account has been deactivated. Contact your administrator.' }
  return { ok: true, user: u }
}
