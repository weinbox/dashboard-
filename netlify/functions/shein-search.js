// Shein Search via Apify Actor (shahidirfan/shein-product-scraper)
const APIFY_TOKEN = process.env.APIFY_TOKEN
const ACTOR_ID = 'shahidirfan~shein-product-scraper'

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

    // Build Shein search URL - ar.shein.com for Arabic
    const searchUrl = `https://ar.shein.com/pdsearch/${encodeURIComponent(keyword)}/?page=${page}`

    // Run the actor synchronously (wait for results)
    const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`

    const input = { startUrl: searchUrl }

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
      const saleAmt = item.salePrice?.amount || item.sale_price || '0'
      const retailAmt = item.retailPrice?.amount || item.original_price || '0'
      const discTxt = item.discount_text || (item.unit_discount ? `-${item.unit_discount}%` : '')
      const img = (item.goods_img || item.image_url || '').replace('http://', 'https://')
      return {
        id: item.goods_id || item.product_id || '',
        title: item.goods_name || item.title || '',
        image: img,
        price: saleAmt,
        originalPrice: retailAmt,
        discount: discTxt,
        usdPrice: item.salePrice?.usdAmount || saleAmt,
        rating: '0',
        reviews: 0,
        category: '',
        categoryId: item.cat_id || item.category_id || '',
        url: item.url || `https://ar.shein.com/-p-${item.goods_id || item.product_id}.html`,
        images: item.detail_image || [],
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
