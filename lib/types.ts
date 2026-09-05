export type Role = 'inspector' | 'supervisor' | 'admin'

export interface AuthUser {
  id?: string
  employeeId: string
  name: string
  role: Role
  district: string
  state: string
}

export type ComplianceStatus = 'compliant' | 'non-compliant' | 'pending'

export type ViolationSeverity = 'critical' | 'major' | 'minor'

export type FieldStatus = 'compliant' | 'violation' | 'missing'

export interface Officer {
  id: string
  employeeId: string
  name: string
  role: Role
  district: string
  state: string
  active: boolean
  inspectionsThisMonth: number
  avgScore: number
  violationsFound: number
}

export interface ReadabilityReport {
  status: 'pass' | 'warning' | 'fail'
  contrastAdequate: boolean
  glareOrBlurDetected?: boolean
  notes: string
}

export interface FontSizeCompliance {
  status: 'compliant' | 'violation' | 'warning'
  isBold?: boolean
  assessment: string
}

export interface MisleadingFlag {
  isMisleading: boolean
  reason: string | null
}

export interface DeclarationField {
  key: string
  label: string
  extracted: string | null
  status: FieldStatus
  rule: string
  severity: ViolationSeverity | null
  explanation: string | null
  /** bounding box in percentage coordinates over the product image (0-100) */
  box: { x: number; y: number; w: number; h: number }
  fontSizeCompliance?: FontSizeCompliance | null
  misleadingFlags?: MisleadingFlag | null
}

export interface Inspection {
  id: string
  productName: string
  manufacturer: string
  category: string
  score: number
  status: ComplianceStatus
  date: string
  state: string
  batchNumber: string
  inspectorId: string
  inspectorName: string
  inspectorEmployeeId?: string
  image: string
  images?: string[]
  sourceType: 'image' | 'url'
  productLink: string | null
  notes: string
  fields: DeclarationField[]
  readability?: ReadabilityReport | null
  coordinates?: { lat: number; lng: number; accuracy?: number; address?: string } | string
  timestamp?: string
  evidenceHash?: string
}

export interface ProductRecord {
  id: string
  name: string
  manufacturer: string
  category: string
  lastInspection: string
  score: number
  status: ComplianceStatus
  history: { date: string; score: number; status: ComplianceStatus; inspector: string }[]
}

export interface ReportRecord {
  id: string
  inspectionId: string
  product: string
  inspector: string
  date: string
  score: number
  status: ComplianceStatus
}

export interface AnalysisField {
  key: string
  label: string
  rule: string
  status: FieldStatus
  severity: ViolationSeverity | null
  extracted: string | null
  explanation: string | null
  box?: { x: number; y: number; w: number; h: number }
  box_2d?: [number, number, number, number] | null
  fontSizeCompliance?: FontSizeCompliance | null
  misleadingFlags?: MisleadingFlag | null
}

export interface AnalysisResult {
  productName: string
  manufacturer: string
  category: string
  score: number
  status: ComplianceStatus
  sourceType: 'image' | 'url'
  fields: AnalysisField[]
  readability?: ReadabilityReport | null
}

