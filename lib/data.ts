import type {
  DeclarationField,
  Inspection,
  Officer,
  ProductRecord,
  ReportRecord,
} from './types'

export const CATEGORIES = [
  'Food & Beverages',
  'Cosmetics',
  'Household Care',
  'Packaged Snacks',
  'Personal Care',
  'Pharmaceuticals',
  'Electronics',
]

export const STATES = [
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Gujarat',
  'Uttar Pradesh',
  'West Bengal',
  'Rajasthan',
  'Kerala',
  'Telangana',
]

/** The 9 mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011 */
export const DECLARATION_TEMPLATE: Omit<
  DeclarationField,
  'extracted' | 'status' | 'severity' | 'explanation'
>[] = [
  { key: 'manufacturer', label: 'Name & Address of Manufacturer', rule: 'Rule 6(1)(a)', box: { x: 6, y: 8, w: 52, h: 9 } },
  { key: 'commodity', label: 'Common / Generic Name of Commodity', rule: 'Rule 6(1)(b)', box: { x: 6, y: 22, w: 40, h: 8 } },
  { key: 'quantity', label: 'Net Quantity', rule: 'Rule 6(1)(c)', box: { x: 6, y: 35, w: 30, h: 8 } },
  { key: 'manufactureDate', label: 'Month & Year of Manufacture', rule: 'Rule 6(1)(d)', box: { x: 52, y: 35, w: 40, h: 8 } },
  { key: 'mrp', label: 'Retail Sale Price (MRP, incl. taxes)', rule: 'Rule 6(1)(e)', box: { x: 6, y: 48, w: 44, h: 9 } },
  { key: 'consumerCare', label: 'Consumer Care Details', rule: 'Rule 6(1)(f)', box: { x: 6, y: 62, w: 60, h: 9 } },
  { key: 'origin', label: 'Country of Origin', rule: 'Rule 6(1)(g)', box: { x: 6, y: 76, w: 34, h: 8 } },
  { key: 'unitPrice', label: 'Unit Sale Price', rule: 'Rule 18(3)', box: { x: 52, y: 62, w: 40, h: 8 } },
  { key: 'fontSize', label: 'Height of Numerals / Letters', rule: 'Rule 9', box: { x: 52, y: 76, w: 40, h: 8 } },
]

function field(
  key: string,
  extracted: string | null,
  status: DeclarationField['status'],
  severity: DeclarationField['severity'],
  explanation: string | null,
): DeclarationField {
  const tpl = DECLARATION_TEMPLATE.find((f) => f.key === key)!
  return { ...tpl, extracted, status, severity, explanation }
}

const compliantFields = (): DeclarationField[] => [
  field('manufacturer', 'Hindustan Foods Ltd., MIDC Estate, Pune 411019', 'compliant', null, null),
  field('commodity', 'Roasted Almonds', 'compliant', null, null),
  field('quantity', 'Net Wt. 200 g', 'compliant', null, null),
  field('manufactureDate', 'Mfg: 03/2026', 'compliant', null, null),
  field('mrp', 'MRP Rs. 349 (incl. of all taxes)', 'compliant', null, null),
  field('consumerCare', 'care@hindustanfoods.in · 1800-123-4567', 'compliant', null, null),
  field('origin', 'India', 'compliant', null, null),
  field('unitPrice', 'Rs. 174.50 / 100 g', 'compliant', null, null),
  field('fontSize', '3.1 mm', 'compliant', null, null),
]

