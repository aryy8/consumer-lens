import jsPDF from 'jspdf'
import type { SavedInspection } from './storage'

// Colors
const NAVY = [18, 32, 60] as const
const AMBER = [217, 119, 6] as const
const GREEN = [34, 120, 74] as const
const RED = [185, 28, 28] as const
const GRAY = [100, 116, 139] as const
const LIGHT_GRAY = [226, 232, 240] as const
const WHITE = [255, 255, 255] as const
const BG = [249, 250, 251] as const

type RGB = readonly [number, number, number]

function severityColor(severity: string | null): RGB {
  if (severity === 'critical') return RED
  if (severity === 'major') return AMBER
  return GRAY
}

function statusColor(status: string): RGB {
  if (status === 'compliant') return GREEN
  if (status === 'violation') return AMBER
  return RED
}

export function generateInspectionPDF(inspection: SavedInspection): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  let y = 0

  // ---- Header Band ----
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 38, 'F')

  // Title
  doc.setTextColor(...WHITE)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Consumer Lens', margin, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Legal Metrology Compliance Report', margin, 22)

  // Report ID & Date on right
  doc.setFontSize(8)
  doc.setTextColor(180, 200, 220)
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - margin, 15, { align: 'right' })
  doc.text(`Inspection ID: ${inspection.id}`, pageWidth - margin, 22, { align: 'right' })

  // Tagline
  doc.setFontSize(7)
  doc.setTextColor(140, 160, 180)
  doc.text('Ministry of Consumer Affairs · Govt. of India', margin, 33)

  y = 46

  // ---- Compliance Score Banner ----
  const scoreBoxWidth = contentWidth
  const scoreBoxHeight = 28
  const isCompliant = inspection.status === 'compliant'

  doc.setFillColor(...BG)
  doc.roundedRect(margin, y, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F')

  // Score
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  const sc = isCompliant ? GREEN : inspection.score >= 60 ? AMBER : RED
  doc.setTextColor(...sc)
  doc.text(String(inspection.score), margin + 8, y + 20)

  // Status text
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT', margin + 35, y + 14)

  const violations = inspection.fields.filter((f) => f.status !== 'compliant')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(
    violations.length === 0
      ? 'All mandatory declarations are present and correctly formatted.'
      : `${violations.length} violation${violations.length > 1 ? 's' : ''} detected across ${inspection.fields.length} checked fields.`,
    margin + 35,
    y + 22
  )

  y += scoreBoxHeight + 10

  // ---- Product Information Section ----
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCT INFORMATION', margin + 4, y + 5)
  y += 11

  const infoRows = [
    ['Product Name', inspection.productName],
    ['Manufacturer', inspection.manufacturer],
    ['Category', inspection.category],
    ['Batch / Lot Number', inspection.batchNumber || '—'],
    ['Inspection State', inspection.state],
    ['Inspection Date', inspection.date],
    ['Inspector', inspection.inspectorName],
    ['Source', inspection.sourceType === 'url' ? 'E-commerce Listing' : 'Product Label Image'],
  ]

  if (inspection.notes) {
    infoRows.push(['Notes', inspection.notes])
  }
  if (inspection.productLink) {
    infoRows.push(['Product URL', inspection.productLink])
  }

  doc.setFontSize(8.5)
  for (let i = 0; i < infoRows.length; i++) {
    const [label, value] = infoRows[i]
    const rowY = y + i * 7

    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250)
      doc.rect(margin, rowY - 1.5, contentWidth, 7, 'F')
    }

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(label, margin + 4, rowY + 3)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    // Truncate long values
    const maxValWidth = contentWidth - 62
    const truncatedVal = doc.getTextWidth(value) > maxValWidth
      ? value.slice(0, 60) + '...'
      : value
    doc.text(truncatedVal, margin + 58, rowY + 3)
  }

  y += infoRows.length * 7 + 8

  // ---- Compliance Analysis Section ----
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPLIANCE ANALYSIS — LMPC RULES, 2011', margin + 4, y + 5)
  y += 11

  // Table header
  doc.setFillColor(230, 235, 240)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('#', margin + 3, y + 5)
  doc.text('FIELD', margin + 10, y + 5)
  doc.text('RULE', margin + 75, y + 5)
  doc.text('STATUS', margin + 100, y + 5)
  doc.text('SEVERITY', margin + 122, y + 5)
  doc.text('EXTRACTED VALUE', margin + 142, y + 5)
  y += 9

  // Field rows
  for (let i = 0; i < inspection.fields.length; i++) {
    const f = inspection.fields[i]
    const rowHeight = f.explanation ? 14 : 7

    // Page break check
    if (y + rowHeight > 270) {
      doc.addPage()
      y = 20
    }

    // Alternate row bg
    if (i % 2 === 0) {
      doc.setFillColor(249, 250, 252)
      doc.rect(margin, y - 1.5, contentWidth, rowHeight, 'F')
    }

    // Left border color for status
    const barColor = statusColor(f.status)
    doc.setFillColor(...barColor)
    doc.rect(margin, y - 1.5, 1.5, rowHeight, 'F')

    doc.setFontSize(7.5)

    // Index
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(String(i + 1), margin + 3, y + 3)

    // Field name
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    const labelText = f.label.length > 28 ? f.label.slice(0, 28) + '…' : f.label
    doc.text(labelText, margin + 10, y + 3)

    // Rule ref
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(f.rule, margin + 75, y + 3)

    // Status badge
    const stColor = statusColor(f.status)
    doc.setFillColor(...stColor)
    doc.roundedRect(margin + 100, y - 0.5, 18, 5, 1, 1, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    const statusLabel = f.status === 'compliant' ? 'PASS' : f.status === 'violation' ? 'VIOLATION' : 'MISSING'
    doc.text(statusLabel, margin + 109, y + 3, { align: 'center' })

    // Severity
    if (f.severity) {
      const sevColor = severityColor(f.severity)
      doc.setTextColor(...sevColor)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.text(f.severity.toUpperCase(), margin + 122, y + 3)
    }

    // Extracted value
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const extractedText = f.extracted
      ? (f.extracted.length > 22 ? f.extracted.slice(0, 22) + '…' : f.extracted)
      : '—'
    doc.text(extractedText, margin + 142, y + 3)

    // Explanation (below row)
    if (f.explanation) {
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      const explLines = doc.splitTextToSize(f.explanation, contentWidth - 14)
      doc.text(explLines.slice(0, 2), margin + 10, y + 8.5)
    }

    y += rowHeight + 1
  }

  y += 6

  // Page break check for summary
  if (y > 245) {
    doc.addPage()
    y = 20
  }

  // ---- Violation Summary ----
  if (violations.length > 0) {
    doc.setFillColor(...NAVY)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('VIOLATION SUMMARY', margin + 4, y + 5)
    y += 11

    const criticalCount = violations.filter((v) => v.severity === 'critical').length
    const majorCount = violations.filter((v) => v.severity === 'major').length
    const minorCount = violations.filter((v) => v.severity === 'minor').length

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')

    // Critical
    if (criticalCount > 0) {
      doc.setFillColor(254, 226, 226)
      doc.roundedRect(margin, y, 55, 14, 2, 2, 'F')
      doc.setTextColor(...RED)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text(String(criticalCount), margin + 6, y + 10)
      doc.setFontSize(8)
      doc.text('Critical', margin + 18, y + 7)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(140, 50, 50)
      doc.text('Immediate action required', margin + 18, y + 12)
    }

    // Major
    if (majorCount > 0) {
      const mX = margin + 60
      doc.setFillColor(254, 243, 199)
      doc.roundedRect(mX, y, 55, 14, 2, 2, 'F')
      doc.setTextColor(...AMBER)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text(String(majorCount), mX + 6, y + 10)
      doc.setFontSize(8)
      doc.text('Major', mX + 18, y + 7)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(140, 90, 20)
      doc.text('Correction needed', mX + 18, y + 12)
    }

    // Minor
    if (minorCount > 0) {
      const mnX = margin + 120
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(mnX, y, 55, 14, 2, 2, 'F')
      doc.setTextColor(...GRAY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text(String(minorCount), mnX + 6, y + 10)
      doc.setFontSize(8)
      doc.text('Minor', mnX + 18, y + 7)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text('Advisory', mnX + 18, y + 12)
    }

    y += 22
  }

  // ---- Footer ----
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)

    // Bottom line
    doc.setDrawColor(...LIGHT_GRAY)
    doc.setLineWidth(0.3)
    doc.line(margin, 282, pageWidth - margin, 282)

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(
      'Generated by Consumer Lens · Legal Metrology (Packaged Commodities) Rules, 2011',
      margin,
      287
    )
    doc.text(
      `Page ${p} of ${pageCount}`,
      pageWidth - margin,
      287,
      { align: 'right' }
    )
  }

  // ---- Save ----
  const filename = `${inspection.productName.replace(/[^a-zA-Z0-9]/g, '_')}_Compliance_Report_${inspection.date}.pdf`
  doc.save(filename)
}
