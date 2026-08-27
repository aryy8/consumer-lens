import type { AnalysisResult, ComplianceStatus } from './types'

// ---- Keys ----
const INSPECTIONS_KEY = 'consumer-lens:inspections'
const REPORTS_KEY = 'consumer-lens:reports'

// ---- Saved Inspection shape ----
export interface SavedInspection {
  id: string
  productName: string
  manufacturer: string
  category: string
  score: number
  status: ComplianceStatus
  date: string
  state: string
  batchNumber: string
  inspectorName: string
  sourceType: 'image' | 'url'
  image: string | null        // base64 data URL (may be large)
  productLink: string | null
  notes: string
  fields: AnalysisResult['fields']
}

export interface SavedReport {
  id: string
  inspectionId: string
  product: string
  inspector: string
  date: string
  score: number
  status: ComplianceStatus
  generatedAt: string
}

// ---- Helpers ----
function generateId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${ts}-${rand}`
}

function getInspectorName(): string {
  if (typeof window === 'undefined') return 'Inspector'
  try {
    const auth = localStorage.getItem('auth')
    if (auth) {
      const parsed = JSON.parse(auth)
      return parsed.name || parsed.employeeId || 'Inspector'
    }
  } catch { /* noop */ }
  return 'Inspector'
}

// ---- Inspections ----

export function getSavedInspections(): SavedInspection[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(INSPECTIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveInspection(
  result: AnalysisResult,
  meta: {
    batchNumber: string
    state: string
    notes: string
    image: string | null
    productLink: string | null
  }
): SavedInspection {
  const inspections = getSavedInspections()

  const inspection: SavedInspection = {
    id: generateId('INSP'),
    productName: result.productName,
    manufacturer: result.manufacturer,
    category: result.category,
    score: result.score,
    status: result.status,
    date: new Date().toISOString().slice(0, 10),
    state: meta.state,
    batchNumber: meta.batchNumber,
    inspectorName: getInspectorName(),
    sourceType: result.sourceType,
    image: meta.image,
    productLink: meta.productLink,
    notes: meta.notes,
    fields: result.fields,
  }

  // Prepend (newest first)
  inspections.unshift(inspection)

  // Keep last 100 to avoid bloating localStorage
  const trimmed = inspections.slice(0, 100)

  try {
    localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(trimmed))
  } catch (e) {
    // If storage quota exceeded (likely due to base64 images), try without images
    const withoutImages = trimmed.map((i) => ({ ...i, image: null }))
    localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(withoutImages))
  }

  return inspection
}

export function getInspectionById(id: string): SavedInspection | null {
  const all = getSavedInspections()
  return all.find((i) => i.id === id) ?? null
}

// ---- Reports ----

export function getSavedReports(): SavedReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveReport(inspection: SavedInspection): SavedReport {
  const reports = getSavedReports()

  const report: SavedReport = {
    id: generateId('RPT'),
    inspectionId: inspection.id,
    product: inspection.productName,
    inspector: inspection.inspectorName,
    date: inspection.date,
    score: inspection.score,
    status: inspection.status,
    generatedAt: new Date().toISOString(),
  }

  reports.unshift(report)
  const trimmed = reports.slice(0, 100)
  localStorage.setItem(REPORTS_KEY, JSON.stringify(trimmed))

  return report
}

export function clearAllData() {
  localStorage.removeItem(INSPECTIONS_KEY)
  localStorage.removeItem(REPORTS_KEY)
}
