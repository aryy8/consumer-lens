import './env'
import bcrypt from 'bcryptjs'
import { db } from '../lib/db'
import { users, inspections, reports } from './schema'
import { DECLARATION_TEMPLATE, STATES } from '../lib/data'
import type { DeclarationField, FieldStatus, ViolationSeverity } from '../lib/types'

// ---------------------------------------------------------------------------
// Demo officers (all use password "demo")
// ---------------------------------------------------------------------------
const USERS = [
  { employeeId: 'INS001', name: 'Rajesh Kumar', role: 'inspector', district: 'Pune', state: 'Maharashtra', active: true },
  { employeeId: 'INS002', name: 'Priya Nair', role: 'inspector', district: 'Ernakulam', state: 'Kerala', active: true },
  { employeeId: 'INS003', name: 'Amit Deshmukh', role: 'inspector', district: 'Nagpur', state: 'Maharashtra', active: true },
  { employeeId: 'INS004', name: 'Sunita Rao', role: 'inspector', district: 'Bengaluru Urban', state: 'Karnataka', active: false },
  { employeeId: 'SUP001', name: 'Vikram Menon', role: 'supervisor', district: 'Pune', state: 'Maharashtra', active: true },
  { employeeId: 'ADM001', name: 'Anjali Sharma', role: 'admin', district: 'New Delhi', state: 'Delhi', active: true },
] as const

const INSPECTOR_IDS = ['INS001', 'INS002', 'INS003', 'INS004']

// ---------------------------------------------------------------------------
// Label field builder (mirrors the original static dataset)
// ---------------------------------------------------------------------------
function field(
  key: string,
  extracted: string | null,
  status: FieldStatus,
  severity: ViolationSeverity | null,
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
  { productName: 'Alpine Roasted Almonds 200g', manufacturer: 'Hindustan Foods Ltd.', category: 'Packaged Snacks', batchNumber: 'HF-AL-2607', image: '/product-label-nuts.png', overrides: {} },
  {
    productName: 'GlowDew Face Serum 30ml', manufacturer: 'Aurelia Cosmetics Pvt. Ltd.', category: 'Cosmetics', batchNumber: 'AC-SR-1183', image: '/product-label-serum.png',
    overrides: {
      mrp: field('mrp', 'MRP Rs. 899', 'violation', 'major', 'The MRP is printed without the mandatory qualifier "inclusive of all taxes". Rule 6(1)(e) requires the retail sale price to be declared as "Maximum Retail Price Rs. ___ inclusive of all taxes" so the consumer understands no additional charges apply.'),
      consumerCare: field('consumerCare', null, 'missing', 'critical', 'No consumer care details were detected on the label. Rule 6(1)(f) mandates the name, address, telephone number and email of the person to be contacted for consumer complaints. Absence of this declaration is a critical violation.'),
    },
  },
  {
    productName: 'PureHarvest Cold Pressed Oil 1L', manufacturer: 'PureHarvest Agro Foods', category: 'Food & Beverages', batchNumber: 'PH-CP-4420', image: '/product-label-oil.png',
    overrides: {
      quantity: field('quantity', 'Net Vol. 1 L', 'compliant', null, null),
      fontSize: field('fontSize', '1.4 mm', 'violation', 'minor', 'The height of the net quantity numerals measures 1.4 mm. Rule 9 prescribes a minimum height of 2 mm for principal display panels of this size. Numerals below the prescribed height reduce legibility for the consumer.'),
    },
  },
  {
    productName: 'FreshMorning Corn Flakes 475g', manufacturer: 'FreshMorning Cereals Ltd.', category: 'Food & Beverages', batchNumber: 'FM-CF-9902', image: '/product-label-cereal.png',
    overrides: {
      manufactureDate: field('manufactureDate', null, 'missing', 'critical', 'The month and year of manufacture could not be located on the package. Rule 6(1)(d) requires the month and year in which the commodity was manufactured or pre-packed to be clearly declared. This is a critical omission affecting shelf-life traceability.'),
      origin: field('origin', 'Imported', 'violation', 'major', 'The label states "Imported" without naming the country of origin. Rule 6(1)(g) requires the specific country of origin to be declared for imported/pre-packaged commodities.'),
    },
  },
  { productName: 'Velvet Touch Hand Wash 250ml', manufacturer: 'CleanCo Household Pvt. Ltd.', category: 'Household Care', batchNumber: 'CC-HW-3351', image: '/product-label-handwash.png', overrides: {} },
  {
    productName: 'NutriBoost Protein Bar 60g', manufacturer: 'NutriBoost Nutrition', category: 'Packaged Snacks', batchNumber: 'NB-PB-7712', image: '/product-label-nuts.png',
    overrides: { unitPrice: field('unitPrice', null, 'missing', 'minor', 'Unit sale price was not declared. Rule 18(3) requires the retail sale price per unit of measure to be shown where the commodity is sold by a standard quantity, enabling price comparison across pack sizes.') },
  },
  {
    productName: 'HerbaPure Shampoo 340ml', manufacturer: 'HerbaPure Personal Care', category: 'Personal Care', batchNumber: 'HP-SH-5540', image: '/product-label-handwash.png',
    overrides: { manufacturer: field('manufacturer', 'HerbaPure', 'violation', 'major', 'Only the brand name is printed. Rule 6(1)(a) requires the complete name and full postal address of the manufacturer, packer or importer. A partial declaration without the address is non-compliant.') },
  },
  { productName: 'CrispBite Potato Chips 90g', manufacturer: 'CrispBite Snacks Pvt. Ltd.', category: 'Packaged Snacks', batchNumber: 'CB-PC-8830', image: '/product-label-chips.png', overrides: {} },
  {
    productName: 'AquaPure Mineral Water 1L', manufacturer: 'AquaPure Beverages', category: 'Food & Beverages', batchNumber: 'AP-MW-2201', image: '/product-label-oil.png',
    overrides: {
      mrp: field('mrp', 'MRP Rs. 20 (incl. taxes)', 'compliant', null, null),
      commodity: field('commodity', null, 'missing', 'major', 'The generic name of the commodity ("Packaged Drinking Water") is absent; only the brand is shown. Rule 6(1)(b) requires the common or generic name of the commodity to be declared.'),
    },
  },
  { productName: 'SoftGlow Body Lotion 200ml', manufacturer: 'SoftGlow Skincare Ltd.', category: 'Cosmetics', batchNumber: 'SG-BL-6690', image: '/product-label-serum.png', overrides: {} },
  {
    productName: 'GoldenFarm Basmati Rice 5kg', manufacturer: 'GoldenFarm Exports', category: 'Food & Beverages', batchNumber: 'GF-BR-1140', image: '/product-label-cereal.png',
    overrides: { quantity: field('quantity', 'Net Wt. 5 kg', 'compliant', null, null) },
  },
  {
    productName: 'BrightSmile Toothpaste 150g', manufacturer: 'BrightSmile Oral Care', category: 'Personal Care', batchNumber: 'BS-TP-9081', image: '/product-label-handwash.png',
    overrides: { consumerCare: field('consumerCare', 'help@brightsmile.in', 'violation', 'minor', 'Consumer care declaration lists only an email address. Rule 6(1)(f) expects the name of the contact person/department, address and a telephone number in addition to email for effective grievance redressal.') },
  },
]

