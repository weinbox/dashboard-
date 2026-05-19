const https = require('https')

const SERPAPI_KEY = process.env.SERPAPI_KEY || '3cb92272765301cf580f95c22d1964d8a08d7e73bbe868459042e98ab44e2e11'

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error('Invalid JSON response')) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  const params = event.queryStringParameters || {}
  const action = params.action // search | product

  try {
    if (action === 'search') {
      const query = params.query || ''
      const page = params.page || '1'
      if (!query) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing query' }) }
      }

      const url = `https://serpapi.com/search.json?engine=amazon&amazon_domain=amazon.com&k=${encodeURIComponent(query)}&page=${page}&api_key=${SERPAPI_KEY}`
      const data = await fetchJson(url)

      const results = (data.organic_results || []).map(item => ({
        asin: item.asin,
        title: item.title,
        image: item.thumbnail,
        price: item.extracted_price || 0,
        oldPrice: item.extracted_old_price || 0,
        priceText: item.price || '',
        rating: item.rating || 0,
        reviews: item.reviews || 0,
        link: item.link_clean || item.link,
        badge: (item.badges || [])[0] || '',
        boughtLastMonth: item.bought_last_month || '',
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          results,
          totalResults: data.search_information?.total_results || 0,
          page: parseInt(page),
        })
      }
    }

    if (action === 'product') {
      const asin = params.asin || ''
      if (!asin) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing asin' }) }
      }

      const url = `https://serpapi.com/search.json?engine=amazon_product&asin=${encodeURIComponent(asin)}&amazon_domain=amazon.com&api_key=${SERPAPI_KEY}`
      const data = await fetchJson(url)

      const product = data.product_results || {}
      const specs = (data.product_information?.specifications || [])

      // استخراج السعر: extracted_price (رقم) أو price (نص) أو buybox
      const extractedPrice = product.extracted_price || 
        (typeof product.price === 'string' ? parseFloat(product.price.replace(/[^0-9.]/g, '')) : 0) ||
        product.buybox_winner?.price?.extracted_value || 0

      // استخراج الصور: thumbnails (array of strings) أو images (array of objects)
      const images = product.thumbnails || 
        (product.images || []).map(img => img.link || img) || []
      const mainImage = product.thumbnail || images[0] || ''

      // استخراج بيانات إضافية
      const itemSpecs = data.item_specifications || {}
      const specsArray = typeof itemSpecs === 'object' && !Array.isArray(itemSpecs)
        ? Object.entries(itemSpecs).map(([key, value]) => ({ name: key, value: String(value) }))
        : (Array.isArray(itemSpecs) ? itemSpecs : [])

      const aboutProduct = data.about_item || product.about || []

      const productDetails = data.product_details || {}
      const dimensions = productDetails.product_dimensions
        ? { 'الأبعاد': productDetails.product_dimensions, 'الوزن': productDetails.item_weight || '', 'الشركة المصنعة': productDetails.manufacturer || '', 'رقم الموديل': productDetails.item_model_number || '', 'متوفر منذ': productDetails.date_first_available || '' }
        : ''

      const categories = (product.categories || []).map(c => typeof c === 'object' ? (c.name || c.title || '') : c).filter(Boolean)

      const questionsAnswers = (data.questions_and_answers || []).slice(0, 5).map(qa => ({
        question: qa.question || qa.title || '',
        answer: qa.answer || qa.snippet || '',
        votes: qa.votes || 0,
      }))
      const aPlusContent = (data.a_plus_content || []).map(section => ({
        title: section.title || '',
        body: section.body || section.text || '',
        image: section.image || section.thumbnail || '',
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          product: {
            asin: product.asin,
            title: product.title,
            link: product.link_clean || product.link,
            images: images,
            mainImage: mainImage,
            price: extractedPrice,
            priceText: product.price || '',
            oldPrice: product.old_price?.extracted_value || 
              (typeof product.old_price === 'string' ? parseFloat(product.old_price.replace(/[^0-9.]/g, '')) : 0) || 0,
            rating: product.rating || 0,
            reviews: product.reviews_total || product.reviews || 0,
            description: product.description || '',
            features: product.feature_bullets || [],
            variants: (product.variants || []).map(v => ({
              title: v.title,
              items: (v.items || []).map(i => ({
                asin: i.asin,
                name: i.name,
                selected: i.selected || false,
                image: i.thumbnail || i.image || '',
              }))
            })),
            specifications: specsArray.length > 0 ? specsArray : specs,
            badge: (product.badges || product.tags || [])[0] || '',
            stock: product.stock || '',
            boughtLastMonth: product.bought_last_month || '',
            // بيانات جديدة
            about: aboutProduct,
            dimensions: dimensions,
            categories: categories,
            questionsAnswers: questionsAnswers,
            aPlusContent: aPlusContent,
          },
          relatedProducts: (data.compare_with_similar || []).slice(0, 6).map(r => ({
            asin: r.asin,
            title: r.title,
            image: r.thumbnail || r.image,
            price: r.extracted_price || 0,
            priceText: r.price || '',
            rating: r.rating || 0,
            reviews: r.reviews || 0,
          })),
        })
      }
    }

    if (action === 'image-search') {
      const imageUrl = params.image_url || ''
      const site = (params.site || 'amazon').toLowerCase()
      if (!imageUrl) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing image_url' }) }
      }

      const url = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&api_key=${SERPAPI_KEY}`
      const data = await fetchJson(url)

      // خريطة المواقع للفلترة
      const siteFilters = {
        amazon: ['amazon.'],
        bestbuy: ['bestbuy.com'],
        ebay: ['ebay.com'],
        walmart: ['walmart.com'],
        iherb: ['iherb.com'],
        shein: ['shein.com'],
        taobao: ['taobao.com', 'tmall.com'],
        '1688': ['1688.com'],
      }
      const filters = siteFilters[site] || ['amazon.']

      const siteMatches = (data.visual_matches || []).filter(item => {
        const link = (item.link || '').toLowerCase()
        const source = (item.source || '').toLowerCase()
        const matchesSite = filters.some(f => link.includes(f) || source.includes(f))
        if (!matchesSite) return false
        // استبعاد صفحات المراجعات/المقالات وإبقاء صفحات المنتجات فقط
        if (site === 'iherb') {
          if (link.includes('/r/') || link.includes('/review') || link.includes('/ugc') || link.includes('#reviews')) return false
          if (!link.includes('/pr/')) return false
        } else if (site === 'amazon') {
          if (link.includes('/review') || link.includes('/forum') || link.includes('/ask/') || link.includes('/gp/customer-reviews') || link.includes('/profile/')) return false
          if (!(/\/dp\/|\/product\/|\/gp\/product\//.test(link))) return false
        } else if (site === 'bestbuy') {
          if (link.includes('/review') || link.includes('/question') || link.includes('/blog') || link.includes('/site/misc/')) return false
          if (!link.includes('/site/') || link.includes('/site/search')) return false
        } else if (site === 'ebay') {
          if (link.includes('/review') || link.includes('/sch/') || link.includes('/b/') || link.includes('/usr/') || link.includes('/str/')) return false
          if (!link.includes('/itm/')) return false
        } else if (site === 'walmart') {
          if (link.includes('/review') || link.includes('/search') || link.includes('/browse/') || link.includes('/cp/') || link.includes('/seller/')) return false
          if (!link.includes('/ip/')) return false
        }
        return true
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
        } else if (site === 'walmart') {
          const m = (item.link || '').match(/walmart\.com\/ip\/[^\/]*\/(\d+)/)
          if (m) productId = m[1]
        } else if (site === 'iherb') {
          const m = (item.link || '').match(/iherb\.com\/pr\/[^\/]*\/(\d+)/)
          if (m) productId = m[1]
        }
        return {
          title: item.title || '',
          image: item.thumbnail || '',
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
        })
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use search, product, or image-search' }) }

  } catch (error) {
    console.error('SerpApi error:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API request failed', message: error.message })
    }
  }
}

module.exports = { handler }
