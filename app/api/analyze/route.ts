import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-3.7-flash'

function loadComplianceRules(): string {
  const filePath = join(process.cwd(), 'LMPC_Rules_2011_Compliance.md')
  return readFileSync(filePath, 'utf-8')
}

function buildSystemPrompt(rules: string, sourceType: 'image' | 'url'): string {
  const imageInstructions = `You are a Legal Metrology compliance inspector for the Government of India. You have been given an image of a product label/package. Your job is to carefully examine the label and check it against every applicable rule in the Legal Metrology (Packaged Commodities) Rules, 2011.

Examine the image thoroughly. For each mandatory declaration field, extract the exact text you see on the label (or note that it is absent), determine compliance status, and provide a clear explanation for any violations.`

  const urlInstructions = `You are a Legal Metrology compliance inspector for the Government of India. You have been given the text content of an e-commerce product listing page. Your job is to analyze this listing against Rule 16 (e-Commerce Listing Declarations) and all other applicable rules of the Legal Metrology (Packaged Commodities) Rules, 2011.

Examine the listing text thoroughly. For each mandatory declaration field that should appear in an e-commerce listing, extract the relevant text (or note that it is absent), determine compliance status, and provide a clear explanation for any violations.

IMPORTANT: For e-commerce listings, Rule 16 specifically requires: manufacturer name and address, country of origin (for imports), generic/common name, net quantity, best before/use by date (if applicable), and MRP inclusive of all taxes. Date of manufacture/packing is EXEMPTED from e-commerce listing requirements.`

  return `${sourceType === 'image' ? imageInstructions : urlInstructions}

Here is the complete rule base you must check against:

---
${rules}
---

INSTRUCTIONS:
1. First, check if the product falls under any EXEMPTIONS (Rule 26). If exempt, note it and do not flag violations.
2. For each of the following fields, extract what you find and assess compliance:
   - Manufacturer/Packer/Importer Identity (Rule 1 — Rule 6(1)(a))
   - Generic/Common Name of Commodity (Rule 2 — Rule 6(1)(b))
   - Maximum Retail Price (Rule 3 — Rule 6(1)(c))
   - Date of Manufacture/Packing (Rule 4 — Rule 6(1)(d))${sourceType === 'url' ? ' — EXEMPTED for e-commerce, mark as compliant with note' : ''}
   - Net Quantity (Rule 5 — Rule 6(1)(e))
   - Consumer Care Details (Rule 6 — Rule 6(2))
   - Country of Origin (Rule 7 — for imports only)
   - Best Before/Use By Date (Rule 8 — for perishable products)
   - Unit Sale Price (Rule 9 — Rule 6(11))
${sourceType === 'image' ? '   - Font Size compliance (Rules 10, 11)\n   - Principal Display Panel placement (Rule 12)\n   - Language of Declarations (Rule 14)' : ''}

3. For each field, determine:
   - "compliant" — if the declaration is present and correctly formatted per the rules
   - "violation" — if the declaration is present but has formatting/content issues
   - "missing" — if the declaration is entirely absent when it should be present

4. For severity of violations:
   - "critical" — for rules marked CRITICAL severity in the rule base
   - "major" — for rules marked MAJOR severity
   - "minor" — for rules marked MINOR severity
   - null — for compliant fields

5. Bounding box coordinates (for image analysis):
   - For every field found on the label image, detect its 2D bounding box as [ymin, xmin, ymax, xmax] on a normalized 0 to 1000 integer scale (where ymin=top, xmin=left, ymax=bottom, xmax=right).
   - If the field is missing or not visible on the image, set "box_2d": null.

6. Font Size & Prominence Analysis (Rules 10, 11, Rule 3, Rule 7):
   - For each field, assess whether font height meets minimum prescribed thresholds based on net quantity (<200g: 1mm, 200-500g: 2mm, >500g: 4mm).
   - Check if MRP and Net Quantity are prominently displayed and in bold compared to other text.
   - Check if numeral width is at least 1/3 of numeral height.
   - Set "fontSizeCompliance": { "status": "compliant" | "violation" | "warning", "isBold": boolean, "assessment": "concise explanation" }.

7. Misleading & Deceptive Declarations:
   - Check for stickers pasted over factory-printed MRP, contradictory front vs back claims, non-standard pack sizes under Second Schedule, or deceptive packaging.
   - Set "misleadingFlags": { "isMisleading": boolean, "reason": "concise explanation or null" }.

8. Readability & Print Quality:
   - Provide an overall assessment of packaging print clarity, contrast against background, glare/reflection, and font legibility.
   - Set "readability": { "status": "pass" | "warning" | "fail", "contrastAdequate": boolean, "glareOrBlurDetected": boolean, "notes": "brief plain-language summary" }.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown code fences, no extra text):

{
  "productName": "the product name as identified",
  "manufacturer": "the manufacturer/brand name as identified",
  "readability": {
    "status": "pass",
    "contrastAdequate": true,
    "glareOrBlurDetected": false,
    "notes": "Text is sharp, high-contrast, and clearly legible."
  },
  "fields": [
    {
      "key": "a_unique_key",
      "label": "Human-readable field name",
      "rule": "Rule reference e.g. Rule 6(1)(a)",
      "status": "compliant" | "violation" | "missing",
      "severity": "critical" | "major" | "minor" | null,
      "extracted": "exact text found on label/listing or null if not found",
      "box_2d": [ymin, xmin, ymax, xmax] or null,
      "fontSizeCompliance": {
        "status": "compliant" | "violation" | "warning",
        "isBold": true,
        "assessment": "Meets font height requirement and visual prominence."
      },
      "misleadingFlags": {
        "isMisleading": false,
        "reason": null
      },
      "explanation": "explanation of violation or null if compliant"
    }
  ]
}

Include ALL applicable fields in your response, even compliant ones. Return between 6 and 15 fields depending on what's applicable to this product.`
}

