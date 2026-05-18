// Google Lens Image Search via SearchAPI.io
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const params = event.queryStringParameters || {}
    const imageUrl = params.image_url || ''
    const site = (params.site || 'amazon').toLowerCase()

    if (!imageUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'image_url is required' }) }
    }

    const url = new URL('https://www.searchapi.io/api/v1/search')
    url.searchParams.set('engine', 'google_lens')
    url.searchParams.set('url', imageUrl)
    url.searchParams.set('api_key', SEARCHAPI_KEY)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errText = await response.text()
      return { statusCode: response.status, headers, body: JSON.stringify({ error: 'SearchAPI error', details: errText }) }
    }

    const data = await response.json()

    if (data.error) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: data.error }) }
    }

    // خريطة المواقع للفلترة
    const siteFilters = {
      amazon: ['amazon.'],
      bestbuy: ['bestbuy.com'],
      ebay: ['ebay.com'],
      iherb: ['iherb.com'],
      shein: ['shein.com'],
      taobao: ['taobao.com', 'tmall.com'],
      '1688': ['1688.com'],
    }
    const filters = siteFilters[site] || ['amazon.']

    const siteMatches = (data.visual_matches || []).filter(item => {
      const link = (item.link || '').toLowerCase()
      const source = (item.source || '').toLowerCase()
      return filters.some(f => link.includes(f) || source.includes(f))
    })

    const results = siteMatches.slice(0, 20).map(item => {
      // استخراج ID من الرابط حسب الموقع
      let productId = ''
      if (site === 'amazon') {
        const m = (item.link || '').match(/(?:\/dp\/|\/product\/|\/gp\/product\/)([A-Z0-9]{10})/i)
        if (m) productId = m[1]
      } else if (site === 'bestbuy') {
        const m = (item.link || '').match(/bestbuy\.com.*\/(\d{7,})/)
        if (m) productId = m[1]
      } else if (site === 'ebay') {
        const m = (item.link || '').match(/ebay\.com\/itm\/(\d+)/)
        if (m) productId = m[1]
      }
      return {
        title: item.title || '',
        image: item.thumbnail || item.image?.link || '',
        link: item.link || '',
        source: item.source || '',
        price: item.price?.extracted_value || 0,
        priceText: item.price?.value || '',
        rating: item.rating || 0,
        reviews: item.reviews || 0,
        inStock: item.in_stock || false,
        asin: productId,
        site: site,
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        totalResults: results.length,
        site,
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
