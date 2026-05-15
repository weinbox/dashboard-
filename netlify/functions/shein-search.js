// Shein Search via Apify Actor
const APIFY_TOKEN = process.env.APIFY_TOKEN
const ACTOR_ID = 'sNgxslyqdJ0k7RNjP'

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
    const limit = parseInt(params.limit) || 20
    const page = parseInt(params.page) || 1
    const country = params.country || 'SA' // السعودية افتراضياً
    const language = params.language || 'ar'
    const currency = params.currency || 'SAR'
    const sort = params.sort || '' // 0=recommend, 7=top rated, 9=new, 10=price low, 11=price high

    if (!keyword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'keyword is required' }) }
    }

    // Run the actor synchronously (wait for results)
    const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`

    const input = {
      keyword,
      limit,
      page,
      country,
      language,
      currency,
      sort: sort || undefined,
    }

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

    // Normalize results
    const products = (Array.isArray(rawData) ? rawData : []).map(item => {
      const p = item.product || item
      return {
        id: p.goods_id || '',
        title: p.goods_name || '',
        image: (p.goods_img || '').replace('http://', 'https://'),
        price: p.salePrice?.amount || p.retailPrice?.amount || '0',
        priceSymbol: p.salePrice?.amountWithSymbol || p.retailPrice?.amountWithSymbol || '',
        originalPrice: p.retailPrice?.amount || '0',
        originalPriceSymbol: p.retailPrice?.amountWithSymbol || '',
        discount: p.original_discount || '0',
        currency: p.salePrice?.usdAmount ? 'USD' : currency,
        usdPrice: p.salePrice?.usdAmount || '0',
        rating: p.comment_rank_average || '0',
        reviews: p.comment_num || 0,
        reviewsShow: p.comment_num_show || '0',
        category: p.cate_name || '',
        categoryId: p.cat_id || '',
        url: p.goods_url_name ? `https://ar.shein.com/${p.goods_url_name}-p-${p.goods_id}.html` : '',
        stock: p.stock || 0,
        soldOut: p.soldOutStatus === '1',
        video: p.video_url || '',
        badge: p.productInfoLabels || null,
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        keyword,
        total: products.length,
        page,
        country,
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
