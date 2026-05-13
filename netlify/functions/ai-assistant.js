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

// Step 1: Ask AI if conversation is ready to search, and what query to use
const DECISION_PROMPT = `You are a shopping assistant decision engine.
Given the conversation, decide if you have enough information to search for products on Amazon.

Rules:
- If the user's request is CLEAR and SPECIFIC enough to search (e.g. "coloring book for adults", "gaming headset under $50"), respond with: SEARCH: <english search query>
- If the request is VAGUE and needs clarification (e.g. just "gift", "something nice", or first message without details), respond with: ASK: <your clarifying question in Iraqi Arabic>
- The search query MUST be a smart, specific English Amazon search query (NOT a literal translation). Use context from the ENTIRE conversation.
- For example: if user said "دفاتر تلوين" then later said "للبالغين", the query should be "adult coloring book" NOT "i want coloring book"
- ONLY output one line: either "SEARCH: ..." or "ASK: ..."
- Never search on the very first message unless it is extremely specific with all details`

// Step 2: Generate the actual reply with search results
const REPLY_PROMPT = `You are a smart shopping assistant for an Iraqi e-commerce store selling products from Amazon and China.
Rules:
- Respond in simple Iraqi Arabic
- Prices in Iraqi Dinar (IQD). $1 = 1400 IQD
- Each product has 20% commission built into price (never mention commission to customer)
- Shipping is cash on delivery
- When you have search results, present the TOP products with names and prices in IQD
- Be friendly and concise
- Convert USD to IQD: multiply by 1400 then add 20%
- Format: numbered list with product name and IQD price`

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
    const { messages } = JSON.parse(event.body)

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages required' }) }
    }

    // Step 1: Ask AI to decide - search or ask clarification?
    const decisionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: DECISION_PROMPT },
          ...messages.slice(-10)
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    })

    const decisionData = await decisionRes.json()
    if (decisionData.error) {
      console.error('OpenAI decision error:', JSON.stringify(decisionData.error))
      return { statusCode: 500, headers, body: JSON.stringify({ error: decisionData.error.message, reply: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }) }
    }

    const decision = decisionData.choices?.[0]?.message?.content?.trim() || ''
    console.log('AI Decision:', decision)

    // If AI says ASK - just return the clarifying question, no search
    if (decision.startsWith('ASK:')) {
      const askText = decision.substring(4).trim()
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: askText, products: [] }),
      }
    }

    // If AI says SEARCH - extract query and search Amazon
    let searchResults = []
    let searchContext = ''

    if (decision.startsWith('SEARCH:')) {
      const searchQuery = decision.substring(7).trim()
      console.log('Searching Amazon for:', searchQuery)
      searchResults = await searchAmazon(searchQuery)

      if (searchResults.length > 0) {
        searchContext = '\n\nAmazon search results:\n' + searchResults.map((r, i) =>
          `${i+1}. ${r.title} | Price: ${r.price} | Rating: ${r.rating || 'N/A'} (${r.reviews || 0} reviews)`
        ).join('\n')
      }
    }

    // Step 2: Generate reply with search results
    const replyRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: REPLY_PROMPT + searchContext },
          ...messages.slice(-10)
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    const replyData = await replyRes.json()
    if (replyData.error) {
      console.error('OpenAI reply error:', JSON.stringify(replyData.error))
      return { statusCode: 500, headers, body: JSON.stringify({ error: replyData.error.message, reply: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }) }
    }

    const reply = replyData.choices?.[0]?.message?.content || 'عذراً، حاول مرة ثانية.'

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
