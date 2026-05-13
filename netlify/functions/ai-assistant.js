const https = require('https')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SERPAPI_KEY = '3cb92272765301cf580f95c22d1964d8a08d7e73bbe868459042e98ab44e2e11'

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error('Invalid JSON')) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

const postJson = (url, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const bodyStr = JSON.stringify(body)
    const bodyBuffer = Buffer.from(bodyStr, 'utf-8')
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBuffer.length,
        ...headers,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { 
          console.error('postJson parse error, raw:', data.substring(0, 500))
          reject(new Error('Invalid JSON response: ' + data.substring(0, 200))) 
        }
      })
    })
    req.on('error', reject)
    req.write(bodyBuffer)
    req.end()
  })
}

const searchAmazon = async (query) => {
  try {
    const url = `https://serpapi.com/search.json?engine=amazon&amazon_domain=amazon.com&k=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}`
    const data = await fetchJson(url)
    if (data.organic_results && data.organic_results.length > 0) {
      return data.organic_results.slice(0, 5).map(item => ({
        title: item.title || '',
        price: item.price?.raw || item.price?.current || 'غير متوفر',
        rating: item.rating || null,
        reviews: item.reviews || null,
        image: item.thumbnail || '',
        asin: item.asin || '',
        link: item.link || '',
      }))
    }
    return []
  } catch (e) {
    console.error('Amazon search error:', e)
    return []
  }
}

const SYSTEM_PROMPT = `أنت مساعد شراء ذكي يعمل في متجر إلكتروني عراقي يبيع منتجات من أمازون والصين.

مهامك:
1. ساعد الزبون يلاقي المنتج المناسب بناءً على طلبه
2. اقترح منتجات محددة مع شرح مختصر لكل منتج
3. إذا سأل الزبون عن منتج معين، اشرح له مميزاته وعيوبه
4. تكلم بالعربي العراقي البسيط
5. كن ودوداً ومختصراً

قواعد مهمة:
- الأسعار بالدينار العراقي (د.ع)
- سعر الدولار = 1400 دينار
- كل منتج عليه عمولة 20% مدمجة بالسعر
- لا تذكر العمولة للزبون أبداً
- الشحن عند الاستلام
- إذا الزبون طلب شيء عام، اسأله أسئلة توضيحية (الميزانية، الاستخدام، إلخ)
- عندما تقترح منتجات، ضعها بتنسيق واضح مع رقم وسعر

إذا تم توفير نتائج بحث من أمازون، استخدمها لاقتراح المنتجات. حوّل الأسعار من دولار لدينار عراقي (اضرب بـ 1400 ثم أضف 20% عمولة).

ابدأ دائماً بتحية بسيطة إذا كانت أول رسالة.`

const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { messages, provider } = JSON.parse(event.body)
    
    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages required' }) }
    }

    const lastUserMsg = messages.filter(m => m.role === 'user').pop()
    let searchResults = []
    let searchContext = ''

    // إذا الرسالة تبدو كطلب منتج، ابحث في أمازون
    if (lastUserMsg && lastUserMsg.content) {
      const msg = lastUserMsg.content.toLowerCase()
      const isProductQuery = msg.length > 3 && 
        !msg.startsWith('شكر') && !msg.startsWith('مرحب') && 
        !msg.startsWith('هلا') && !msg.startsWith('كيف الحال') &&
        (msg.includes('أريد') || msg.includes('اريد') || msg.includes('ابي') || msg.includes('أبي') ||
         msg.includes('ابحث') || msg.includes('أبحث') || msg.includes('اقترح') || msg.includes('وش') ||
         msg.includes('منتج') || msg.includes('شراء') || msg.includes('أفضل') || msg.includes('افضل') ||
         msg.includes('ارخص') || msg.includes('أرخص') || msg.includes('recommend') || 
         msg.includes('buy') || msg.includes('want') || msg.includes('best') ||
         msg.includes('هدية') || msg.includes('هديه') || msg.includes('فيتامين') ||
         msg.includes('كريم') || msg.includes('سماع') || msg.includes('ساعة') || msg.includes('ساعه') ||
         msg.includes('حقيبة') || msg.includes('حقيبه') || msg.includes('عطر') ||
         msg.includes('جوال') || msg.includes('تلفون') || msg.includes('لابتوب') ||
         messages.length <= 2) // أول رسالة بعد الترحيب غالباً طلب منتج
    
      if (isProductQuery) {
        // ترجمة للإنجليزية للبحث
        try {
          const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(lastUserMsg.content)}`
          const translateData = await fetchJson(translateUrl)
          const englishQuery = translateData?.[0]?.[0]?.[0] || lastUserMsg.content
          searchResults = await searchAmazon(englishQuery)
        } catch (e) {
          console.error('Translation/search error:', e)
        }
      }
    }

    if (searchResults.length > 0) {
      searchContext = '\n\nنتائج البحث من أمازون:\n' + searchResults.map((r, i) => 
        `${i+1}. ${r.title}\n   السعر: ${r.price}\n   التقييم: ${r.rating || 'لا يوجد'} (${r.reviews || 0} تقييم)\n   ASIN: ${r.asin}`
      ).join('\n')
    }

    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + searchContext },
      ...messages.slice(-10) // آخر 10 رسائل فقط
    ]

    const openaiResponse = await postJson('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 800,
      temperature: 0.7,
    }, {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    })

    if (openaiResponse.error) {
      console.error('OpenAI error:', openaiResponse.error)
      return { statusCode: 500, headers, body: JSON.stringify({ error: openaiResponse.error.message || 'OpenAI error' }) }
    }

    const reply = openaiResponse.choices?.[0]?.message?.content || 'عذراً، حدث خطأ. حاول مرة ثانية.'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply,
        products: searchResults,
      })
    }

  } catch (e) {
    console.error('AI Assistant error:', e.message || e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Internal error', reply: 'عذراً، حدث خطأ تقني. حاول مرة ثانية 🙏' }) }
  }
}

module.exports = { handler }