const dataInstances: {
  productName: string
  manufacturer: string
  category: string
  batchNumber: string
  image: string
  overrides: Partial<Record<string, DeclarationField>>
}[] = [
  {
    productName: 'Alpine Roasted Almonds 200g',
    manufacturer: 'Hindustan Foods Ltd.',
    category: 'Packaged Snacks',
    batchNumber: 'HF-AL-2607',
    image: '/product-label-nuts.png',
    overrides: {},
  },
  {
    productName: 'GlowDew Face Serum 30ml',
    manufacturer: 'Aurelia Cosmetics Pvt. Ltd.',
    category: 'Cosmetics',
    batchNumber: 'AC-SR-1183',
    image: '/product-label-serum.png',
    overrides: {
      mrp: field('mrp', 'MRP Rs. 899', 'violation', 'major', 'The MRP is printed without the mandatory qualifier "inclusive of all taxes". Rule 6(1)(e) requires the retail sale price to be declared as "Maximum Retail Price Rs. ___ inclusive of all taxes" so the consumer understands no additional charges apply.'),
      consumerCare: field('consumerCare', null, 'missing', 'critical', 'No consumer care details were detected on the label. Rule 6(1)(f) mandates the name, address, telephone number and email of the person to be contacted for consumer complaints. Absence of this declaration is a critical violation.'),
    },
  },
  {
    productName: 'PureHarvest Cold Pressed Oil 1L',
    manufacturer: 'PureHarvest Agro Foods',
    category: 'Food & Beverages',
    batchNumber: 'PH-CP-4420',
    image: '/product-label-oil.png',
    overrides: {
      quantity: field('quantity', 'Net Vol. 1 L', 'compliant', null, null),
      fontSize: field('fontSize', '1.4 mm', 'violation', 'minor', 'The height of the net quantity numerals measures 1.4 mm. Rule 9 prescribes a minimum height of 2 mm for principal display panels of this size. Numerals below the prescribed height reduce legibility for the consumer.'),
    },
  },
  {
    productName: 'FreshMorning Corn Flakes 475g',
    manufacturer: 'FreshMorning Cereals Ltd.',
    category: 'Food & Beverages',
    batchNumber: 'FM-CF-9902',
    image: '/product-label-cereal.png',
    overrides: {
      manufactureDate: field('manufactureDate', null, 'missing', 'critical', 'The month and year of manufacture could not be located on the package. Rule 6(1)(d) requires the month and year in which the commodity was manufactured or pre-packed to be clearly declared. This is a critical omission affecting shelf-life traceability.'),
      origin: field('origin', 'Imported', 'violation', 'major', 'The label states "Imported" without naming the country of origin. Rule 6(1)(g) requires the specific country of origin to be declared for imported/pre-packaged commodities.'),
    },
  },
  {
    productName: 'Velvet Touch Hand Wash 250ml',
    manufacturer: 'CleanCo Household Pvt. Ltd.',
    category: 'Household Care',
    batchNumber: 'CC-HW-3351',
    image: '/product-label-handwash.png',
    overrides: {},
  },
  {
    productName: 'NutriBoost Protein Bar 60g',
    manufacturer: 'NutriBoost Nutrition',
    category: 'Packaged Snacks',
    batchNumber: 'NB-PB-7712',
    image: '/product-label-nuts.png',
    overrides: {
      unitPrice: field('unitPrice', null, 'missing', 'minor', 'Unit sale price was not declared. Rule 18(3) requires the retail sale price per unit of measure to be shown where the commodity is sold by a standard quantity, enabling price comparison across pack sizes.'),
    },
  },
  {
    productName: 'HerbaPure Shampoo 340ml',
    manufacturer: 'HerbaPure Personal Care',
    category: 'Personal Care',
    batchNumber: 'HP-SH-5540',
    image: '/product-label-handwash.png',
    overrides: {
      manufacturer: field('manufacturer', 'HerbaPure', 'violation', 'major', 'Only the brand name is printed. Rule 6(1)(a) requires the complete name and full postal address of the manufacturer, packer or importer. A partial declaration without the address is non-compliant.'),
    },
  },
  {
    productName: 'CrispBite Potato Chips 90g',
    manufacturer: 'CrispBite Snacks Pvt. Ltd.',
    category: 'Packaged Snacks',
    batchNumber: 'CB-PC-8830',
    image: '/product-label-chips.png',
    overrides: {},
  },
  {
    productName: 'AquaPure Mineral Water 1L',
    manufacturer: 'AquaPure Beverages',
    category: 'Food & Beverages',
    batchNumber: 'AP-MW-2201',
    image: '/product-label-oil.png',
    overrides: {
      mrp: field('mrp', 'MRP Rs. 20 (incl. taxes)', 'compliant', null, null),
      commodity: field('commodity', null, 'missing', 'major', 'The generic name of the commodity ("Packaged Drinking Water") is absent; only the brand is shown. Rule 6(1)(b) requires the common or generic name of the commodity to be declared.'),
    },
  },
  {
    productName: 'SoftGlow Body Lotion 200ml',
    manufacturer: 'SoftGlow Skincare Ltd.',
    category: 'Cosmetics',
    batchNumber: 'SG-BL-6690',
    image: '/product-label-serum.png',
    overrides: {},
  },
  {
    productName: 'GoldenFarm Basmati Rice 5kg',
    manufacturer: 'GoldenFarm Exports',
    category: 'Food & Beverages',
    batchNumber: 'GF-BR-1140',
    image: '/product-label-cereal.png',
    overrides: {
      quantity: field('quantity', 'Net Wt. 5 kg', 'compliant', null, null),
    },
  },
  {
    productName: 'BrightSmile Toothpaste 150g',
    manufacturer: 'BrightSmile Oral Care',
    category: 'Personal Care',
    batchNumber: 'BS-TP-9081',
    image: '/product-label-handwash.png',
    overrides: {
      consumerCare: field('consumerCare', 'help@brightsmile.in', 'violation', 'minor', 'Consumer care declaration lists only an email address. Rule 6(1)(f) expects the name of the contact person/department, address and a telephone number in addition to email for effective grievance redressal.'),
    },
  },
]

