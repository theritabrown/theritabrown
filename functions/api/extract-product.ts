import * as cheerio from 'cheerio'

type JsonObject = Record<string, unknown>

type ProductMetadata = {
  title: string
  description: string
  price: string
  imageUrl: string
  storeName: string
  category: string
  url: string
  imageWarning?: string
}

type ExtractEnv = {
  SEARCHAPI_API_KEY?: string
  SHEIN_SEARCH_API_KEY?: string
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const onRequest: PagesFunction<ExtractEnv> = async ({ request, env }) => {
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
    const sheinMetadata = await importSheinProduct(url, storeName, env)

    if (sheinMetadata?.imageUrl) {
      return json(200, sheinMetadata satisfies ProductMetadata)
    }

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
        return json(200, sheinMetadata ?? fallbackMetadata(url, storeName))
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
    const price = firstText(
      offers?.price,
      offers?.lowPrice,
      embeddedProduct?.price,
      embeddedProduct?.salePrice,
      embeddedProduct?.retailPrice,
      embeddedProduct?.unitPrice,
      $('meta[property="product:price:amount"]').attr('content'),
      $('meta[itemprop="price"]').attr('content'),
    )
    const currency = firstString(offers?.priceCurrency, $('meta[property="product:price:currency"]').attr('content'))
    const category = cleanCategory(firstCategory(
      embeddedProduct?.category,
      product?.category,
      $('meta[property="product:category"]').attr('content'),
      $('meta[name="product:category"]').attr('content'),
      $('meta[itemprop="category"]').attr('content'),
      readBreadcrumbCategory($),
    ))
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
      title: sheinMetadata?.title || title,
      description,
      price: formatPrice(price, currency),
      imageUrl: image ? new URL(image, url).toString() : sheinMetadata?.imageUrl || '',
      storeName,
      category: sheinMetadata?.category || category,
      url: url.toString(),
      imageWarning: image || sheinMetadata?.imageUrl ? undefined : sheinMetadata?.imageWarning,
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
      value.images,
      value.productImages,
      value.product_images,
      value.gallery,
      value.galleryImages,
      value.gallery_images,
      value.imageUrl,
      value.image_url,
      value.goods_img,
      value.goodsImg,
      value.mainImage,
      value.main_image,
      value.thumbnail,
      value.thumb,
    ),
    price: firstText(
      value.price,
      value.salePrice,
      value.sale_price,
      value.retailPrice,
      value.retail_price,
      value.unitPrice,
      value.unit_price,
      value.priceAmount,
      value.price_amount,
      value.minPrice,
      value.min_price,
      value.currentPrice,
      value.current_price,
      offers.price,
      offers.lowPrice,
    ),
    category: firstCategory(
      value.category,
      value.categories,
      value.productCategory,
      value.product_category,
      value.categoryName,
      value.category_name,
      value.catName,
      value.cat_name,
      value.breadcrumb,
      value.breadcrumbs,
      value.breadCrumbs,
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

function readBreadcrumbCategory($: cheerio.CheerioAPI) {
  const linkedBreadcrumb = $('[itemtype*="BreadcrumbList"] [itemprop="itemListElement"]')
    .toArray()
    .map((element) => {
      const name = $(element).find('[itemprop="name"]').first().text()
      return name.trim()
    })
    .filter(Boolean)

  if (linkedBreadcrumb.length) {
    return linkedBreadcrumb
  }

  const jsonLdBreadcrumb = readJsonLdBreadcrumb($)
  if (jsonLdBreadcrumb.length) {
    return jsonLdBreadcrumb
  }

  return []
}

function readJsonLdBreadcrumb($: cheerio.CheerioAPI) {
  const breadcrumbs: string[] = []

  $('script[type="application/ld+json"]')
    .toArray()
    .forEach((script) => {
      try {
        const parsed = JSON.parse($(script).text()) as unknown
        collectBreadcrumbs(parsed, breadcrumbs)
      } catch {
        return
      }
    })

  return breadcrumbs
}

function collectBreadcrumbs(value: unknown, breadcrumbs: string[], depth = 0) {
  if (depth > 6) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectBreadcrumbs(item, breadcrumbs, depth + 1))
    return
  }

  if (!isJsonObject(value)) {
    return
  }

  const type = value['@type']
  const isBreadcrumb = Array.isArray(type) ? type.includes('BreadcrumbList') : type === 'BreadcrumbList'

  if (isBreadcrumb && Array.isArray(value.itemListElement)) {
    value.itemListElement.forEach((item) => {
      const name = isJsonObject(item)
        ? firstString(item.name, isJsonObject(item.item) ? item.item.name : undefined)
        : ''

      if (name) {
        breadcrumbs.push(name)
      }
    })
  }

  Object.values(value).forEach((nestedValue) => collectBreadcrumbs(nestedValue, breadcrumbs, depth + 1))
}

