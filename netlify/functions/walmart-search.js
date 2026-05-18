// Walmart Search via SearchAPI.io
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

    if (!keyword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'keyword is required' }) }
    }

    const url = new URL('https://www.searchapi.io/api/v1/search')
    url.searchParams.set('engine', 'walmart_search')
    url.searchParams.set('q', keyword)
    url.searchParams.set('page', String(page))
    url.searchParams.set('api_key', SEARCHAPI_KEY)
    if (sort) url.searchParams.set('sort', sort)

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
      id: String(item.id || item.product_id || ''),
      productId: item.product_id || '',
      title: item.title || '',
      link: item.link || '',
      sellerName: item.seller_name || 'Walmart',
      rating: item.rating || 0,
      reviews: item.reviews || 0,
      price: item.extracted_price || 0,
      priceRange: item.price_range ? {
        text: item.price_range.text || '',
        from: item.price_range.extracted_from_price || 0,
      } : null,
      flag: item.flag || '',
      freeShipping: item.is_free_shipping || false,
      walmartPlus: item.is_free_shipping_with_walmart_plus || false,
      badges: (item.badges || []).map(b => b.text || ''),
      fulfillment: item.fulfillment?.delivery ? {
        text: item.fulfillment.delivery.text || '',
        date: item.fulfillment.delivery.expected_date || '',
      } : null,
      thumbnail: item.thumbnail || '',
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