const inspectorNames = [
  { id: 'INS001', name: 'Rajesh Kumar' },
  { id: 'INS002', name: 'Priya Nair' },
  { id: 'INS003', name: 'Amit Deshmukh' },
  { id: 'INS004', name: 'Sunita Rao' },
]

const dates = [
  '2026-08-26', '2026-08-25', '2026-08-24', '2026-08-22', '2026-08-20',
  '2026-08-18', '2026-08-15', '2026-08-12', '2026-08-09', '2026-08-05',
  '2026-08-02', '2026-07-29',
]

function buildInspection(idx: number): Inspection {
  const src = dataInstances[idx % dataInstances.length]
  const base = compliantFields()
  const fields = base.map((f) => src.overrides[f.key] ?? f)
  const violations = fields.filter((f) => f.status !== 'compliant')
  const score = Math.max(38, 100 - violations.reduce((acc, v) => acc + (v.severity === 'critical' ? 22 : v.severity === 'major' ? 12 : 5), 0))
  const status = violations.length === 0 ? 'compliant' : 'non-compliant'
  const inspector = inspectorNames[idx % inspectorNames.length]
  return {
    id: `INSP-${String(2601 + idx).padStart(4, '0')}`,
    productName: src.productName,
    manufacturer: src.manufacturer,
    category: src.category,
    score,
    status,
    date: dates[idx % dates.length],
    state: STATES[idx % STATES.length],
    batchNumber: src.batchNumber,
    inspectorId: inspector.id,
    inspectorName: inspector.name,
    image: src.image,
    fields,
  }
}

export const INSPECTIONS: Inspection[] = dataInstances.map((_, i) => buildInspection(i))

export const OFFICERS: Officer[] = [
  { id: 'INS001', employeeId: 'INS001', name: 'Rajesh Kumar', role: 'inspector', district: 'Pune', state: 'Maharashtra', active: true, inspectionsThisMonth: 34, avgScore: 82, violationsFound: 41 },
  { id: 'INS002', employeeId: 'INS002', name: 'Priya Nair', role: 'inspector', district: 'Ernakulam', state: 'Kerala', active: true, inspectionsThisMonth: 28, avgScore: 76, violationsFound: 52 },
  { id: 'INS003', employeeId: 'INS003', name: 'Amit Deshmukh', role: 'inspector', district: 'Nagpur', state: 'Maharashtra', active: true, inspectionsThisMonth: 22, avgScore: 88, violationsFound: 19 },
  { id: 'INS004', employeeId: 'INS004', name: 'Sunita Rao', role: 'inspector', district: 'Bengaluru Urban', state: 'Karnataka', active: false, inspectionsThisMonth: 12, avgScore: 71, violationsFound: 33 },
  { id: 'SUP001', employeeId: 'SUP001', name: 'Vikram Menon', role: 'supervisor', district: 'Pune', state: 'Maharashtra', active: true, inspectionsThisMonth: 96, avgScore: 80, violationsFound: 112 },
  { id: 'ADM001', employeeId: 'ADM001', name: 'Anjali Sharma', role: 'admin', district: 'New Delhi', state: 'Delhi', active: true, inspectionsThisMonth: 0, avgScore: 0, violationsFound: 0 },
]

