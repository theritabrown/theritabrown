import * as cheerio from 'cheerio'

type JsonObject = Record<string, unknown>

type ProductMetadata = {
  title: string
  description: string
  price: string
  imageUrl: string
  storeName: string
  url: string
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (request.method !== 'GET') {
    return json(405, { description: 'Method not allowed.' })
  }

  const rawUrl = new URL(request.url).searchParams.get('url')

  if (!rawUrl) {
    return json(400, { description: 'Add a product URL to import.' })
  }

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return json(400, { description: 'That URL is not valid.' })
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return json(400, { description: 'Only http and https product URLs can be imported.' })
  }

  try {
    const storeName = hostToStoreName(url.hostname)
    const response = await fetch(url.toString(), {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      if ([401, 403, 429, 503].includes(response.status)) {
        return json(200, fallbackMetadata(url, storeName))
      }

      return json(response.status, {
        description: `The store returned ${response.status}. Add details manually or try another product URL.`,
      })
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const jsonLd = readJsonLd($)
    const product = Array.isArray(jsonLd) ? jsonLd.find(isProductLike) : isProductLike(jsonLd) ? jsonLd : null
    const embeddedProduct = product ?? findEmbeddedProduct($)
    const offers = normalizeOffers(product?.offers)
    const image = firstString(
      embeddedProduct?.image,
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('meta[property="twitter:image"]').attr('content'),
      $('meta[itemprop="image"]').attr('content'),
    )
    const price = firstString(
      offers?.price,
      offers?.lowPrice,
      embeddedProduct?.price,
      $('meta[property="product:price:amount"]').attr('content'),
      $('meta[itemprop="price"]').attr('content'),
    )
    const currency = firstString(offers?.priceCurrency, $('meta[property="product:price:currency"]').attr('content'))
    const title = cleanTitle(
      firstString(
        embeddedProduct?.name,
        $('meta[property="og:title"]').attr('content'),
        $('meta[name="twitter:title"]').attr('content'),
        $('meta[itemprop="name"]').attr('content'),
        $('title').text(),
      ),
      storeName,
    ) || titleFromUrl(url, storeName)
    const description = cleanDescription(
      firstString(
        embeddedProduct?.description,
        $('meta[property="og:description"]').attr('content'),
        $('meta[name="description"]').attr('content'),
        $('meta[name="twitter:description"]').attr('content'),
        $('meta[itemprop="description"]').attr('content'),
      ),
      storeName,
    )

    return json(200, {
      title,
      description,
      price: price ? `${currency === 'USD' || !currency ? '$' : `${currency} `}${price}` : '',
      imageUrl: image ? new URL(image, url).toString() : '',
      storeName,
      url: url.toString(),
    } satisfies ProductMetadata)
  } catch (error) {
    return json(500, {
      description:
        error instanceof Error
          ? error.message
          : 'Could not import this page. Some stores block automated product reads.',
    })
  }
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  })
}

function readJsonLd($: cheerio.CheerioAPI): JsonObject | JsonObject[] | null {
  const scripts: JsonObject[] = []

  $('script[type="application/ld+json"]')
    .toArray()
    .forEach((script) => {
      try {
        const parsed = JSON.parse($(script).text()) as unknown
        const entries = Array.isArray(parsed) ? parsed : [parsed]

        entries.forEach((entry) => {
          if (isJsonObject(entry) && Array.isArray(entry['@graph'])) {
            entry['@graph'].forEach((graphEntry) => {
              if (isJsonObject(graphEntry)) {
                scripts.push(graphEntry)
              }
            })
            return
          }

          if (isJsonObject(entry)) {
            scripts.push(entry)
          }
        })
      } catch {
        return
      }
    })

  return scripts.find(isProductLike) ?? scripts[0] ?? null
}

function findEmbeddedProduct($: cheerio.CheerioAPI): JsonObject | null {
  const candidates: JsonObject[] = []

  $('script')
    .toArray()
    .forEach((script) => {
      const text = $(script).text()

      if (!looksLikeProductScript(text)) {
        return
      }

      parseJsonFragments(text).forEach((fragment) => {
        collectProductCandidates(fragment, candidates)
      })
    })

  return candidates.sort((a, b) => productScore(b) - productScore(a))[0] ?? null
}

function looksLikeProductScript(text: string) {
  return /product|goods|sku|price|image|offer/i.test(text)
}

function parseJsonFragments(text: string): unknown[] {
  const trimmed = text.trim()
  const fragments: unknown[] = []

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      fragments.push(JSON.parse(trimmed) as unknown)
    } catch {
      return fragments
    }
  }

  const assignments = [
    /(?:window\.)?__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*(?:;<\/script>|;?$)/,
    /(?:window\.)?__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*(?:;<\/script>|;?$)/,
    /(?:window\.)?gbRawData\s*=\s*({[\s\S]*?})\s*(?:;<\/script>|;?$)/,
    /(?:window\.)?SHEIN_INITIAL_STATE\s*=\s*({[\s\S]*?})\s*(?:;<\/script>|;?$)/,
  ]

  assignments.forEach((pattern) => {
    const match = trimmed.match(pattern)
    if (!match?.[1]) {
      return
    }

    try {
      fragments.push(JSON.parse(match[1]) as unknown)
    } catch {
      return
    }
  })

  return fragments
}

