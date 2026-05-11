import * as cheerio from 'cheerio'

type JsonObject = Record<string, unknown>

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
    const response = await fetch(url.toString(), {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      return json(response.status, {
        description: `The store returned ${response.status}. Add details manually or try another product URL.`,
      })
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const jsonLd = readJsonLd($)
    const product = Array.isArray(jsonLd) ? jsonLd.find(isProductLike) : isProductLike(jsonLd) ? jsonLd : null
    const offers = product && isJsonObject(product.offers) ? product.offers : null
    const image = firstString(
      product?.image,
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
    )
    const price = firstString(
      offers?.price,
      offers?.lowPrice,
      $('meta[property="product:price:amount"]').attr('content'),
    )
    const currency = firstString(offers?.priceCurrency, $('meta[property="product:price:currency"]').attr('content'))

    return json(200, {
      title: firstString(product?.name, $('meta[property="og:title"]').attr('content'), $('title').text()),
      description: firstString(product?.description, $('meta[property="og:description"]').attr('content')),
      price: price ? `${currency === 'USD' || !currency ? '$' : `${currency} `}${price}` : '',
      imageUrl: image ? new URL(image, url).toString() : '',
      storeName: $('meta[property="og:site_name"]').attr('content') || hostToStoreName(url.hostname),
      url: url.toString(),
    })
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
  return hostname.replace(/^www\./, '').split('.')[0].replace(/-/g, ' ')
}