export const PRODUCTS: ProductRecord[] = dataInstances.map((src, i) => {
  const insp = INSPECTIONS[i]
  return {
    id: `PRD-${String(400 + i).padStart(4, '0')}`,
    name: src.productName,
    manufacturer: src.manufacturer,
    category: src.category,
    lastInspection: insp.date,
    score: insp.score,
    status: insp.status,
    history: [
      { date: insp.date, score: insp.score, status: insp.status, inspector: insp.inspectorName },
      { date: '2026-06-14', score: Math.min(100, insp.score + 6), status: insp.score + 6 >= 85 ? 'compliant' : 'non-compliant', inspector: 'Priya Nair' },
      { date: '2026-04-02', score: Math.max(40, insp.score - 9), status: 'non-compliant', inspector: 'Amit Deshmukh' },
    ],
  }
})

export const REPORTS: ReportRecord[] = INSPECTIONS.map((insp, i) => ({
  id: `RPT-${String(9100 + i).padStart(4, '0')}`,
  inspectionId: insp.id,
  product: insp.productName,
  inspector: insp.inspectorName,
  date: insp.date,
  score: insp.score,
  status: insp.status,
}))

/** ---- Analytics aggregates ---- */

export const VIOLATION_BREAKDOWN = [
  { name: 'Critical', value: 18, color: 'var(--danger)' },
  { name: 'Major', value: 34, color: 'var(--warning)' },
  { name: 'Minor', value: 27, color: 'var(--slate)' },
]

export const COMMON_VIOLATIONS = [
  { rule: 'Rule 6(1)(f)', label: 'Missing consumer care details', count: 42 },
  { rule: 'Rule 6(1)(e)', label: 'MRP not marked inclusive of taxes', count: 37 },
  { rule: 'Rule 6(1)(d)', label: 'Manufacture date absent', count: 29 },
  { rule: 'Rule 9', label: 'Numeral height below minimum', count: 21 },
  { rule: 'Rule 6(1)(g)', label: 'Country of origin not specified', count: 16 },
]

export const INSPECTIONS_OVER_TIME = [
  { month: 'Mar', inspections: 210, violations: 88 },
  { month: 'Apr', inspections: 245, violations: 102 },
  { month: 'May', inspections: 268, violations: 119 },
  { month: 'Jun', inspections: 302, violations: 131 },
  { month: 'Jul', inspections: 331, violations: 140 },
  { month: 'Aug', inspections: 358, violations: 152 },
]

export const COMPLIANCE_TREND = [
  { month: 'Mar', rate: 68 },
  { month: 'Apr', rate: 71 },
  { month: 'May', rate: 69 },
  { month: 'Jun', rate: 74 },
  { month: 'Jul', rate: 77 },
  { month: 'Aug', rate: 79 },
]

/** inspection volume by state (used for the choropleth intensity) */
export const STATE_VOLUME: Record<string, number> = {
  Maharashtra: 358,
  Delhi: 291,
  Karnataka: 244,
  'Tamil Nadu': 226,
  Gujarat: 198,
  'Uttar Pradesh': 187,
  'West Bengal': 152,
  Rajasthan: 121,
  Kerala: 176,
  Telangana: 143,
  'Madhya Pradesh': 98,
  Punjab: 87,
  Haryana: 79,
  Bihar: 64,
  Odisha: 52,
}
