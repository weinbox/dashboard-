const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SERPAPI_KEY = '3cb92272765301cf580f95c22d1964d8a08d7e73bbe868459042e98ab44e2e11'

const searchAmazon = async (query) => {
  try {
    const res = await fetch(`https://serpapi.com/search.json?engine=amazon&amazon_domain=amazon.com&k=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}`)
    const data = await res.json()
    if (data.organic_results && data.organic_results.length > 0) {
      return data.organic_results.slice(0, 5).map(item => ({
        title: item.title || '',
        price: item.price?.raw || item.price?.current || 'N/A',
        rating: item.rating || null,
        reviews: item.reviews || null,
        image: item.thumbnail || '',
        asin: item.asin || '',
      }))
    }
    return []
  } catch (e) {
    console.error('Amazon search error:', e.message)
    return []
  }
}

const SYSTEM_PROMPT = `You are a smart shopping assistant for an Iraqi e-commerce store selling products from Amazon and China.
Rules:
- Respond in simple Iraqi Arabic
- Prices in Iraqi Dinar (IQD). $1 = 1400 IQD
- Each product has 20% commission built into price (never mention commission)
- Shipping is cash on delivery
- If request is vague, ask clarifying questions (budget, usage, etc)
- Format product suggestions clearly with number and price
- If Amazon search results are provided, use them to suggest products. Convert USD to IQD (multiply by 1400 then add 20%)
- Be friendly and concise
- Start with a simple greeting if first message`

exports.handler = async (event) => {
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

    if (lastUserMsg && lastUserMsg.content) {
      const msg = lastUserMsg.content
      const keywords = ['أريد','اريد','ابي','أبي','ابحث','أبحث','اقترح','منتج','شراء','أفضل','افضل','ارخص','أرخص','هدية','هديه','فيتامين','كريم','سماع','ساعة','ساعه','حقيبة','حقيبه','عطر','جوال','تلفون','لابتوب']
      const isProductQuery = msg.length > 3 && keywords.some(k => msg.includes(k)) || messages.length <= 2

      if (isProductQuery) {
        try {
          const tRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(msg)}`)
          const tData = await tRes.json()
          const englishQuery = tData?.[0]?.[0]?.[0] || msg
          searchResults = await searchAmazon(englishQuery)
        } catch (e) {
          console.error('Translation error:', e.message)
        }
      }
    }

    if (searchResults.length > 0) {
      searchContext = '\n\nAmazon search results:\n' + searchResults.map((r, i) =>
        `${i+1}. ${r.title} | Price: ${r.price} | Rating: ${r.rating || 'N/A'} (${r.reviews || 0} reviews) | ASIN: ${r.asin}`
      ).join('\n')
    }

    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + searchContext },
      ...messages.slice(-10)
    ]

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    const openaiData = await openaiRes.json()

    if (openaiData.error) {
      console.error('OpenAI error:', JSON.stringify(openaiData.error))
      return { statusCode: 500, headers, body: JSON.stringify({ error: openaiData.error.message, reply: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }) }
    }

    const reply = openaiData.choices?.[0]?.message?.content || 'عذراً، حاول مرة ثانية.'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply, products: searchResults }),
    }

  } catch (e) {
    console.error('AI Assistant error:', e.message || e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, reply: 'عذراً، حدث خطأ تقني. حاول مرة ثانية 🙏' }) }
  }
}