/** Spread 12 seed inspections across ~6 months, most recent at today. */
function seededDate(i: number): string {
  const base = new Date()
  base.setDate(base.getDate() - i * 14)
  return base.toISOString().slice(0, 10)
}

function scoreFor(fields: DeclarationField[]): { score: number; status: 'compliant' | 'non-compliant' } {
  const violations = fields.filter((f) => f.status !== 'compliant')
  const score = Math.max(
    38,
    100 - violations.reduce((acc, v) => acc + (v.severity === 'critical' ? 22 : v.severity === 'major' ? 12 : 5), 0),
  )
  return { score, status: violations.length === 0 ? 'compliant' : 'non-compliant' }
}

async function main() {
  const passwordHash = await bcrypt.hash('demo', 10)

  await db.delete(reports)
  await db.delete(inspections)

  for (const u of USERS) {
    await db
      .insert(users)
      .values({
        employeeId: u.employeeId,
        name: u.name,
        role: u.role,
        district: u.district,
        state: u.state,
        passwordHash,
        active: u.active,
      })
      .onConflictDoUpdate({
        target: users.employeeId,
        set: { name: u.name, role: u.role, district: u.district, state: u.state, active: u.active },
      })
  }

  const allUsers = await db.select().from(users)
  const idByEmployee = new Map(allUsers.map((u) => [u.employeeId, u.id]))

  let count = 0
  for (let i = 0; i < dataInstances.length; i++) {
    const src = dataInstances[i]
    const fields = compliantFields().map((f) => src.overrides[f.key] ?? f)
    const { score, status } = scoreFor(fields)
    const emp = INSPECTOR_IDS[i % INSPECTOR_IDS.length]
    const inspectorId = idByEmployee.get(emp)
    const date = seededDate(i)
    if (!inspectorId) throw new Error(`Missing user id for ${emp}`)

    const [row] = await db
      .insert(inspections)
      .values({
        productName: src.productName,
        manufacturer: src.manufacturer,
        category: src.category,
        score,
        status,
        date,
        state: STATES[i % STATES.length],
        batchNumber: src.batchNumber,
        inspectorId,
        sourceType: 'image',
        image: src.image,
        productLink: null,
        notes: '',
        fields: fields as unknown as unknown[],
      })
      .returning()

    await db.insert(reports).values({
      inspectionId: row.id,
      product: src.productName,
      inspector: USERS.find((u) => u.employeeId === emp)?.name ?? 'Unknown',
      date,
      score,
      status,
    })
    count++
  }

  console.log(`Seeded ${USERS.length} users and ${count} inspections (+ reports).`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