async function importSheinProduct(url: URL, storeName: string, env: ExtractEnv): Promise<ProductMetadata | null> {
  if (storeName !== 'Shein') {
    return null
  }

  const productId = sheinProductId(url)
  const apiKey = env.SHEIN_SEARCH_API_KEY || env.SEARCHAPI_API_KEY

  if (!productId) {
    return fallbackMetadata(url, storeName, 'Could not read the Shein product id from this URL.')
  }

  if (!apiKey) {
    return fallbackMetadata(url, storeName, 'SHEIN_SEARCH_API_KEY was not available to Cloudflare Pages.')
  }

  const apiUrl = new URL('https://www.searchapi.io/api/v1/search')
  apiUrl.searchParams.set('engine', 'shein_product')
  apiUrl.searchParams.set('product_id', productId)
  apiUrl.searchParams.set('shein_domain', sheinDomain(url))
  apiUrl.searchParams.set('api_key', apiKey)

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'RitaBrownProductImporter/1.0',
      },
    })

    if (!response.ok) {
      return (
        (await searchSheinImageFallback(url, storeName, apiKey)) ??
        fallbackMetadata(url, storeName, `SearchApi could not import this Shein product (status ${response.status}).`)
      )
    }

    const payload = (await response.json()) as unknown
    const candidates: JsonObject[] = []

    if (isJsonObject(payload) && isJsonObject(payload.product)) {
      candidates.push(normalizeProductObject(payload.product))
    }

    collectProductCandidates(payload, candidates)
    const product = candidates.sort((a, b) => productScore(b) - productScore(a))[0]

    if (!product) {
      return (
        (await searchSheinImageFallback(url, storeName, apiKey)) ??
        fallbackMetadata(url, storeName, 'SearchApi responded, but no Shein product data was found.')
      )
    }

    const imageUrl = firstString(product.image)
    const price = firstString(product.price)

    if (!imageUrl) {
      return (
        (await searchSheinImageFallback(url, storeName, apiKey)) ??
        fallbackMetadata(url, storeName, 'SearchApi responded, but no Shein product image was found.')
      )
    }

    return {
      title: cleanTitle(firstString(product.name), storeName) || titleFromUrl(url, storeName),
      description: cleanDescription(firstString(product.description), storeName),
      price: formatPrice(price, ''),
      imageUrl: imageUrl ? new URL(imageUrl, url).toString() : '',
      storeName,
      category: cleanCategory(firstCategory(product.category)),
      url: url.toString(),
    }
  } catch {
    return (
      (await searchSheinImageFallback(url, storeName, apiKey)) ??
      fallbackMetadata(url, storeName, 'SearchApi could not import this Shein product right now.')
    )
  }
}

async function searchSheinImageFallback(
  url: URL,
  storeName: string,
  apiKey: string,
): Promise<ProductMetadata | null> {
  const title = titleFromUrl(url, storeName)

  if (!title || title === `${storeName} product`) {
    return null
  }

  const apiUrl = new URL('https://www.searchapi.io/api/v1/search')
  apiUrl.searchParams.set('engine', 'google_images')
  apiUrl.searchParams.set('q', `"${title}" SHEIN`)
  apiUrl.searchParams.set('api_key', apiKey)

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'RitaBrownProductImporter/1.0',
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as unknown
    const image = firstTrustedSheinImage(payload)

    if (!image) {
      return null
    }

    return {
      title,
      description: '',
      price: '',
      imageUrl: image,
      storeName,
      category: '',
      url: url.toString(),
      imageWarning: 'Shein product API was unavailable, so the image was imported from a matching Shein image result.',
    }
  } catch {
    return null
  }
}

