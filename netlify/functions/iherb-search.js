// iHerb Search via Apify Actor (vaunted/iherb-scraper)
const APIFY_TOKEN = process.env.APIFY_TOKEN
const ACTOR_ID = 'vaunted~iherb-scraper'

// Convert cloudinary URLs to s3 (cloudinary blocks hotlinking)
const fixImageUrl = (url) => {
  if (!url) return ''
  return url
    .replace(/https:\/\/cloudinary\.images-iherb\.com\/image\/upload\/[^/]+\/images\//i, 'https://s3.images-iherb.com/')
    .replace(/([A-Z]+)\/([A-Z]+-?)(\d+)/g, (m, p1, p2, p3) => `${p1.toLowerCase()}/${p2.toLowerCase().replace(/-/g, '')}${p3}`)
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const params = event.queryStringParameters || {}
    const keyword = params.keyword || ''
    const page = parseInt(params.page) || 1

    if (!keyword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'keyword is required' }) }
    }

    // Build iHerb search URL
    const searchUrl = `https://www.iherb.com/search?kw=${encodeURIComponent(keyword)}&p=${page}`

    // Run the actor synchronously
    const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`

    const input = { startUrls: [{ url: searchUrl }] }

    const response = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Apify error', details: errText }) }
    }

    const rawData = await response.json()

    // Filter valid products (remove duplicates with price=0)
    const products = (Array.isArray(rawData) ? rawData : [])
      .filter(item => item.price > 0 && item.title && item.url && item.url !== 'https://www.iherb.com')
      .map(item => ({
        id: String(item.productId || ''),
        title: item.title || '',
        image: fixImageUrl(item.imageUrl) || `https://s3.images-iherb.com/${item.productId}.jpg`,
        price: String(item.price || '0'),
        currency: item.currency || 'USD',
        rating: item.rating || '0',
        reviews: item.reviewCount || 0,
        brand: item.brand || '',
        stock: item.stockStatus || 'unknown',
        url: item.url || '',
      }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        keyword,
        total: products.length,
        page,
        products,
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