function collectProductCandidates(value: unknown, candidates: JsonObject[], depth = 0) {
  if (depth > 8) {
    return
  }

  if (Array.isArray(value)) {
    value.slice(0, 80).forEach((item) => collectProductCandidates(item, candidates, depth + 1))
    return
  }

  if (!isJsonObject(value)) {
    return
  }

  const normalized = normalizeProductObject(value)
  if (productScore(normalized) >= 3) {
    candidates.push(normalized)
  }

  Object.values(value).forEach((nestedValue) => collectProductCandidates(nestedValue, candidates, depth + 1))
}

function normalizeProductObject(value: JsonObject): JsonObject {
  const offers = isJsonObject(value.offers) ? value.offers : {}
  return {
    name: firstString(
      value.name,
      value.title,
      value.productName,
      value.product_name,
      value.goodsName,
      value.goods_name,
      value.detailTitle,
    ),
    description: firstString(value.description, value.desc, value.productDesc, value.goods_desc),
    image: firstString(
      value.image,
      value.imageUrl,
      value.image_url,
      value.goods_img,
      value.goodsImg,
      value.mainImage,
      value.main_image,
      value.thumbnail,
      value.thumb,
    ),
    price: firstString(
      value.price,
      value.salePrice,
      value.sale_price,
      value.retailPrice,
      value.retail_price,
      value.unitPrice,
      value.unit_price,
      offers.price,
      offers.lowPrice,
    ),
  }
}

function productScore(value: JsonObject) {
  let score = 0
  if (firstString(value.name).length > 8) score += 2
  if (firstString(value.image)) score += 2
  if (firstString(value.price)) score += 2
  if (firstString(value.description)) score += 1
  return score
}

function isProductLike(value: unknown): value is JsonObject {
  if (!isJsonObject(value)) {
    return false
  }
  const type = value['@type']
  return Array.isArray(type) ? type.includes('Product') : type === 'Product'
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeOffers(value: unknown): JsonObject {
  if (isJsonObject(value)) {
    return value
  }

  if (Array.isArray(value)) {
    return value.find(isJsonObject) ?? {}
  }

  return {}
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstString(...value)
      if (nested) {
        return nested
      }
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function hostToStoreName(hostname: string) {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '')
  const knownStores: Array<[string, string]> = [
    ['shein.com', 'Shein'],
    ['amazon.com', 'Amazon'],
    ['amzn.to', 'Amazon'],
    ['target.com', 'Target'],
    ['walmart.com', 'Walmart'],
    ['walmrt.us', 'Walmart'],
    ['wayfair.com', 'Wayfair'],
    ['hm.com', 'H&M'],
    ['ikea.com', 'IKEA'],
    ['etsy.com', 'Etsy'],
    ['shopltk.com', 'LTK'],
  ]
  const knownStore = knownStores.find(([domain]) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`))

  if (knownStore) {
    return knownStore[1]
  }

  return normalizedHost.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function titleFromUrl(url: URL, storeName: string) {
  const rawSlug = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
    .replace(/\.html?$/i, '')
    .replace(/-p-\d+.*/i, '')
    .replace(/-\d+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!rawSlug) {
    return `${storeName} product`
  }

  if (/^[A-Z0-9]{10}$/i.test(rawSlug)) {
    return `${storeName} product`
  }

  return rawSlug.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function fallbackMetadata(url: URL, storeName: string): ProductMetadata {
  return {
    title: titleFromUrl(url, storeName),
    description: '',
    price: '',
    imageUrl: '',
    storeName,
    url: url.toString(),
  }
}

function cleanTitle(value: string, storeName: string) {
  const title = value
    .replace(/\s*\|\s*SHEIN\s*$/i, '')
    .replace(/\s*\|\s*Amazon\.com\s*$/i, '')
    .replace(/\s*:\s*Target\s*$/i, '')
    .trim()

  if (!title || isGenericStoreTitle(title, storeName)) {
    return ''
  }

  return title
}

function cleanDescription(value: string, storeName: string) {
  return isGenericStoreTitle(value, storeName) ? '' : value
}

function isGenericStoreTitle(value: string, storeName: string) {
  const normalized = value.toLowerCase()
  const normalizedStore = storeName.toLowerCase()

  return (
    normalized === normalizedStore ||
    normalized === `${normalizedStore}.com` ||
    normalized === 'amazon.com' ||
    normalized.includes('shop online fashion') ||
    normalized.includes("women's & men's clothing") ||
    normalized.includes('fashion inspiration') ||
    normalized.includes('official site') ||
    normalized.includes('online shopping site') ||
    normalized.includes('free shipping')
  )
}
