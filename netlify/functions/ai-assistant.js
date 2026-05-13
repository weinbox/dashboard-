const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const SYSTEM_PROMPT = `You are a shopping assistant for an Iraqi e-commerce store.
Given the conversation, decide what to do:

1. If the user's request is CLEAR and SPECIFIC enough to search Amazon, respond in this EXACT JSON format:
{"action":"search","query":"<english amazon search query>","reply":"<short arabic reply telling user you're searching>"}

2. If the request is VAGUE or needs clarification, respond in this EXACT JSON format:
{"action":"ask","reply":"<clarifying question in Iraqi Arabic>"}

Rules:
- The search query MUST be a smart, specific English Amazon search query based on the FULL conversation context
- Example: if user said "دفاتر تلوين" then "للبالغين", query should be "adult coloring book" 
- If user said "لابتوب للتصميم" then "مليون دينار" then "جرافيك", query should be "laptop for graphic design under 700 dollars"
- $1 = 1400 IQD, so convert budget if mentioned
- NEVER search on first message unless it contains ALL needed details (product + specifics)
- Ask about: type/category, budget, specific needs, age group, etc when unclear
- Reply ONLY with valid JSON, nothing else
- Arabic replies should be in simple Iraqi Arabic dialect
- Start with greeting on first message`

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

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10)
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    })

    const openaiData = await openaiRes.json()

    if (openaiData.error) {
      console.error('OpenAI error:', JSON.stringify(openaiData.error))
      return { statusCode: 500, headers, body: JSON.stringify({ error: openaiData.error.message, reply: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }) }
    }

    const raw = openaiData.choices?.[0]?.message?.content?.trim() || ''
    console.log('AI raw response:', raw)

    // Parse JSON response from AI
    let parsed
    try {
      // Handle case where AI wraps in markdown code block
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      console.error('JSON parse error, raw:', raw)
      // Fallback: treat as ask
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ action: 'ask', reply: raw, searchQuery: null }),
      }
    }

    if (parsed.action === 'search') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          action: 'search',
          reply: parsed.reply || 'جاري البحث...',
          searchQuery: parsed.query,
        }),
      }
    }

    // Default: ask/clarify
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        action: 'ask',
        reply: parsed.reply || raw,
        searchQuery: null,
      }),
    }

  } catch (e) {
    console.error('AI Assistant error:', e.message || e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, reply: 'عذراً، حدث خطأ تقني. حاول مرة ثانية 🙏' }) }
  }
}
