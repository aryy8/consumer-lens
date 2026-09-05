import bcrypt from 'bcryptjs'
import { and, desc, eq } from 'drizzle-orm'
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
  images?: string[] | null
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

type SummaryInspRow = {
  inspectorId?: string | null
  date: string
  score?: number
  status?: string
  state?: string
  fields?: unknown
}

/** Build Officer[] (identity + stats computed from inspections). id = employeeId. */
function computeOfficers(userRows: UserRow[], inspRows: SummaryInspRow[]): Officer[] {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const byUser = new Map<string, { countMonth: number; scores: number[]; violations: number }>()
  for (const insp of inspRows) {
    if (!insp.inspectorId) continue
    const g = byUser.get(insp.inspectorId) ?? { countMonth: 0, scores: [], violations: 0 }
    if (insp.date.slice(0, 7) === currentMonth) g.countMonth++
    if (typeof insp.score === 'number') g.scores.push(insp.score)
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

/** Aggregate analytics from summary inspection rows. */
function aggregateAnalytics(inspRows: SummaryInspRow[]): AnalyticsData {
  const keys = lastNMonthKeys(MONTH_KEYS)
  const byMonth = new Map(keys.map((k) => [k, { inspections: 0, violations: 0, compliant: 0 }]))
  const byRule = new Map<string, { rule: string; label: string; count: number }>()
  const byState = new Map<string, number>()
  let totalInspections = 0

  for (const insp of inspRows) {
    totalInspections++
    const mk = insp.date.slice(0, 7)
    const m = byMonth.get(mk)
    if (m) {
      m.inspections++
      if (insp.status === 'compliant') m.compliant++
    }
    if (insp.state) {
      byState.set(insp.state, (byState.get(insp.state) ?? 0) + 1)
    }
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

// ---------------------------------------------------------------------------
// Users / officers
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<Officer[]> {
  const [userRows, inspRows] = await Promise.all([
    db.select().from(users),
    db.select({
      inspectorId: inspections.inspectorId,
      date: inspections.date,
      score: inspections.score,
      fields: inspections.fields,
    }).from(inspections),
  ])
  return computeOfficers(userRows, inspRows)
}

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

export async function getInspectionsForUser(user: AuthUser): Promise<Inspection[]> {
  const query = db
    .select({
      id: inspections.id,
      productName: inspections.productName,
      manufacturer: inspections.manufacturer,
      category: inspections.category,
      score: inspections.score,
      status: inspections.status,
      date: inspections.date,
      state: inspections.state,
      batchNumber: inspections.batchNumber,
      inspectorId: users.employeeId,
      inspectorName: users.name,
      image: inspections.image,
      images: inspections.images,
      sourceType: inspections.sourceType,
      productLink: inspections.productLink,
      notes: inspections.notes,
      fields: inspections.fields,
    })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .orderBy(desc(inspections.date), desc(inspections.createdAt))

  let rows
  if (user.role === 'admin') {
    rows = await query
  } else if (user.role === 'inspector') {
    rows = await query.where(eq(users.employeeId, user.employeeId))
  } else {
    // supervisor: inspections in their jurisdiction/state by inspectors
    rows = await query.where(and(eq(users.role, 'inspector'), eq(users.state, user.state)))
  }

  return rows.map((r) => ({
    id: r.id,
    productName: r.productName,
    manufacturer: r.manufacturer,
    category: r.category,
    score: r.score,
    status: r.status as ComplianceStatus,
    date: r.date,
    state: r.state,
    batchNumber: r.batchNumber,
    inspectorId: r.inspectorId ?? '',
    inspectorName: r.inspectorName ?? 'Unknown',
    image: r.image ?? '/placeholder.svg',
    images: (r.images as string[]) ?? (r.image ? [r.image] : []),
    sourceType: (r.sourceType as 'image' | 'url') ?? 'image',
    productLink: r.productLink,
    notes: r.notes,
    fields: ((r.fields as AnalysisField[]) ?? []).map((f, idx) => ({
      ...f,
      box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
    })),
  }))
}

export async function getInspectionById(id: string): Promise<Inspection | null> {
  const rows = await db
    .select({
      id: inspections.id,
      productName: inspections.productName,
      manufacturer: inspections.manufacturer,
      category: inspections.category,
      score: inspections.score,
      status: inspections.status,
      date: inspections.date,
      state: inspections.state,
      batchNumber: inspections.batchNumber,
      inspectorId: users.employeeId,
      inspectorName: users.name,
      image: inspections.image,
      images: inspections.images,
      sourceType: inspections.sourceType,
      productLink: inspections.productLink,
      notes: inspections.notes,
      fields: inspections.fields,
    })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .where(eq(inspections.id, id))
    .limit(1)

  if (!rows.length) return null
  const r = rows[0]
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
    inspectorId: r.inspectorId ?? '',
    inspectorName: r.inspectorName ?? 'Unknown',
    image: r.image ?? '/placeholder.svg',
    images: (r.images as string[]) ?? (r.image ? [r.image] : []),
    sourceType: (r.sourceType as 'image' | 'url') ?? 'image',
    productLink: r.productLink,
    notes: r.notes,
    fields: ((r.fields as AnalysisField[]) ?? []).map((f, idx) => ({
      ...f,
      box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
    })),
  }
}

export async function createInspection(
  user: AuthUser,
  payload: NewInspectionPayload,
): Promise<Inspection> {
  let userId = user.id
  if (!userId) {
    const me = await resolveUser(user.employeeId)
    if (!me) throw new Error('Session user not found.')
    userId = me.id
  }
  const date = new Date().toISOString().slice(0, 10)

  const allImages = Array.isArray(payload.images) && payload.images.length > 0
    ? payload.images
    : (payload.image ? [payload.image] : [])

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
      inspectorId: userId,
      sourceType: payload.sourceType,
      image: payload.image || (allImages[0] ?? null),
      images: allImages,
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

  return {
    id: insp.id,
    productName: insp.productName,
    manufacturer: insp.manufacturer,
    category: insp.category,
    score: insp.score,
    status: insp.status as ComplianceStatus,
    date: insp.date,
    state: insp.state,
    batchNumber: insp.batchNumber,
    inspectorId: user.employeeId,
    inspectorName: user.name,
    image: insp.image ?? '/placeholder.svg',
    images: (insp.images as string[]) ?? (insp.image ? [insp.image] : []),
    sourceType: (insp.sourceType as 'image' | 'url') ?? 'image',
    productLink: insp.productLink,
    notes: insp.notes,
    fields: ((insp.fields as AnalysisField[]) ?? []).map((f, idx) => ({
      ...f,
      box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
    })),
  }
}

export async function deleteInspection(
  id: string,
  user: AuthUser,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Fetch inspection to verify existence and permissions
  const [existing] = await db
    .select({
      id: inspections.id,
      state: inspections.state,
      inspectorEmployeeId: users.employeeId,
    })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .where(eq(inspections.id, id))
    .limit(1)

  if (!existing) {
    return { ok: false, error: 'Inspection not found.' }
  }

  // 2. Role-based permission check
  if (user.role === 'inspector' && existing.inspectorEmployeeId !== user.employeeId) {
    return { ok: false, error: 'You do not have permission to delete this inspection.' }
  }
  if (user.role === 'supervisor' && existing.state !== user.state) {
    return { ok: false, error: 'You do not have permission to delete inspections outside your state.' }
  }

  // 3. Delete associated report and inspection
  await db.delete(reports).where(eq(reports.inspectionId, id))
  await db.delete(inspections).where(eq(inspections.id, id))

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getReportsForUser(user: AuthUser): Promise<ReportRecord[]> {
  const q = db
    .select({
      id: reports.id,
      inspectionId: reports.inspectionId,
      product: reports.product,
      inspector: reports.inspector,
      date: reports.date,
      score: reports.score,
      status: reports.status,
    })
    .from(reports)
    .innerJoin(inspections, eq(reports.inspectionId, inspections.id))
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .orderBy(desc(reports.date), desc(reports.generatedAt))

  let rows
  if (user.role === 'inspector') {
    rows = await q.where(eq(users.employeeId, user.employeeId))
  } else if (user.role === 'supervisor') {
    rows = await q.where(and(eq(users.role, 'inspector'), eq(users.state, user.state)))
  } else {
    rows = await q
  }

  return rows.map((r) => ({
    id: r.id,
    inspectionId: r.inspectionId,
    product: r.product,
    inspector: r.inspector,
    date: r.date,
    score: r.score,
    status: r.status as ComplianceStatus,
  }))
}

// ---------------------------------------------------------------------------
// Products (repository) — aggregated live from inspections
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<ProductRecord[]> {
  const rows = await db
    .select({
      id: inspections.id,
      productName: inspections.productName,
      manufacturer: inspections.manufacturer,
      category: inspections.category,
      score: inspections.score,
      status: inspections.status,
      date: inspections.date,
      inspectorName: users.name,
    })
    .from(inspections)
    .leftJoin(users, eq(inspections.inspectorId, users.id))
    .orderBy(desc(inspections.date))

  const groups = new Map<
    string,
    {
      id: string
      name: string
      manufacturer: string
      category: string
      lastInspection: string
      score: number
      status: ComplianceStatus
      history: ProductRecord['history']
    }
  >()

  for (const row of rows) {
    const key = `${row.productName}||${row.manufacturer}`
    if (!groups.has(key)) {
      groups.set(key, {
        id: row.id,
        name: row.productName,
        manufacturer: row.manufacturer,
        category: row.category,
        lastInspection: row.date,
        score: row.score,
        status: row.status as ComplianceStatus,
        history: [],
      })
    }
    groups.get(key)!.history.push({
      date: row.date,
      score: row.score,
      status: row.status as ComplianceStatus,
      inspector: row.inspectorName ?? 'Unknown',
    })
  }

  return [...groups.values()]
}

// ---------------------------------------------------------------------------
// Dashboard + Analytics
// ---------------------------------------------------------------------------

export async function getDashboardData(user: AuthUser): Promise<DashboardData> {
  const [scopedInspections, userRows, allSummaryRows] = await Promise.all([
    // User's scoped inspections (ordered by date desc)
    (async () => {
      const q = db
        .select({
          id: inspections.id,
          productName: inspections.productName,
          manufacturer: inspections.manufacturer,
          category: inspections.category,
          score: inspections.score,
          status: inspections.status,
          date: inspections.date,
          state: inspections.state,
          batchNumber: inspections.batchNumber,
          inspectorId: users.employeeId,
          inspectorName: users.name,
          image: inspections.image,
          images: inspections.images,
          sourceType: inspections.sourceType,
          productLink: inspections.productLink,
          notes: inspections.notes,
          fields: inspections.fields,
        })
        .from(inspections)
        .leftJoin(users, eq(inspections.inspectorId, users.id))
        .orderBy(desc(inspections.date), desc(inspections.createdAt))

      if (user.role === 'inspector') {
        return q.where(eq(users.employeeId, user.employeeId))
      } else if (user.role === 'supervisor') {
        return q.where(and(eq(users.role, 'inspector'), eq(users.state, user.state)))
      }
      return q
    })(),
    // Users (needed for supervisor team view and admin officer metrics)
    user.role !== 'inspector' ? db.select().from(users) : Promise.resolve([]),
    // Summary rows without heavy columns for fast stats & analytics
    db
      .select({
        inspectorId: inspections.inspectorId,
        date: inspections.date,
        status: inspections.status,
        state: inspections.state,
        score: inspections.score,
        fields: inspections.fields,
      })
      .from(inspections),
  ])

  const inspectionsList: Inspection[] = scopedInspections.map((r) => ({
    id: r.id,
    productName: r.productName,
    manufacturer: r.manufacturer,
    category: r.category,
    score: r.score,
    status: r.status as ComplianceStatus,
    date: r.date,
    state: r.state,
    batchNumber: r.batchNumber,
    inspectorId: r.inspectorId ?? '',
    inspectorName: r.inspectorName ?? 'Unknown',
    image: r.image ?? '/placeholder.svg',
    images: (r.images as string[]) ?? (r.image ? [r.image] : []),
    sourceType: (r.sourceType as 'image' | 'url') ?? 'image',
    productLink: r.productLink,
    notes: r.notes,
    fields: ((r.fields as AnalysisField[]) ?? []).map((f, idx) => ({
      ...f,
      box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
    })),
  }))

  const officers = computeOfficers(userRows, allSummaryRows)
  const analytics = aggregateAnalytics(allSummaryRows)

  return {
    inspections: inspectionsList,
    officers,
    inspectionsOverTime: analytics.overTime,
    complianceTrend: analytics.complianceTrend,
    commonViolations: analytics.commonViolations,
    stateVolume: analytics.stateVolume,
  }
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const rows = await db
    .select({
      inspectorId: inspections.inspectorId,
      date: inspections.date,
      status: inspections.status,
      state: inspections.state,
      score: inspections.score,
      fields: inspections.fields,
    })
    .from(inspections)
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

