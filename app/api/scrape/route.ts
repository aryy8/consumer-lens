import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_DOMAINS = [
  'amazon.in',
  'amazon.com',
  'amzn.in',
  'amzn.to',
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
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

function normalizeUrl(inputUrl: string): string {
  let trimmed = inputUrl.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`
  }
  return trimmed
}

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(normalizeUrl(url))
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
  text = text.replace(/&apos;/g, "'")
  text = text.replace(/&#x27;/g, "'")
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
    let clean = titleMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'")
      .replace(/&#039;/g, "'")
      .trim()
    // Remove site suffixes like : Amazon.in
    clean = clean.split(' : Amazon')[0].split(' | Flipkart')[0].trim()
    return clean
  }
  return 'E-commerce Product'
}

/** Extract all product images from Amazon or Flipkart page */
function extractProductImages(html: string): string[] {
  const images: string[] = []

  // 1. Amazon colorImages JSON block (contains the full product gallery)
  const colorImagesMatch = html.match(/'initial'\s*:\s*(?:A\.\$\.parseJSON\('([^']+)'\)|(\[[^\]]+\]))/i)
  if (colorImagesMatch) {
    try {
      const raw = colorImagesMatch[1] || colorImagesMatch[2]
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        for (const item of list) {
          const src = item.hiRes || item.large || (item.main ? Object.keys(item.main)[0] : null)
          if (src && src.startsWith('http') && !images.includes(src)) {
            images.push(src)
          }
        }
      }
    } catch {
      // ignore parse error, fallback to regexes
    }
  }

  // 2. If colorImages didn't find all images, check hiRes and landingImage
  if (images.length === 0) {
    const hiResMatch = html.match(/"hiRes":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i)
    if (hiResMatch?.[1] && !images.includes(hiResMatch[1])) images.push(hiResMatch[1])

    const largeMatch = html.match(/"large":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i)
    if (largeMatch?.[1] && !images.includes(largeMatch[1])) images.push(largeMatch[1])

    const landingImgMatch = html.match(/id="landingImage"[^>]*data-old-hires="([^"]+)"/i)
    if (landingImgMatch?.[1] && landingImgMatch[1].startsWith('http') && !images.includes(landingImgMatch[1])) {
      images.push(landingImgMatch[1])
    }

    const landingSrcMatch = html.match(/id="landingImage"[^>]*src="([^"]+)"/i)
    if (landingSrcMatch?.[1] && landingSrcMatch[1].startsWith('http') && !images.includes(landingSrcMatch[1])) {
      images.push(landingSrcMatch[1])
    }
  }

  // 3. Flipkart image list or OpenGraph fallback
  if (images.length === 0) {
    const flipkartImgMatches = [...html.matchAll(/class="[^"]*_0DkuPH[^"]*"[^>]*src="([^"]+)"/gi)]
    for (const m of flipkartImgMatches) {
      if (m[1] && m[1].startsWith('http') && !images.includes(m[1])) {
        images.push(m[1])
      }
    }

    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (ogImg?.[1] && ogImg[1].startsWith('http') && !images.includes(ogImg[1])) {
      images.push(ogImg[1])
    }
  }

  return images
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

    const targetUrl = normalizeUrl(url)
    const domain = extractDomain(targetUrl)
    if (!domain) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const isSupported = SUPPORTED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))
    if (!isSupported) {
      return NextResponse.json(
        { error: `Unsupported domain: ${domain}. Supported domains include: amazon.in, amzn.in, flipkart.com, blinkit.com, etc.` },
        { status: 400 }
      )
    }

    // Fetch the page with retries and automatic redirect following
    let html = ''
    let lastError: Error | null = null
    let resolvedUrl = targetUrl

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        const response = await fetch(targetUrl, {
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

        resolvedUrl = response.url || targetUrl
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
          error: `Failed to fetch product listing: ${lastError?.message || 'Empty response'}. Please verify the link or try another.`,
        },
        { status: 502 }
      )
    }

    // Determine domain from resolved URL (e.g. amzn.in redirects to amazon.in)
    const finalDomain = extractDomain(resolvedUrl) || domain

    // Extract structured data based on domain
    let extractedText = ''
    if (finalDomain.includes('amazon') || domain.includes('amzn')) {
      extractedText = extractAmazonData(html)
    } else if (finalDomain.includes('flipkart')) {
      extractedText = extractFlipkartData(html)
    }

    // If domain-specific extraction didn't yield much, fall back to full strip
    if (extractedText.length < 200) {
      extractedText = stripHtml(html)
    }

    const title = extractTitle(html)
    const images = extractProductImages(html)
    const image = images.length > 0 ? images[0] : null

    // Truncate to a reasonable size for the AI model
    const maxLength = 14000
    if (extractedText.length > maxLength) {
      extractedText = extractedText.slice(0, maxLength) + '\n\n[... content truncated ...]'
    }

    return NextResponse.json({
      text: extractedText,
      title,
      image,
      images,
      domain: finalDomain,
      resolvedUrl,
    })
  } catch (err) {
    console.error('Scrape error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred while scraping the URL.' },
      { status: 500 }
    )
  }
}
