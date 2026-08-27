import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_DOMAINS = [
  'amazon.in',
  'amazon.com',
  'flipkart.com',
  'myntra.com',
  'jiomart.com',
  'bigbasket.com',
  'blinkit.com',
  'nykaa.com',
  'meesho.com',
  'snapdeal.com',
]

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    return host
  } catch {
    return null
  }
}

function stripHtml(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
  
  // Replace common block elements with newlines
  text = text.replace(/<\/?(?:div|p|br|hr|h[1-6]|li|tr|td|th|section|article|header|footer|main|nav)[^>]*>/gi, '\n')
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#039;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&#x20B9;/g, '₹')
  text = text.replace(/&#8377;/g, '₹')
  text = text.replace(/&rarr;/g, '→')
  
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n\s*\n/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  
  return text.trim()
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch) {
    return titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
  }
  return 'Unknown Product'
}

/** Extract structured product info from Amazon pages */
function extractAmazonData(html: string): string {
  const sections: string[] = []
  
  // Product title
  const titleMatch = html.match(/id="productTitle"[^>]*>(.*?)<\/span>/is)
  if (titleMatch) sections.push(`Product Title: ${titleMatch[1].trim()}`)
  
  // Brand
  const brandMatch = html.match(/id="bylineInfo"[^>]*>(.*?)<\/a>/is)
  if (brandMatch) sections.push(`Brand: ${stripHtml(brandMatch[1]).trim()}`)
  
  // Price
  const priceMatch = html.match(/class="a-price-whole"[^>]*>([\d,]+)/i)
  if (priceMatch) sections.push(`Price: ₹${priceMatch[1]}`)
  
  // Product details / technical specifications table
  const detailsMatch = html.match(/id="productDetails_techSpec_section_1"[\s\S]*?<\/table>/i)
  if (detailsMatch) sections.push(`Technical Details:\n${stripHtml(detailsMatch[0])}`)

  const detailsMatch2 = html.match(/id="detailBullets_feature_div"[\s\S]*?<\/div>/i)
  if (detailsMatch2) sections.push(`Product Details:\n${stripHtml(detailsMatch2[0])}`)
  
  // Important info / "About this item" section
  const aboutMatch = html.match(/id="feature-bullets"[\s\S]*?<\/div>/i)
  if (aboutMatch) sections.push(`About This Item:\n${stripHtml(aboutMatch[0])}`)
  
  // Product description
  const descMatch = html.match(/id="productDescription"[\s\S]*?<\/div>/i)
  if (descMatch) sections.push(`Description:\n${stripHtml(descMatch[0])}`)
  
  // Product information section (contains MRP, manufacturer, etc.)
  const prodInfoMatch = html.match(/id="productDetails_db_sections"[\s\S]*?<\/div>/i)
  if (prodInfoMatch) sections.push(`Product Information:\n${stripHtml(prodInfoMatch[0])}`)
  
  // Additional info table
  const additionalMatch = html.match(/id="productDetails_detailBullets_sections1"[\s\S]*?<\/table>/i)
  if (additionalMatch) sections.push(`Additional Information:\n${stripHtml(additionalMatch[0])}`)
  
  return sections.join('\n\n')
}

/** Extract structured product info from Flipkart pages */
function extractFlipkartData(html: string): string {
  const sections: string[] = []
  
  // Product title
  const titleMatch = html.match(/class="VU-ZEz"[^>]*>(.*?)<\/span>/is) || 
                     html.match(/class="B_NuCI"[^>]*>(.*?)<\/span>/is)
  if (titleMatch) sections.push(`Product Title: ${titleMatch[1].trim()}`)
  
  // Price
  const priceMatch = html.match(/class="Nx9bqj CxhGGd"[^>]*>(.*?)<\/div>/is) ||
                     html.match(/class="_30jeq3 _16Jk6d"[^>]*>(.*?)<\/div>/is)
  if (priceMatch) sections.push(`Price: ${stripHtml(priceMatch[1]).trim()}`)
  
  // Specifications/details tables
  const specMatches = html.match(/class="WJdYP6[^"]*"[\s\S]*?<\/table>/gi)
  if (specMatches) {
    sections.push(`Specifications:\n${specMatches.map(s => stripHtml(s)).join('\n')}`)
  }
  
  // Product description
  const descMatch = html.match(/class="_1mXcCf"[\s\S]*?<\/div>/i)
  if (descMatch) sections.push(`Description:\n${stripHtml(descMatch[0])}`)
  
  return sections.join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const domain = extractDomain(url)
    if (!domain) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const isSupported = SUPPORTED_DOMAINS.some((d) => domain.endsWith(d))
    if (!isSupported) {
      return NextResponse.json(
        { error: `Unsupported domain: ${domain}. Supported: ${SUPPORTED_DOMAINS.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch the page with retries
    let html = ''
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
          redirect: 'follow',
        })

        clearTimeout(timeout)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        html = await response.text()
        lastError = null
        break
      } catch (err) {
        lastError = err as Error
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    }

    if (lastError || !html) {
      return NextResponse.json(
        {
          error: `Failed to fetch the page. ${lastError?.message || 'Empty response'}. Try uploading a screenshot of the product listing instead.`,
        },
        { status: 502 }
      )
    }

    // Extract structured data based on domain
    let extractedText = ''
    if (domain.includes('amazon')) {
      extractedText = extractAmazonData(html)
    } else if (domain.includes('flipkart')) {
      extractedText = extractFlipkartData(html)
    }

    // If domain-specific extraction didn't yield much, fall back to full strip
    if (extractedText.length < 200) {
      extractedText = stripHtml(html)
    }

    const title = extractTitle(html)

    // Truncate to a reasonable size for the AI model
    const maxLength = 12000
    if (extractedText.length > maxLength) {
      extractedText = extractedText.slice(0, maxLength) + '\n\n[... content truncated ...]'
    }

    return NextResponse.json({
      text: extractedText,
      title,
      domain,
    })
  } catch (err) {
    console.error('Scrape error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred while scraping the URL.' },
      { status: 500 }
    )
  }
}
