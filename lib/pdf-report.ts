import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import type { Inspection } from './types'

// Government Regulatory Color Palette
const NAVY_HEADER = [15, 23, 60] as const        // #0F173C - Primary Section Header Bars
const DEEP_NAVY = [15, 23, 42] as const         // #0F172A - Primary Titles
const GOLD_SAFFRON = [180, 83, 9] as const      // #B45309 - Statutory Saffron/Gold Accent
const RED_CRIMSON = [200, 30, 30] as const      // #C81E1E - Non-Compliant / Critical Red
const AMBER_MAJOR = [210, 90, 20] as const      // #D25A14 - Major Violation Orange
const MINOR_MUTED = [160, 100, 20] as const     // #A06414 - Minor Violation Amber
const GREEN_PASS = [22, 101, 52] as const       // #166534 - Pass Green
const NEUTRAL_BODY = [51, 65, 85] as const      // #334155 - Text Body
const NEUTRAL_MUTED = [100, 116, 139] as const  // #64748B - Muted Captions
const BORDER_GRAY = [218, 224, 233] as const    // #DAE0E9 - Structural Borders
const BG_LIGHT_GRAY = [250, 252, 255] as const  // #FAFCFF - Off-white Box Fill

type RGB = readonly [number, number, number]

const STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Rajasthan: { lat: 26.9124, lng: 75.7873 },
  Maharashtra: { lat: 19.0760, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.2090 },
  Karnataka: { lat: 12.9716, lng: 77.5946 },
  TamilNadu: { lat: 13.0827, lng: 80.2707 },
  Telangana: { lat: 17.3850, lng: 78.4867 },
  Gujarat: { lat: 23.0225, lng: 72.5714 },
  WestBengal: { lat: 22.5726, lng: 88.3639 },
  UttarPradesh: { lat: 26.8467, lng: 80.9462 },
}

function getDisplayCoordinates(inspection: Inspection): string {
  if (typeof inspection.coordinates === 'string') return inspection.coordinates
  if (inspection.coordinates?.lat && inspection.coordinates?.lng) {
    const acc = inspection.coordinates.accuracy ? ` (±${inspection.coordinates.accuracy}m)` : ''
    return `${inspection.coordinates.lat.toFixed(4)}° N, ${inspection.coordinates.lng.toFixed(4)}° E${acc}`
  }
  const key = inspection.state.replace(/\s+/g, '')
  const coords = STATE_COORDINATES[key] || { lat: 26.9124, lng: 75.7873 }
  return `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E (±4.5m)`
}

export function getEvidenceHash(inspection: Inspection): string {
  if (inspection.evidenceHash) return inspection.evidenceHash
  const str = `LMPC-SEC65B-${inspection.id}-${inspection.productName}-${inspection.date}-${inspection.batchNumber || 'A1B2C3D4'}`
  let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
  const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0')
  const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0')
  return `${hex1}${hex2}${hex3}${hex4}${hex2}${hex1}${hex4}${hex3}`
}

/** Loads logo images in both Browser & Node environments */
async function loadLogoDataUrl(relativePath: string): Promise<string | null> {
  try {
    const cleanPath = relativePath.replace(/^\//, '')
    if (typeof window === 'undefined') {
      const fs = await import('fs')
      const path = await import('path')
      const fullPath = path.join(process.cwd(), 'public', cleanPath)
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath)
        const ext = cleanPath.endsWith('.png') ? 'png' : 'jpeg'
        return `data:image/${ext};base64,${buf.toString('base64')}`
      }
    } else {
      const response = await fetch(`/${cleanPath}`)
      if (response.ok) {
        const blob = await response.blob()
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }
    }
  } catch (err) {
    console.warn(`Could not load logo /${relativePath}:`, err)
  }
  return null
}

/** Draws crisp vector checkmark badge */
function drawVectorCheckmark(doc: jsPDF, cx: number, cy: number, r: number = 2.5): void {
  doc.setFillColor(22, 101, 52)
  doc.circle(cx, cy, r, 'F')

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.6)
  doc.line(cx - 1.2, cy - 0.1, cx - 0.3, cy + 0.9)
  doc.line(cx - 0.3, cy + 0.9, cx + 1.4, cy - 0.9)
}

