// Best Buy Search via SearchAPI.io
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
    url.searchParams.set('engine', 'bestbuy_search')
    url.searchParams.set('q', keyword)
    url.searchParams.set('page', String(page))
    url.searchParams.set('api_key', SEARCHAPI_KEY)
    if (sort) url.searchParams.set('sort_by', sort)

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
      id: String(item.product_id || ''),
      title: item.title || '',
      shortTitle: item.short_title || '',
      link: item.link || '',
      brand: item.brand || '',
      modelNumber: item.model_number || '',
      condition: item.condition || 'new',
      rating: item.rating || 0,
      reviews: item.reviews || 0,
      price: item.extracted_price || 0,
      originalPrice: item.extracted_original_price || 0,
      discount: item.discount || 0,
      discountPercentage: item.discount_percentage || 0,
      thumbnail: item.thumbnail || '',
      images: (item.images || []).filter(i => i.title && i.title.includes('Zoom')).map(i => i.link).filter(Boolean),
      seller: item.seller?.name || 'Best Buy',
      installment: item.installment || null,
      financeOption: item.finance_option || null,
      badges: item.badges || [],
      whatItIs: item.what_it_is || [],
      classification: item.classification || null,
      openBoxOptions: (item.open_box_options || []).map(o => ({
        condition: o.condition, price: o.extracted_price, savings: o.extracted_savings,
      })),
      freeGiftsCount: (item.free_gifts || []).length,
      syndicatedReviews: (item.syndicated_reviews || []).map(r => ({ source: r.source, rating: r.rating, reviews: r.reviews })),
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
        filters: data.filters || {},
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