function firstTrustedSheinImage(value: unknown): string {
  if (!isJsonObject(value) || !Array.isArray(value.images)) {
    return ''
  }

  for (const result of value.images) {
    if (!isJsonObject(result)) {
      continue
    }

    const source = isJsonObject(result.source) ? result.source : {}
    const original = isJsonObject(result.original) ? result.original : {}
    const sourceLink = firstString(source.link)
    const sourceName = firstString(source.name)
    const imageUrl = firstString(original.link, result.original)

    if (imageUrl && isSheinImageResult(sourceLink, sourceName, imageUrl)) {
      return imageUrl
    }
  }

  return ''
}

function isSheinImageResult(sourceLink: string, sourceName: string, imageUrl: string) {
  const haystack = `${sourceLink} ${sourceName} ${imageUrl}`.toLowerCase()
  return haystack.includes('shein') || haystack.includes('ltwebstatic.com')
}

function sheinProductId(url: URL) {
  return url.pathname.match(/-p-(\d+)/i)?.[1] ?? url.searchParams.get('goods_id') ?? url.searchParams.get('product_id')
}

function sheinDomain(url: URL) {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  return hostname.endsWith('shein.com') || hostname.endsWith('shein.co.uk') ? hostname : 'us.shein.com'
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
    if (isJsonObject(value)) {
      const nested = firstString(
        value.url,
        value.src,
        value.href,
        value.image,
        value.imageUrl,
        value.image_url,
        value.thumbnail,
      )
      if (nested) {
        return nested
      }
    }
  }
  return ''
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstText(...value)
      if (nested) {
        return nested
      }
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (isJsonObject(value)) {
      const nested = firstText(
        value.amount,
        value.value,
        value.text,
        value.label,
        value.displayValue,
        value.display_value,
        value.formatted,
        value.formattedPrice,
        value.formatted_price,
        value.current,
        value.sale,
        value.final,
      )

      if (nested) {
        return nested
      }
    }
  }

  return ''
}

function firstCategory(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const entries = value
        .map((item) => firstCategory(item))
        .filter((item) => item && !isGenericCategory(item))

      if (entries.length) {
        return entries[entries.length - 1]
      }
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }

    if (isJsonObject(value)) {
      const nested = firstCategory(
        value.name,
        value.title,
        value.label,
        value.text,
        value.category,
        value.categoryName,
        value.category_name,
        value.catName,
        value.cat_name,
        value.breadcrumb,
        value.breadcrumbs,
      )

      if (nested) {
        return nested
      }
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

function fallbackMetadata(url: URL, storeName: string, imageWarning?: string): ProductMetadata {
  return {
    title: titleFromUrl(url, storeName),
    description: '',
    price: '',
    imageUrl: '',
    storeName,
    category: '',
    url: url.toString(),
    imageWarning: storeName === 'Shein'
      ? imageWarning ?? 'Shein blocked the product image. Add SHEIN_SEARCH_API_KEY or paste the image URL manually.'
      : undefined,
  }
}

function formatPrice(value: string, currency: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (/^[A-Z]{3}\s/i.test(trimmed) || /^[^\d\s]/.test(trimmed)) {
    return trimmed
  }

  return currency && currency !== 'USD' ? `${currency} ${trimmed}` : `$${trimmed}`
}

function cleanCategory(value: string) {
  const category = value
    .replace(/\s+/g, ' ')
    .replace(/\s*[>/|]\s*/g, ' / ')
    .trim()

  if (!category || isGenericCategory(category)) {
    return ''
  }

  return category.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isGenericCategory(value: string) {
  const normalized = value.toLowerCase().trim()
  return ['home', 'shop', 'products', 'all', 'new', 'sale', 'search'].includes(normalized)
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
