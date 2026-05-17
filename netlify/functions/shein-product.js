// Shein Product Details via Apify Actor (crawlerbros/shein-scraper)
const APIFY_TOKEN = process.env.APIFY_TOKEN
const ACTOR_ID = 'crawlerbros~shein-scraper'

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

    if (!item) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) }
    }

    // Normalize product details
    const product = {
      id: String(item.productId || ''),
      title: item.title || '',
      mainImage: item.mainImage || '',
      images: (item.images || []).map(img => typeof img === 'string' ? img : img.url || '').filter(Boolean),
      salePrice: item.salePrice || 0,
      retailPrice: item.retailPrice || 0,
      currency: item.currency || 'USD',
      discountPercentage: item.discountPercentage || 0,
      url: item.url || url,
      catId: item.catId || '',
      countryCode: item.countryCode || '',
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
