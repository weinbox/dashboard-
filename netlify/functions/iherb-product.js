// iHerb Product Details via Apify Actor (vaunted/iherb-scraper)
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
    const url = params.url || ''

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'url is required' }) }
    }

    // Run the actor with product URL
    const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`
    const input = { startUrls: [{ url }] }

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
    const item = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : null

    if (!item || item.status !== 'success') {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) }
    }

    // Normalize product details
    const product = {
      id: String(item.productId || ''),
      title: item.title || '',
      brand: item.brand || '',
      price: item.price || 0,
      currency: item.currency || 'USD',
      rating: item.rating || 0,
      reviewCount: item.reviewCount || 0,
      stockStatus: item.stockStatus || 'unknown',
      url: item.url || '',
      upc: item.upc || '',
      weight: item.weight ? `${item.weight} ${item.weightUnit || ''}`.trim() : '',
      description: item.description || '',
      suggestedUse: item.suggestedUse || '',
      warnings: item.warnings || '',
      allergenInfo: item.allergenInfo || '',
      ingredients: (item.ingredients || []).filter(i => i.name).map(i => ({
        name: i.name,
        amount: i.amount || '',
      })),
      images: (item.images || []).filter(i => i.type === 'gallery').map(i => fixImageUrl(i.url)),
      categories: (item.categories || []).map(c => c.name || c).filter(Boolean),
      rankings: (item.rankings || []).filter(r => r.category).map(r => ({
        category: r.category,
        rank: r.rank,
      })),
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, product }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
