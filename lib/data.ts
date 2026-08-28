import type { DeclarationField } from './types'

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