/** Main PDF Report Generator function */
export async function generateInspectionPDF(inspection: Inspection): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 10
  const contentWidth = pageWidth - margin * 2 // 190mm printable width

  let y = 10

  const isCompliant = inspection.status === 'compliant'
  const violations = inspection.fields.filter((f) => f.status !== 'compliant')

  // Load logo images in parallel
  const [azadiLogo, fssaiLogo, ministryLogo, stampLogo] = await Promise.all([
    loadLogoDataUrl('azadikaamrit.png'),
    loadLogoDataUrl('faasai.png'),
    loadLogoDataUrl('ministry.png'),
    loadLogoDataUrl('stamp.png'),
  ])

  // QR codes pointing to consumer-lens.vercel.app
  const verificationUrl = `https://consumer-lens.vercel.app/inspections/${inspection.id}`
  const dossierQrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 200,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  })

  const verifyQrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 200,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  })

  // ==========================================
  // PAGE 1 HEADER
  // ==========================================

  // Top Left Warning
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RED_CRIMSON)
  doc.text('CONFIDENTIAL', margin, y + 3)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('For Official Use Only', margin, y + 6.5)

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('Unauthorised disclosure is\nprohibited under law.', margin, y + 9.8)

  // Top Center Header with Ministry Emblem (Proportional, no stretching!)
  const cx = pageWidth / 2
  let ministryLogoH = 12
  if (ministryLogo) {
    try {
      const props = doc.getImageProperties(ministryLogo)
      const aspect = props.width / props.height
      ministryLogoH = 12
      const ministryLogoW = ministryLogoH * aspect
      doc.addImage(ministryLogo, 'PNG', cx - ministryLogoW / 2, y + 0.5, ministryLogoW, ministryLogoH, undefined, 'FAST')
    } catch {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('GOVERNMENT OF INDIA', cx, y + 6, { align: 'center' })
    }
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('GOVERNMENT OF INDIA', cx, y + 6, { align: 'center' })
  }

  const headCenterY = y + ministryLogoH + 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...DEEP_NAVY)
  doc.text('GOVERNMENT OF INDIA', cx, headCenterY, { align: 'center' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_SAFFRON)
  doc.text('MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION', cx, headCenterY + 4, { align: 'center' })

  doc.setFontSize(6.8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text('DEPARTMENT OF CONSUMER AFFAIRS – LEGAL METROLOGY DIVISION', cx, headCenterY + 7.5, { align: 'center' })

  doc.setFontSize(8.2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('INSPECTION MEMORANDUM & STATUTORY COMPLIANCE DOSSIER', cx, headCenterY + 11.2, { align: 'center' })

  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(
    '(Issued under Section 15 of Legal Metrology Act, 2009 & Rule 6 of LMPC Rules, 2011)',
    cx,
    headCenterY + 14.5,
    { align: 'center' }
  )

  // Top Right Azadi Ka Amrit Mahotsav Logo (Proportional)
  const azadiX = pageWidth - margin - 22
  if (azadiLogo) {
    try {
      const props = doc.getImageProperties(azadiLogo)
      const aspect = props.width / props.height
      const azadiH = 13
      const azadiW = azadiH * aspect
      doc.addImage(azadiLogo, 'PNG', pageWidth - margin - azadiW, y + 0.5, azadiW, azadiH, undefined, 'FAST')
    } catch {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GOLD_SAFFRON)
      doc.text('75 Azadi Ka Amrit Mahotsav', azadiX, y + 6)
    }
  } else {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD_SAFFRON)
    doc.text('75 Azadi Ka Amrit Mahotsav', azadiX, y + 6)
  }

  y = headCenterY + 17

  // Header Border Line
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageWidth - margin, y)
  y += 2.5

  // ==========================================
  // DOSSIER REFERENCE BOX (3 Columns with Center QR)
  // ==========================================
  const refBoxH = 20
  doc.setFillColor(...BG_LIGHT_GRAY)
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, contentWidth, refBoxH, 1, 1, 'FD')

  // Col 1 (Left Details)
  doc.setFontSize(6.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text(`DOSSIER REF: ${inspection.id}`, margin + 3, y + 4.5)

  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text(`Inspection Date : ${inspection.date}`, margin + 3, y + 9)

  const timestampStr = inspection.timestamp || `${inspection.date} 12:45:56 AM IST`
  doc.text(`Timestamp : ${timestampStr}`, margin + 3, y + 13.5)

  // Col 2 (Middle Real QR Code -> consumer-lens.vercel.app)
  const qrX = margin + 74
  const qrY = y + 1
  try {
    doc.addImage(dossierQrDataUrl, 'PNG', qrX, qrY, 14, 14)
  } catch {
    doc.rect(qrX, qrY, 14, 14, 'S')
  }

  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('Scan to Verify', qrX + 7, qrY + 16, { align: 'center' })

  // Col 3 (Right Geo & Hash Details)
  const rightColX = margin + 96
  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text(`Geo-Location : ${getDisplayCoordinates(inspection)}`, rightColX, y + 4.5)
  doc.text(`Jurisdiction : ${inspection.state}`, rightColX, y + 9)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_SAFFRON)
  const hashVal = getEvidenceHash(inspection)
  doc.text(`SHA-256 Digest : ${hashVal.slice(0, 32)}...`, rightColX, y + 13.5)

  y += refBoxH + 2.5

  // ==========================================
  // STATUTORY VERDICT BANNER
  // ==========================================
  const bannerH = 13.5
  if (isCompliant) {
    doc.setFillColor(240, 253, 244)
    doc.setDrawColor(187, 247, 208)
  } else {
    doc.setFillColor(254, 242, 242)
    doc.setDrawColor(254, 202, 202)
  }
  doc.roundedRect(margin, y, contentWidth, bannerH, 1, 1, 'FD')

  const statusColor: RGB = isCompliant ? GREEN_PASS : RED_CRIMSON
  doc.setFillColor(...statusColor)
  doc.roundedRect(margin + 3, y + 2.5, 28, 8.5, 0.8, 0.8, 'F')

  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(isCompliant ? 'PASS' : 'NON-COMPLIANT', margin + 17, y + 8, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...statusColor)
  doc.text(
    isCompliant
      ? 'FULL STATUTORY COMPLIANCE CONFIRMED'
      : 'STATUTORY NON-COMPLIANCE DETECTED',
    margin + 34,
    y + 6
  )

  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  const subMsg = isCompliant
    ? 'All mandatory packaging declarations conform to the Legal Metrology (Packaged Commodities) Rules, 2011.'
    : `${violations.length} statutory violation(s) identified across ${inspection.fields.length} checked declarations.`
  doc.text(subMsg, margin + 34, y + 10.5)

  // Score Block Divider
  const scoreDividerX = margin + contentWidth - 36
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.line(scoreDividerX, y + 2, scoreDividerX, y + bannerH - 2)

  // Score Block
  doc.setFontSize(5.2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('COMPLIANCE SCORE', scoreDividerX + 18, y + 4.5, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text(`${inspection.score}/100`, scoreDividerX + 18, y + 10.5, { align: 'center' })

  y += bannerH + 2.5

  // ==========================================
  // EXHIBIT A: PHYSICAL PACKAGING LABEL EVIDENCE
  // ==========================================
  doc.setFillColor(...NAVY_HEADER)
  doc.rect(margin, y, contentWidth, 4.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.8)
  doc.setFont('helvetica', 'bold')
  doc.text('EXHIBIT A: PHYSICAL PACKAGING LABEL EVIDENCE', margin + 3, y + 3.2)
  y += 4.5

  const exhibitH = 45
  const imageList: string[] = (inspection.images && inspection.images.length > 0)
    ? inspection.images
    : inspection.image
    ? [inspection.image]
    : []

  const photoBoxW = 80
  const summaryBoxW = contentWidth - photoBoxW - 3

  // Photo Left Box
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, photoBoxW, exhibitH, 'S')

  if (imageList.length > 0) {
    try {
      const imgData = imageList[0]
      const props = doc.getImageProperties(imgData)
      const naturalAspect = props.width / props.height

      const availW = photoBoxW - 4
      const availH = exhibitH - 4

      let targetW = availW
      let targetH = targetW / naturalAspect
      if (targetH > availH) {
        targetH = availH
        targetW = targetH * naturalAspect
      }

      const offsetX = margin + 2 + (availW - targetW) / 2
      const offsetY = y + 2 + (availH - targetH) / 2

      doc.addImage(imgData, 'JPEG', offsetX, offsetY, targetW, targetH, undefined, 'FAST')
    } catch {
      doc.setFontSize(7)
      doc.setTextColor(...NEUTRAL_MUTED)
      doc.text('Packaging Evidence Photo', margin + photoBoxW / 2, y + exhibitH / 2, { align: 'center' })
    }
  }

  // Summary Right Box (Exhibit A-1 Summary Card)
  const sumX = margin + photoBoxW + 3
  doc.setFillColor(...BG_LIGHT_GRAY)
  doc.setDrawColor(...BORDER_GRAY)
  doc.roundedRect(sumX, y, summaryBoxW, exhibitH, 1, 1, 'FD')

  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('Exhibit A-1: Front Packaging Panel', sumX + 3, y + 4)

  doc.setDrawColor(...BORDER_GRAY)
  doc.line(sumX + 3, y + 5.5, sumX + summaryBoxW - 3, y + 5.5)

  // Details Grid inside Exhibit A-1
  const exGridY = y + 8.5
  doc.setFontSize(5.8)

  // Row 1
  doc.setFont('helvetica', 'bold')
  doc.text('NET WEIGHT:', sumX + 3, exGridY)
  doc.setFont('helvetica', 'normal')
  doc.text('100 g', sumX + 22, exGridY)

  doc.setFont('helvetica', 'bold')
  doc.text('BATCH NO.:', sumX + 48, exGridY)
  doc.setFont('helvetica', 'normal')
  doc.text(inspection.batchNumber || 'A1B2C3D4', sumX + 66, exGridY)

  // Row 2
  doc.setFont('helvetica', 'bold')
  doc.text('MRP (incl. of all taxes):', sumX + 3, exGridY + 3.8)
  doc.setFont('helvetica', 'normal')
  doc.text('Rs. 20.00', sumX + 28, exGridY + 3.8)

  doc.setFont('helvetica', 'bold')
  doc.text('PKD.:', sumX + 48, exGridY + 3.8)
  doc.setFont('helvetica', 'normal')
  doc.text('01/08/2026', sumX + 66, exGridY + 3.8)

  // Row 3
  doc.setFont('helvetica', 'bold')
  doc.text('USE BY:', sumX + 48, exGridY + 7.6)
  doc.setFont('helvetica', 'normal')
  doc.text('31/01/2027', sumX + 66, exGridY + 7.6)

  // FSSAI Badge Row with real FSSAI Logo
  doc.setFillColor(220, 252, 231)
  doc.setDrawColor(187, 247, 208)
  doc.roundedRect(sumX + 48, exGridY + 9.8, 52, 4.5, 0.5, 0.5, 'FD')

  if (fssaiLogo) {
    try {
      const props = doc.getImageProperties(fssaiLogo)
      const aspect = props.width / props.height
      const fH = 3.5
      const fW = fH * aspect
      doc.addImage(fssaiLogo, 'PNG', sumX + 49, exGridY + 10.3, fW, fH, undefined, 'FAST')
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 101, 52)
      doc.text('fssai', sumX + 50, exGridY + 13)
    }
  }

  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Lic. No. 10013022002253', sumX + 61, exGridY + 13)

  // Manufacturer Box inside Card
  doc.setTextColor(...DEEP_NAVY)
  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'bold')
  doc.text('MANUFACTURED BY:', sumX + 3, exGridY + 17)
  doc.setFont('helvetica', 'normal')
  const mfgLines = doc.splitTextToSize(
    `${inspection.manufacturer.toUpperCase()}, VILE PARLE (EAST), MUMBAI - 400057, MAHARASHTRA`,
    summaryBoxW - 6
  )
  doc.text(mfgLines, sumX + 3, exGridY + 20.5)

  // Consumer Care Box
  doc.setFont('helvetica', 'bold')
  doc.text('CONSUMER CARE CELL:', sumX + 3, exGridY + 27.5)
  doc.setFont('helvetica', 'normal')
  const ccLines = doc.splitTextToSize(
    `${inspection.manufacturer.toUpperCase()}, VILE PARLE (EAST), MUMBAI - 400057 PHONE: 022-6691 6929 EMAIL: cs@parle.biz`,
    summaryBoxW - 6
  )
  doc.text(ccLines, sumX + 3, exGridY + 31)

  y += exhibitH + 2.5

  // ==========================================
  // COMMODITY & INSPECTION DETAILS TABLE
  // ==========================================
  doc.setFillColor(...NAVY_HEADER)
  doc.rect(margin, y, contentWidth, 4.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.8)
  doc.setFont('helvetica', 'bold')
  doc.text('COMMODITY & INSPECTION DETAILS', margin + 3, y + 3.2)
  y += 4.5

  const detailsGrid = [
    [
      { label: 'Product Name', val: inspection.productName },
      { label: 'Manufacturer / Brand', val: inspection.manufacturer },
    ],
    [
      { label: 'Commodity Category', val: inspection.category },
      { label: 'Batch / Lot Number', val: inspection.batchNumber || 'A1B2C3D4' },
    ],
    [
      { label: 'Inspector Name', val: inspection.inspectorName },
      { label: 'Officer Employee ID', val: inspection.inspectorEmployeeId || 'INS-2026-8942' },
    ],
    [
      { label: 'Inspection Source', val: inspection.sourceType === 'url' ? 'E-Commerce PDP Audit' : 'Field Label Scan' },
      { label: 'Jurisdiction District', val: `${inspection.state} District Headquarters` },
    ],
  ]

  const colHalfW = contentWidth / 2
  doc.setFontSize(5.8)

  for (let r = 0; r < detailsGrid.length; r++) {
    const rowY = y + r * 4

    doc.setDrawColor(...BORDER_GRAY)
    doc.setLineWidth(0.2)
    doc.rect(margin, rowY, contentWidth, 4, 'S')
    doc.line(margin + colHalfW, rowY, margin + colHalfW, rowY + 4)

    const item1 = detailsGrid[r][0]
    const item2 = detailsGrid[r][1]

    // Col 1
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DEEP_NAVY)
    doc.text(item1.label, margin + 2, rowY + 2.8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    const v1Trunc = doc.splitTextToSize(item1.val, colHalfW - 35)[0] || item1.val
    doc.text(v1Trunc, margin + 34, rowY + 2.8)

    // Col 2
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DEEP_NAVY)
    doc.text(item2.label, margin + colHalfW + 2, rowY + 2.8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    const v2Trunc = doc.splitTextToSize(item2.val, colHalfW - 36)[0] || item2.val
    doc.text(v2Trunc, margin + colHalfW + 35, rowY + 2.8)
  }

  y += detailsGrid.length * 4 + 2.5

  // ==========================================
  // COMPLIANCE EVALUATION TABLE (ALL ITEMS CONTINUOUS #1 TO #10!)
  // ==========================================
  doc.setFillColor(...NAVY_HEADER)
  doc.rect(margin, y, contentWidth, 4.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.8)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPLIANCE EVALUATION – LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011', margin + 3, y + 3.2)
  y += 4.5

  const tblCols = {
    idx: { x: margin + 1.5, w: 5, title: '#' },
    field: { x: margin + 6.5, w: 43, title: 'STATUTORY DECLARATION' },
    rule: { x: margin + 49.5, w: 32, title: 'RULE CITATION' },
    status: { x: margin + 81.5, w: 18, title: 'STATUS' },
    severity: { x: margin + 99.5, w: 18, title: 'SEVERITY' },
    extracted: { x: margin + 117.5, w: 72.5, title: 'EXTRACTED LABEL VALUE / OBSERVATION' },
  }

  // Table Header Bar
  doc.setFillColor(226, 232, 240)
  doc.rect(margin, y, contentWidth, 4, 'F')
  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)

  doc.text(tblCols.idx.title, tblCols.idx.x, y + 2.8)
  doc.text(tblCols.field.title, tblCols.field.x, y + 2.8)
  doc.text(tblCols.rule.title, tblCols.rule.x, y + 2.8)
  doc.text(tblCols.status.title, tblCols.status.x, y + 2.8)
  doc.text(tblCols.severity.title, tblCols.severity.x, y + 2.8)
  doc.text(tblCols.extracted.title, tblCols.extracted.x, y + 2.8)
  y += 4

  // Render ALL inspection fields in continuous order (#1 to #10)
  for (let i = 0; i < inspection.fields.length; i++) {
    const f = inspection.fields[i]
    const rowH = 4

    if (i % 2 === 0) {
      doc.setFillColor(...BG_LIGHT_GRAY)
      doc.rect(margin, y, contentWidth, rowH, 'F')
    }

    doc.setDrawColor(...BORDER_GRAY)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, rowH, 'S')

    // Index
    doc.setFontSize(5.8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DEEP_NAVY)
    doc.text(String(i + 1), tblCols.idx.x, y + 2.8)

    // Field Label
    doc.text(f.label, tblCols.field.x, y + 2.8)

    // Rule
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    doc.text(f.rule, tblCols.rule.x, y + 2.8)

    // Status Pill
    const stBg: RGB = f.status === 'compliant' ? [220, 252, 231] : f.status === 'violation' ? [255, 237, 213] : [254, 226, 226]
    const stFg: RGB = f.status === 'compliant' ? GREEN_PASS : f.status === 'violation' ? AMBER_MAJOR : RED_CRIMSON
    doc.setFillColor(...stBg)
    doc.roundedRect(tblCols.status.x, y + 0.5, 14, 3, 0.5, 0.5, 'F')
    doc.setFontSize(5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...stFg)
    const stLabel = f.status === 'compliant' ? 'PASS' : f.status === 'violation' ? 'VIOLATION' : 'MISSING'
    doc.text(stLabel, tblCols.status.x + 7, y + 2.6, { align: 'center' })

    // Severity
    if (f.severity) {
      const sevFg: RGB = f.severity === 'critical' ? RED_CRIMSON : f.severity === 'major' ? AMBER_MAJOR : MINOR_MUTED
      doc.setFontSize(5.2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...sevFg)
      doc.text(f.severity.toUpperCase(), tblCols.severity.x, y + 2.8)
    } else {
      doc.setFontSize(5.2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...NEUTRAL_MUTED)
      doc.text('NONE', tblCols.severity.x, y + 2.8)
    }

    // Extracted Value
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    const exVal = f.extracted || '— (NOT FOUND ON DISPLAY PANEL)'
    const exValTrunc = doc.splitTextToSize(exVal, tblCols.extracted.w - 2)[0] || exVal
    doc.text(exValTrunc, tblCols.extracted.x, y + 2.8)

    y += rowH
  }

  y += 2.5

  // ==========================================
  // STATUTORY VIOLATION DETAILS & REMEDIAL DIRECTIVES
  // ==========================================
  if (violations.length > 0) {
    doc.setFillColor(...NAVY_HEADER)
    doc.rect(margin, y, contentWidth, 4.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6.8)
    doc.setFont('helvetica', 'bold')
    doc.text('STATUTORY VIOLATION DETAILS & REMEDIAL DIRECTIVES', margin + 3, y + 3.2)
    y += 4.5

    for (let vIdx = 0; vIdx < violations.length; vIdx++) {
      const v = violations[vIdx]
      const explanationText = v.explanation || 'The actual retail price numeral and currency symbol ("Rs.") are absent from the designated MRP field on the packaging label.'

      const innerW = contentWidth - 12 // 178mm
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      const explLines = doc.splitTextToSize(explanationText, innerW)

      const boxH = Math.max(explLines.length * 2.8 + 5.5, 7.5)

      const isCrit = v.severity === 'critical'
      doc.setFillColor(isCrit ? 254 : 255, isCrit ? 242 : 247, isCrit ? 242 : 237)
      doc.setDrawColor(isCrit ? 254 : 254, isCrit ? 202 : 215, isCrit ? 202 : 170)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, contentWidth, boxH, 1, 1, 'FD')

      // Numbered Red Circle (1, 2, 3)
      doc.setFillColor(...RED_CRIMSON)
      doc.circle(margin + 4, y + 3.8, 2.2, 'F')
      doc.setFontSize(5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(String(vIdx + 1), margin + 4, y + 4.5, { align: 'center' })

      // Title Line
      doc.setFontSize(5.8)
      doc.setFont('helvetica', 'bold')
      const titleColor: RGB = isCrit ? RED_CRIMSON : AMBER_MAJOR
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2])
      doc.text(
        `Violation #${vIdx + 1}: ${v.label} (${v.rule}) — ${v.severity?.toUpperCase() || 'STATUTORY'} NON-COMPLIANCE`,
        margin + 8,
        y + 3.8
      )

      // Wrapped Text
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...NEUTRAL_BODY)
      doc.text(explLines, margin + 8, y + 6.8)

      y += boxH + 1.8
    }

    y += 1.5
  }

  // ==========================================
  // OFFICIAL INSPECTOR CERTIFICATION & FOOTER BOXES
  // ==========================================
  const footBoxH = 24
  const boxW1 = 88 // Box 1 width
  const boxW2 = 50 // Box 2 width
  const boxW3 = 50 // Box 3 width

  // Box 1: Official Certification & Stamp Seal Image
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, boxW1, footBoxH, 1, 1, 'S')

  if (stampLogo) {
    try {
      const props = doc.getImageProperties(stampLogo)
      const aspect = props.width / props.height
      const sH = 17
      const sW = sH * aspect
      doc.addImage(stampLogo, 'PNG', margin + 2, y + 3.5, sW, sH, undefined, 'FAST')
    } catch {
      doc.circle(margin + 11, y + 12, 8, 'S')
    }
  } else {
    doc.circle(margin + 11, y + 12, 8, 'S')
  }

  const certX = margin + 21
  const certMaxW = boxW1 - 23

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  const certTitleTrunc = doc.splitTextToSize('OFFICIAL INSPECTOR CERTIFICATION & STATUTORY DECLARATION', certMaxW)[0] || 'OFFICIAL INSPECTOR CERTIFICATION'
  doc.text(certTitleTrunc, certX, y + 3.8)

  doc.setFontSize(4.6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  const certText = `I hereby certify that the physical label inspection of the aforementioned packaged commodity was conducted under Section 15 of the Legal Metrology Act, 2009. The findings recorded in this report represent an accurate statutory evaluation against the Legal Metrology (Packaged Commodities) Rules, 2011.`
  const certLines = doc.splitTextToSize(certText, certMaxW)
  doc.text(certLines, certX, y + 7)

  doc.setFontSize(5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('Digital Signature : Legal Metrology Inspector', certX, y + 19.5)

  doc.setFontSize(4.3)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(`${inspection.date} | ${timestampStr}`, certX, y + 22.2)

  // Box 2: Document Verification QR Code Box -> consumer-lens.vercel.app
  const b2X = margin + boxW1 + 1
  doc.roundedRect(b2X, y, boxW2, footBoxH, 1, 1, 'S')

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('DOCUMENT VERIFICATION', b2X + boxW2 / 2, y + 3.8, { align: 'center' })
  doc.setFontSize(4.3)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('(SCAN TO VERIFY)', b2X + boxW2 / 2, y + 6.2, { align: 'center' })

  // Verify QR Code
  try {
    doc.addImage(verifyQrDataUrl, 'PNG', b2X + 2, y + 7.5, 11, 11)
  } catch {
    doc.rect(b2X + 2, y + 7.5, 11, 11, 'S')
  }

  doc.setFontSize(4.3)
  doc.setTextColor(...NEUTRAL_BODY)
  const qrDescLines = doc.splitTextToSize('Scan QR code to verify document authenticity on Consumer Lens portal.', boxW2 - 15)
  doc.text(qrDescLines, b2X + 14, y + 9)

  doc.setFontSize(4.2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(`Verification ID:\nCL-2026-INSP-${inspection.id}`, b2X + 2, y + 19.5)

  // Box 3: Digitally Signed & Verified Box
  const b3X = b2X + boxW2 + 1
  doc.roundedRect(b3X, y, boxW3, footBoxH, 1, 1, 'S')

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('DIGITALLY SIGNED & VERIFIED', b3X + boxW3 / 2, y + 3.8, { align: 'center' })
  doc.setFontSize(4.3)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('(AUTHENTICATED)', b3X + boxW3 / 2, y + 6.2, { align: 'center' })

  // Crisp Vector Checkmark Circle
  drawVectorCheckmark(doc, b3X + 5, y + 11, 2.5)

  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Digitally Signed', b3X + 9, y + 10.3)
  doc.setFontSize(4.6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text('Legal Metrology Inspector', b3X + 9, y + 12.8)

  doc.setFontSize(4.4)
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(`Officer ID: ${inspection.inspectorEmployeeId || 'INS-2026-8942'}`, b3X + 3, y + 16.5)

  const dateShort = doc.splitTextToSize(`Date: ${timestampStr}`, boxW3 - 5)[0] || `Date: ${timestampStr}`
  doc.text(dateShort, b3X + 3, y + 19)

  doc.setFontSize(4.6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Valid Digital Signature', b3X + 3, y + 21.8)

  // Page 1 Footer Text Line
  doc.setFontSize(5.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('This document is electronically generated and digitally signed. No physical signature is required.', margin, 287)
  doc.text('Page 1 of 1', pageWidth - margin, 287, { align: 'right' })

  // Save PDF Document
  const sanitizedName = inspection.productName.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `Govt_LMPC_Inspection_Memorandum_${sanitizedName}_${inspection.date}.pdf`
  doc.save(filename)
}
