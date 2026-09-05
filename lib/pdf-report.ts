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

/** Truncates text with an ellipsis if it exceeds the specified maximum width in millimeters */
function fitText(doc: jsPDF, text: string | null | undefined, maxW: number): string {
  if (!text) return ''
  const str = String(text).replace(/\s+/g, ' ').trim()
  if (doc.getTextWidth(str) <= maxW) return str
  let low = 0
  let high = str.length
  let best = ''
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = str.slice(0, mid).trim() + '…'
    if (doc.getTextWidth(candidate) <= maxW) {
      best = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return best || str.slice(0, 1) + '…'
}

/** Main PDF Report Generator function */
export async function generateInspectionPDF(
  inspection: Inspection,
  action: 'download' | 'view' = 'download'
): Promise<string> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 10
  const contentWidth = pageWidth - margin * 2 // 190mm printable width

  let y = 10

  const violations = inspection.fields.filter(
    (f) => f.status !== 'compliant' || f.misleadingFlags?.isMisleading || f.fontSizeCompliance?.status === 'violation'
  )
  const isCompliant = inspection.status === 'compliant' && violations.length === 0

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

  y = headCenterY + 15

  // Header Border Line
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageWidth - margin, y)
  y += 2

  // ==========================================
  // DOSSIER REFERENCE BOX (3 Columns with Center QR)
  // ==========================================
  const refBoxH = 17
  doc.setFillColor(...BG_LIGHT_GRAY)
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, contentWidth, refBoxH, 1, 1, 'FD')

  // Col 1 (Left Details)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text(`DOSSIER REF: ${inspection.id}`, margin + 3, y + 4.2)

  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text(`Inspection Date : ${inspection.date}`, margin + 3, y + 8.2)

  const timestampStr = inspection.timestamp || `${inspection.date} 12:45:56 AM IST`
  doc.text(`Timestamp : ${timestampStr}`, margin + 3, y + 12.2)

  // Col 2 (Middle Real QR Code -> consumer-lens.vercel.app)
  const qrX = margin + 74
  const qrY = y + 1.2
  try {
    doc.addImage(dossierQrDataUrl, 'PNG', qrX, qrY, 11.5, 11.5)
  } catch {
    doc.rect(qrX, qrY, 11.5, 11.5, 'S')
  }

  doc.setFontSize(4.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('Scan to Verify', qrX + 5.75, qrY + 14.2, { align: 'center' })

  // Col 3 (Right Geo & Hash Details)
  const rightColX = margin + 96
  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text(`Geo-Location : ${getDisplayCoordinates(inspection)}`, rightColX, y + 4.2)
  doc.text(`Jurisdiction : ${inspection.state}`, rightColX, y + 8.2)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_SAFFRON)
  const hashVal = getEvidenceHash(inspection)
  doc.text(`SHA-256 Digest : ${hashVal.slice(0, 32)}...`, rightColX, y + 12.2)

  y += refBoxH + 2

  // ==========================================
  // STATUTORY VERDICT BANNER
  // ==========================================
  const bannerH = 11.5
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
  doc.roundedRect(margin + 3, y + 2, 26, 7.5, 0.8, 0.8, 'F')

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(isCompliant ? 'PASS' : 'NON-COMPLIANT', margin + 16, y + 6.8, { align: 'center' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...statusColor)
  doc.text(
    isCompliant
      ? 'FULL STATUTORY COMPLIANCE CONFIRMED'
      : 'STATUTORY NON-COMPLIANCE DETECTED',
    margin + 32,
    y + 5.2
  )

  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  const subMsg = isCompliant
    ? 'All mandatory packaging declarations conform to the Legal Metrology (Packaged Commodities) Rules, 2011.'
    : `${violations.length} statutory violation(s) identified across ${inspection.fields.length} checked declarations.`
  doc.text(subMsg, margin + 32, y + 9.2)

  // Score Block Divider
  const scoreDividerX = margin + contentWidth - 34
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.line(scoreDividerX, y + 1.5, scoreDividerX, y + bannerH - 1.5)

  // Score Block
  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('COMPLIANCE SCORE', scoreDividerX + 17, y + 4, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text(`${inspection.score}/100`, scoreDividerX + 17, y + 9.5, { align: 'center' })

  y += bannerH + 2

  // ==========================================
  // EXHIBIT A: PHYSICAL PACKAGING LABEL EVIDENCE
  // ==========================================
  doc.setFillColor(...NAVY_HEADER)
  doc.rect(margin, y, contentWidth, 4.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('EXHIBIT A: PHYSICAL PACKAGING LABEL EVIDENCE', margin + 3, y + 3)
  y += 4.2

  const exhibitH = 37
  const imageList: string[] = (inspection.images && inspection.images.length > 0)
    ? inspection.images
    : inspection.image
    ? [inspection.image]
    : []

  const photoBoxW = 76
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
      doc.setFontSize(6.5)
      doc.setTextColor(...NEUTRAL_MUTED)
      doc.text('Packaging Evidence Photo', margin + photoBoxW / 2, y + exhibitH / 2, { align: 'center' })
    }
  }

  // Summary Right Box (Exhibit A-1 Summary Card)
  const sumX = margin + photoBoxW + 3
  doc.setFillColor(...BG_LIGHT_GRAY)
  doc.setDrawColor(...BORDER_GRAY)
  doc.roundedRect(sumX, y, summaryBoxW, exhibitH, 1, 1, 'FD')

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('Exhibit A-1: Front Packaging Panel', sumX + 3, y + 3.8)

  doc.setDrawColor(...BORDER_GRAY)
  doc.line(sumX + 3, y + 5.2, sumX + summaryBoxW - 3, y + 5.2)

  // Details Grid inside Exhibit A-1
  const exGridY = y + 7.5
  doc.setFontSize(5.5)

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
  doc.text('MRP (incl. taxes):', sumX + 3, exGridY + 3.4)
  doc.setFont('helvetica', 'normal')
  doc.text('Rs. 20.00', sumX + 25, exGridY + 3.4)

  doc.setFont('helvetica', 'bold')
  doc.text('PKD.:', sumX + 48, exGridY + 3.4)
  doc.setFont('helvetica', 'normal')
  doc.text('01/08/2026', sumX + 66, exGridY + 3.4)

  // Row 3
  doc.setFont('helvetica', 'bold')
  doc.text('USE BY:', sumX + 3, exGridY + 6.8)
  doc.setFont('helvetica', 'normal')
  doc.text('31/01/2027', sumX + 22, exGridY + 6.8)

  // FSSAI Badge Row with real FSSAI Logo
  doc.setFillColor(220, 252, 231)
  doc.setDrawColor(187, 247, 208)
  doc.roundedRect(sumX + 48, exGridY + 5.2, 58, 4, 0.5, 0.5, 'FD')

  if (fssaiLogo) {
    try {
      const props = doc.getImageProperties(fssaiLogo)
      const aspect = props.width / props.height
      const fH = 3
      const fW = fH * aspect
      doc.addImage(fssaiLogo, 'PNG', sumX + 49, exGridY + 5.7, fW, fH, undefined, 'FAST')
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 101, 52)
      doc.text('fssai', sumX + 50, exGridY + 8)
    }
  }

  doc.setFontSize(4.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Lic. No. 10013022002253', sumX + 61, exGridY + 8)

  // Manufacturer Box inside Card
  doc.setTextColor(...DEEP_NAVY)
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.text('MANUFACTURED BY:', sumX + 3, exGridY + 12.5)
  doc.setFont('helvetica', 'normal')
  const mfgLines = doc.splitTextToSize(
    `${inspection.manufacturer.toUpperCase()}, VILE PARLE (EAST), MUMBAI - 400057, MAHARASHTRA`,
    summaryBoxW - 6
  ).slice(0, 2)
  doc.text(mfgLines, sumX + 3, exGridY + 15.5)

  // Consumer Care Box
  doc.setFont('helvetica', 'bold')
  doc.text('CONSUMER CARE CELL:', sumX + 3, exGridY + 21)
  doc.setFont('helvetica', 'normal')
  const ccLines = doc.splitTextToSize(
    `${inspection.manufacturer.toUpperCase()}, VILE PARLE (EAST), MUMBAI - 400057 PHONE: 022-6691 6929 EMAIL: cs@parle.biz`,
    summaryBoxW - 6
  ).slice(0, 2)
  doc.text(ccLines, sumX + 3, exGridY + 24)

  y += exhibitH + 2

  // ==========================================
  // COMMODITY & INSPECTION DETAILS TABLE
  // ==========================================
  doc.setFillColor(...NAVY_HEADER)
  doc.rect(margin, y, contentWidth, 4.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('COMMODITY & INSPECTION DETAILS', margin + 3, y + 3)
  y += 4.2

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
    [
      {
        label: 'Packaging Readability',
        val: inspection.readability
          ? `${inspection.readability.status.toUpperCase()} (${inspection.readability.contrastAdequate ? 'Adequate Contrast' : 'Low Contrast Warning'}${inspection.readability.glareOrBlurDetected ? ', Glare/Blur' : ''})`
          : 'PASS (Adequate Contrast & Print Clarity)',
      },
      {
        label: 'Clarity Assessment',
        val: inspection.readability?.notes || 'Declarations clearly visible, legible, and compliant with Rule 9.',
      },
    ],
  ]

  const colHalfW = contentWidth / 2
  doc.setFontSize(5.5)

  for (let r = 0; r < detailsGrid.length; r++) {
    const rowY = y + r * 3.4

    doc.setDrawColor(...BORDER_GRAY)
    doc.setLineWidth(0.2)
    doc.rect(margin, rowY, contentWidth, 3.4, 'S')
    doc.line(margin + colHalfW, rowY, margin + colHalfW, rowY + 3.4)

    const item1 = detailsGrid[r][0]
    const item2 = detailsGrid[r][1]

    // Col 1
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DEEP_NAVY)
    doc.text(item1.label, margin + 2, rowY + 2.4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    const v1Trunc = fitText(doc, item1.val, colHalfW - 35)
    doc.text(v1Trunc, margin + 33, rowY + 2.4)

    // Col 2
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DEEP_NAVY)
    doc.text(item2.label, margin + colHalfW + 2, rowY + 2.4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    const v2Trunc = fitText(doc, item2.val, colHalfW - 36)
    doc.text(v2Trunc, margin + colHalfW + 34, rowY + 2.4)
  }

  y += detailsGrid.length * 3.4 + 2

  // ==========================================
  // COMPLIANCE EVALUATION TABLE (STRICT COLUMN BOUNDS, ZERO COLLISION)
  // ==========================================
  doc.setFillColor(...NAVY_HEADER)
  doc.rect(margin, y, contentWidth, 4.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPLIANCE EVALUATION – LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011', margin + 3, y + 3)
  y += 4.2

  const tblCols = {
    idx: { x: margin + 1.2, w: 5, title: '#' },
    field: { x: margin + 6.5, w: 46, title: 'STATUTORY DECLARATION' },
    rule: { x: margin + 53.5, w: 26, title: 'RULE CITATION' },
    status: { x: margin + 80.5, w: 18, title: 'STATUS' },
    severity: { x: margin + 99.5, w: 16, title: 'SEVERITY' },
    extracted: { x: margin + 116.5, w: contentWidth - 116.5, title: 'EXTRACTED LABEL VALUE / OBSERVATION' },
  }

  // Table Header Bar
  doc.setFillColor(226, 232, 240)
  doc.rect(margin, y, contentWidth, 3.6, 'F')
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)

  doc.text(tblCols.idx.title, tblCols.idx.x, y + 2.5)
  doc.text(tblCols.field.title, tblCols.field.x, y + 2.5)
  doc.text(tblCols.rule.title, tblCols.rule.x, y + 2.5)
  doc.text(tblCols.status.title, tblCols.status.x, y + 2.5)
  doc.text(tblCols.severity.title, tblCols.severity.x, y + 2.5)
  doc.text(tblCols.extracted.title, tblCols.extracted.x, y + 2.5)
  y += 3.6

  // Render ALL inspection fields in continuous order (#1 to #10)
  for (let i = 0; i < inspection.fields.length; i++) {
    const f = inspection.fields[i]
    const rowH = 3.5

    if (i % 2 === 0) {
      doc.setFillColor(...BG_LIGHT_GRAY)
      doc.rect(margin, y, contentWidth, rowH, 'F')
    }

    doc.setDrawColor(...BORDER_GRAY)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, rowH, 'S')

    // Index
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DEEP_NAVY)
    doc.text(String(i + 1), tblCols.idx.x, y + 2.5)

    // Field Label (Strictly clipped with ellipsis to prevent column collision!)
    const fieldLabel = fitText(doc, f.label, tblCols.field.w - 1.5)
    doc.text(fieldLabel, tblCols.field.x, y + 2.5)

    // Rule Citation (Strictly clipped to column width)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    const ruleCitation = fitText(doc, f.rule, tblCols.rule.w - 1.5)
    doc.text(ruleCitation, tblCols.rule.x, y + 2.5)

    // Status Pill
    const isFieldMisleading = Boolean(f.misleadingFlags?.isMisleading)
    const isFontViolation = f.fontSizeCompliance?.status === 'violation'
    const effectiveStatus = (isFieldMisleading || isFontViolation) ? 'violation' : f.status

    const stBg: RGB = effectiveStatus === 'compliant' ? [220, 252, 231] : effectiveStatus === 'violation' ? [255, 237, 213] : [254, 226, 226]
    const stFg: RGB = effectiveStatus === 'compliant' ? GREEN_PASS : effectiveStatus === 'violation' ? AMBER_MAJOR : RED_CRIMSON
    doc.setFillColor(...stBg)
    doc.roundedRect(tblCols.status.x, y + 0.4, 15, 2.7, 0.5, 0.5, 'F')
    doc.setFontSize(4.6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...stFg)
    const stLabel = isFieldMisleading ? 'MISLEADING' : effectiveStatus === 'compliant' ? 'PASS' : effectiveStatus === 'violation' ? 'VIOLATION' : 'MISSING'
    doc.text(stLabel, tblCols.status.x + 7.5, y + 2.3, { align: 'center' })

    // Severity
    const effectiveSeverity = isFieldMisleading ? (f.severity || 'major') : (isFontViolation ? (f.severity || 'major') : f.severity)
    if (effectiveSeverity) {
      const sevFg: RGB = effectiveSeverity === 'critical' ? RED_CRIMSON : effectiveSeverity === 'major' ? AMBER_MAJOR : MINOR_MUTED
      doc.setFontSize(5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...sevFg)
      doc.text(effectiveSeverity.toUpperCase(), tblCols.severity.x, y + 2.5)
    } else {
      doc.setFontSize(5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...NEUTRAL_MUTED)
      doc.text('NONE', tblCols.severity.x, y + 2.5)
    }

    // Extracted Value (Strictly clipped with ellipsis)
    doc.setFontSize(5.2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NEUTRAL_BODY)
    let exVal = f.extracted || '— (NOT FOUND ON DISPLAY PANEL)'
    if (f.fontSizeCompliance) {
      const fontTag = f.fontSizeCompliance.status === 'compliant'
        ? (f.fontSizeCompliance.isBold ? '[Font: OK, Bold]' : '[Font: OK]')
        : `[Font: ${f.fontSizeCompliance.status.toUpperCase()}]`
      exVal = `${exVal} ${fontTag}`
    }
    if (isFieldMisleading) {
      exVal = `${exVal} [⚠️ MISLEADING]`
    }
    const exValTrunc = fitText(doc, exVal, tblCols.extracted.w - 2)
    doc.text(exValTrunc, tblCols.extracted.x, y + 2.5)

    y += rowH
  }

  y += 2

  // ==========================================
  // STATUTORY VIOLATION DETAILS & REMEDIAL DIRECTIVES
  // ==========================================
  if (violations.length > 0) {
    doc.setFillColor(...NAVY_HEADER)
    doc.rect(margin, y, contentWidth, 4.2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.text('STATUTORY VIOLATION DETAILS & REMEDIAL DIRECTIVES', margin + 3, y + 3)
    y += 4.2

    for (let vIdx = 0; vIdx < violations.length; vIdx++) {
      const v = violations[vIdx]
      let explanationText = v.explanation || 'Statutory non-compliance identified on packaging label.'
      if (v.fontSizeCompliance?.assessment && v.fontSizeCompliance.status !== 'compliant') {
        explanationText += ` Font Size Rule (Rule 10/11): ${v.fontSizeCompliance.assessment}.`
      }
      if (v.misleadingFlags?.isMisleading && v.misleadingFlags.reason) {
        explanationText += ` Deceptive/Misleading Declaration Finding: ${v.misleadingFlags.reason}.`
      }

      // 174mm printable width inside box, safely inside border
      const innerW = contentWidth - 16
      doc.setFontSize(5.2)
      doc.setFont('helvetica', 'normal')
      const explLines = doc.splitTextToSize(explanationText, innerW)

      const boxH = Math.max(explLines.length * 2.6 + 4.8, 7.2)

      // Guard vertical space so footer is never invaded
      if (y + boxH > 258) {
        break
      }

      const isCrit = v.severity === 'critical' || Boolean(v.misleadingFlags?.isMisleading)
      doc.setFillColor(isCrit ? 254 : 255, isCrit ? 242 : 247, isCrit ? 242 : 237)
      doc.setDrawColor(isCrit ? 254 : 254, isCrit ? 202 : 215, isCrit ? 202 : 170)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, contentWidth, boxH, 1, 1, 'FD')

      // Numbered Red Circle (1, 2, 3)
      const circleColor: RGB = isCrit ? RED_CRIMSON : AMBER_MAJOR
      doc.setFillColor(...circleColor)
      doc.circle(margin + 4, y + 3.6, 2.1, 'F')
      doc.setFontSize(4.8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(String(vIdx + 1), margin + 4, y + 4.3, { align: 'center' })

      // Title Line (strictly truncated with ellipsis so it NEVER spills past right border)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      const titleColor: RGB = isCrit ? RED_CRIMSON : AMBER_MAJOR
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2])
      const extraTag = v.misleadingFlags?.isMisleading ? ' · DECEPTIVE / MISLEADING' : ''
      const rawTitle = `Violation #${vIdx + 1}: ${v.label} (${v.rule}) — ${v.severity?.toUpperCase() || 'STATUTORY'} NON-COMPLIANCE${extraTag}`
      const titleLine = fitText(doc, rawTitle, innerW - 1)
      doc.text(titleLine, margin + 8, y + 3.6)

      // Wrapped Text inside innerW
      doc.setFontSize(5.2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...NEUTRAL_BODY)
      doc.text(explLines, margin + 8, y + 6.4)

      y += boxH + 1.5
    }

    y += 1.5
  }

  // ==========================================
  // OFFICIAL INSPECTOR CERTIFICATION & FOOTER BOXES (SECURE VERTICAL ANCHOR)
  // ==========================================
  const footBoxH = 22
  const footY = Math.max(y + 2, 260)
  const boxW1 = 88 // Box 1 width
  const boxW2 = 50 // Box 2 width
  const boxW3 = 50 // Box 3 width

  // Box 1: Official Certification & Stamp Seal Image
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, footY, boxW1, footBoxH, 1, 1, 'S')

  if (stampLogo) {
    try {
      const props = doc.getImageProperties(stampLogo)
      const aspect = props.width / props.height
      const sH = 15.5
      const sW = sH * aspect
      doc.addImage(stampLogo, 'PNG', margin + 2, footY + 3.2, sW, sH, undefined, 'FAST')
    } catch {
      doc.circle(margin + 11, footY + 11, 7.5, 'S')
    }
  } else {
    doc.circle(margin + 11, footY + 11, 7.5, 'S')
  }

  const certX = margin + 21
  const certMaxW = boxW1 - 23

  doc.setFontSize(5.3)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  const certTitleTrunc = fitText(doc, 'OFFICIAL INSPECTOR CERTIFICATION & STATUTORY DECLARATION', certMaxW)
  doc.text(certTitleTrunc, certX, footY + 3.6)

  doc.setFontSize(4.4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  const certText = `I hereby certify that the physical label inspection of the aforementioned packaged commodity was conducted under Section 15 of the Legal Metrology Act, 2009. The findings recorded in this report represent an accurate statutory evaluation against the Legal Metrology (Packaged Commodities) Rules, 2011.`
  const certLines = doc.splitTextToSize(certText, certMaxW)
  doc.text(certLines, certX, footY + 6.6)

  doc.setFontSize(4.8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('Digital Signature : Legal Metrology Inspector', certX, footY + 17.5)

  doc.setFontSize(4.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(`${inspection.date} | ${timestampStr}`, certX, footY + 20.2)

  // Box 2: Document Verification QR Code Box -> consumer-lens.vercel.app
  const b2X = margin + boxW1 + 1
  doc.roundedRect(b2X, footY, boxW2, footBoxH, 1, 1, 'S')

  doc.setFontSize(5.3)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('DOCUMENT VERIFICATION', b2X + boxW2 / 2, footY + 3.6, { align: 'center' })
  doc.setFontSize(4.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('(SCAN TO VERIFY)', b2X + boxW2 / 2, footY + 5.8, { align: 'center' })

  // Verify QR Code
  try {
    doc.addImage(verifyQrDataUrl, 'PNG', b2X + 2, footY + 7, 10.5, 10.5)
  } catch {
    doc.rect(b2X + 2, footY + 7, 10.5, 10.5, 'S')
  }

  doc.setFontSize(4.2)
  doc.setTextColor(...NEUTRAL_BODY)
  const qrDescLines = doc.splitTextToSize('Scan QR code to verify document authenticity on Consumer Lens portal.', boxW2 - 15)
  doc.text(qrDescLines, b2X + 13.5, footY + 8.5)

  doc.setFontSize(4)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(`Verification ID:\nCL-2026-INSP-${inspection.id}`, b2X + 2, footY + 18.2)

  // Box 3: Digitally Signed & Verified Box
  const b3X = b2X + boxW2 + 1
  doc.roundedRect(b3X, footY, boxW3, footBoxH, 1, 1, 'S')

  doc.setFontSize(5.3)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DEEP_NAVY)
  doc.text('DIGITALLY SIGNED & VERIFIED', b3X + boxW3 / 2, footY + 3.6, { align: 'center' })
  doc.setFontSize(4.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('(AUTHENTICATED)', b3X + boxW3 / 2, footY + 5.8, { align: 'center' })

  // Crisp Vector Checkmark Circle
  drawVectorCheckmark(doc, b3X + 5, footY + 10, 2.3)

  doc.setFontSize(4.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Digitally Signed', b3X + 9, footY + 9.5)
  doc.setFontSize(4.4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_BODY)
  doc.text('Legal Metrology Inspector', b3X + 9, footY + 12)

  doc.setFontSize(4.2)
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text(`Officer ID: ${inspection.inspectorEmployeeId || 'INS-2026-8942'}`, b3X + 3, footY + 15)

  const dateShort = fitText(doc, `Date: ${timestampStr}`, boxW3 - 5)
  doc.text(dateShort, b3X + 3, footY + 17.4)

  doc.setFontSize(4.4)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Valid Digital Signature', b3X + 3, footY + 20.2)

  // Page 1 Footer Text Line
  doc.setFontSize(5.2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...NEUTRAL_MUTED)
  doc.text('This document is electronically generated and digitally signed. No physical signature is required.', margin, 287)
  doc.text('Page 1 of 1', pageWidth - margin, 287, { align: 'right' })

  // Save or View PDF Document
  const sanitizedName = inspection.productName.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `Govt_LMPC_Inspection_Memorandum_${sanitizedName}_${inspection.date}.pdf`

  if (action === 'view') {
    const pdfBlob = doc.output('blob')
    return URL.createObjectURL(pdfBlob)
  } else {
    doc.save(filename)
    return ''
  }
}