function calculateScore(fields: Array<{ status: string; severity: string | null; misleadingFlags?: { isMisleading: boolean } | null }>): number {
  const violations = fields.filter((f) => f.status !== 'compliant')
  let penalty = violations.reduce((acc, v) => {
    if (v.severity === 'critical') return acc + 22
    if (v.severity === 'major') return acc + 12
    if (v.severity === 'minor') return acc + 5
    return acc
  }, 0)

  // Additional penalty for misleading declarations if not already flagged as critical
  for (const f of fields) {
    if (f.misleadingFlags?.isMisleading && f.severity !== 'critical') {
      penalty += 10
    }
  }

  return Math.max(0, 100 - penalty)
}


function createSSEStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(c) {
      controller = c
    },
  })

  function send(event: string, data: unknown) {
    if (controller) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      controller.enqueue(encoder.encode(payload))
    }
  }

  function close() {
    if (controller) {
      controller.close()
    }
  }

  return { stream, send, close }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPEN_ROUTER_API
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPEN_ROUTER_API environment variable is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { stream, send, close } = createSSEStream()

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })

  // Process in background (non-blocking)
  ;(async () => {
    try {
      const contentType = req.headers.get('content-type') || ''
      let imageBase64: string | null = null
      let listingText: string | null = null
      let sourceType: 'image' | 'url' = 'image'
      let category = ''
      let batchNumber = ''
      let state = ''
      let notes = ''

      if (contentType.includes('multipart/form-data')) {
        // Image upload flow
        const formData = await req.formData()
        const imageFile = formData.get('image') as File | null
        category = (formData.get('category') as string) || ''
        batchNumber = (formData.get('batchNumber') as string) || ''
        state = (formData.get('state') as string) || ''
        notes = (formData.get('notes') as string) || ''
        sourceType = (formData.get('sourceType') as 'image' | 'url') || 'image'

        if (sourceType === 'url') {
          listingText = (formData.get('listingText') as string) || null
        } else {
          if (!imageFile) {
            send('error', { error: 'No image file provided' })
            close()
            return
          }
          const arrayBuffer = await imageFile.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          const mimeType = imageFile.type || 'image/jpeg'
          imageBase64 = `data:${mimeType};base64,${base64}`
        }
      } else {
        // JSON body (for URL-based analysis)
        const body = await req.json()
        sourceType = body.sourceType || 'url'
        listingText = body.listingText || null
        category = body.category || ''
        batchNumber = body.batchNumber || ''
        state = body.state || ''
        notes = body.notes || ''
      }

      // Send progress updates
      send('progress', { step: 1, message: 'Extracting text from label' })
      await new Promise((r) => setTimeout(r, 500))

      // Load rules
      const rules = loadComplianceRules()

      send('progress', { step: 2, message: 'Identifying declaration fields' })
      await new Promise((r) => setTimeout(r, 400))

      // Build the messages for OpenRouter
      const systemPrompt = buildSystemPrompt(rules, sourceType)

      let userContent: unknown[]

      if (sourceType === 'image' && imageBase64) {
        userContent = [
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
          {
            type: 'text',
            text: `Analyze this product label image for Legal Metrology compliance.${category ? ` Product category: ${category}.` : ''}${batchNumber ? ` Batch number: ${batchNumber}.` : ''}${state ? ` Inspection state: ${state}.` : ''}${notes ? ` Inspector notes: ${notes}.` : ''}`,
          },
        ]
      } else if (sourceType === 'url' && listingText) {
        userContent = [
          {
            type: 'text',
            text: `Analyze this e-commerce product listing for Legal Metrology compliance (Rule 16 and all applicable rules).\n\nProduct Listing Content:\n---\n${listingText}\n---\n${category ? `\nProduct category: ${category}.` : ''}${batchNumber ? ` Batch number: ${batchNumber}.` : ''}${state ? ` Inspection state: ${state}.` : ''}${notes ? ` Inspector notes: ${notes}.` : ''}`,
          },
        ]
      } else {
        send('error', { error: 'No image or listing text provided for analysis' })
        close()
        return
      }

      send('progress', { step: 3, message: 'Checking rule compliance against LMPC Rules 2011' })

      // Call OpenRouter API
      let aiResponse: Response | null = null
      let lastError: string | null = null

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          aiResponse = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://consumer-lens.app',
              'X-Title': 'Consumer Lens - Legal Metrology Compliance',
            },
            body: JSON.stringify({
              model: MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.1,
              max_tokens: 4096,
            }),
          })

          if (aiResponse.ok) {
            lastError = null
            break
          }

          const errBody = await aiResponse.text()
          lastError = `OpenRouter API error (${aiResponse.status}): ${errBody}`

          if (aiResponse.status === 429 && attempt < 1) {
            await new Promise((r) => setTimeout(r, 2000))
            continue
          }
          break
        } catch (err) {
          lastError = `Network error: ${(err as Error).message}`
          if (attempt < 1) {
            await new Promise((r) => setTimeout(r, 1500))
          }
        }
      }

      if (lastError || !aiResponse) {
        send('error', { error: lastError || 'Failed to get AI response' })
        close()
        return
      }

      send('progress', { step: 4, message: 'Calculating compliance score' })
      await new Promise((r) => setTimeout(r, 300))

      // Parse the AI response
      const aiData = await aiResponse.json()
      const rawContent = aiData.choices?.[0]?.message?.content

      if (!rawContent) {
        send('error', { error: 'AI returned an empty response. Please try again.' })
        close()
        return
      }

      // Extract JSON from the response (handle potential markdown fencing)
      let jsonStr = rawContent.trim()
      // Remove markdown code fences if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }

      interface RawField {
        key?: string
        label?: string
        rule?: string
        status?: string
        severity?: string | null
        extracted?: string | null
        explanation?: string | null
        box_2d?: [number, number, number, number] | null
        fontSizeCompliance?: {
          status?: string
          isBold?: boolean
          assessment?: string
        } | null
        misleadingFlags?: {
          isMisleading?: boolean
          reason?: string | null
        } | null
      }

      let parsed: {
        productName?: string
        manufacturer?: string
        readability?: {
          status?: string
          contrastAdequate?: boolean
          glareOrBlurDetected?: boolean
          notes?: string
        } | null
        fields?: RawField[]
      }

      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        console.error('Failed to parse AI response:', jsonStr.slice(0, 500))
        send('error', { error: 'AI returned malformed data. Please try again.' })
        close()
        return
      }

      // Validate the parsed response
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        send('error', { error: 'AI response missing fields array. Please try again.' })
        close()
        return
      }

      // Normalize field statuses, bounding boxes, font size, and misleading flags
      const normalizedFields = parsed.fields.map((f, idx) => {
        let box = { x: 0, y: 0, w: 0, h: 0 }
        if (Array.isArray(f.box_2d) && f.box_2d.length === 4) {
          const [ymin, xmin, ymax, xmax] = f.box_2d
          if (
            typeof ymin === 'number' &&
            typeof xmin === 'number' &&
            typeof ymax === 'number' &&
            typeof xmax === 'number'
          ) {
            const top = Math.max(0, Math.min(100, ymin / 10))
            const left = Math.max(0, Math.min(100, xmin / 10))
            const height = Math.max(1, Math.min(100 - top, (ymax - ymin) / 10))
            const width = Math.max(1, Math.min(100 - left, (xmax - xmin) / 10))
            box = {
              x: Number(left.toFixed(1)),
              y: Number(top.toFixed(1)),
              w: Number(width.toFixed(1)),
              h: Number(height.toFixed(1)),
            }
          }
        }

        const fontSizeCompliance = f.fontSizeCompliance
          ? {
              status: (['compliant', 'violation', 'warning'].includes(f.fontSizeCompliance.status || '')
                ? f.fontSizeCompliance.status
                : 'compliant') as 'compliant' | 'violation' | 'warning',
              isBold: Boolean(f.fontSizeCompliance.isBold),
              assessment: f.fontSizeCompliance.assessment || 'Visual font size assessed',
            }
          : null

        const misleadingFlags = f.misleadingFlags
          ? {
              isMisleading: Boolean(f.misleadingFlags.isMisleading),
              reason: f.misleadingFlags.reason || null,
            }
          : null

        return {
          key: f.key || `field_${idx}`,
          label: f.label || 'Unknown Field',
          rule: f.rule || '',
          status: (['compliant', 'violation', 'missing'].includes(f.status || '') ? f.status : 'compliant') as 'compliant' | 'violation' | 'missing',
          severity: (['critical', 'major', 'minor'].includes(f.severity || '') ? f.severity : null) as 'critical' | 'major' | 'minor' | null,
          extracted: f.extracted || null,
          explanation: f.explanation || null,
          box,
          box_2d: f.box_2d || null,
          fontSizeCompliance,
          misleadingFlags,
        }
      })

      const readability = parsed.readability
        ? {
            status: (['pass', 'warning', 'fail'].includes(parsed.readability.status || '')
              ? parsed.readability.status
              : 'pass') as 'pass' | 'warning' | 'fail',
            contrastAdequate: parsed.readability.contrastAdequate !== false,
            glareOrBlurDetected: Boolean(parsed.readability.glareOrBlurDetected),
            notes: parsed.readability.notes || 'Packaging text clarity verified.',
          }
        : {
            status: 'pass' as const,
            contrastAdequate: true,
            glareOrBlurDetected: false,
            notes: 'Packaging declarations are visible and legible.',
          }

      const score = calculateScore(normalizedFields)
      const status = normalizedFields.some((f) => f.status !== 'compliant' || f.misleadingFlags?.isMisleading) ? 'non-compliant' : 'compliant'

      const result = {
        productName: parsed.productName || 'Unknown Product',
        manufacturer: parsed.manufacturer || 'Unknown Manufacturer',
        category: category || 'General',
        score,
        status,
        sourceType,
        fields: normalizedFields,
        readability,
      }


      send('progress', { step: 5, message: 'Analysis complete' })
      await new Promise((r) => setTimeout(r, 200))
      send('result', result)
      close()
    } catch (err) {
      console.error('Analysis error:', err)
      send('error', { error: `Unexpected error: ${(err as Error).message}` })
      close()
    }
  })()

  return response
}
