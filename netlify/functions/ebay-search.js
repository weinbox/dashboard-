// eBay Search via SearchAPI.io
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
    const keyword = params.keyword || ''
    const page = parseInt(params.page) || 1
    const sort = params.sort || ''
    const condition = params.condition || ''

    if (!keyword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'keyword is required' }) }
    }

    const url = new URL('https://www.searchapi.io/api/v1/search')
    url.searchParams.set('engine', 'ebay_search')
    url.searchParams.set('q', keyword)
    url.searchParams.set('page', String(page))
    url.searchParams.set('api_key', SEARCHAPI_KEY)
    if (sort) url.searchParams.set('sort', sort)
    if (condition) url.searchParams.set('condition', condition)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errText = await response.text()
      return { statusCode: response.status, headers, body: JSON.stringify({ error: 'SearchAPI error', details: errText }) }
    }

    const data = await response.json()

    if (data.error) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: data.error }) }
    }

    const products = (data.organic_results || []).map(item => ({
      id: String(item.item_id || ''),
      title: item.title || '',
      link: item.link || '',
      condition: item.condition || '',
      buyingFormat: item.buying_format || '',
      authenticity: item.authenticity || '',
      extensions: item.extensions || [],
      price: item.extracted_price || (item.extracted_price_range ? item.extracted_price_range.from : 0),
      priceRange: item.is_price_range ? item.extracted_price_range : null,
      priceDisplay: item.price || '',
      originalPrice: item.extracted_original_price || 0,
      shipping: item.shipping || '',
      shippingCost: item.extracted_shipping || 0,
      deal: item.deal || '',
      thumbnail: item.thumbnail || '',
      seller: {
        name: item.seller?.name || '',
        reviews: item.seller?.reviews || 0,
        feedback: item.seller?.positive_feedback_percent || 0,
      },
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        keyword,
        total: data.search_information?.total_results || products.length,
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
