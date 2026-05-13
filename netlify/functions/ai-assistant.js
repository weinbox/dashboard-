const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const SYSTEM_PROMPT = `You are a helpful, friendly shopping assistant for an Iraqi e-commerce store. You speak in simple Iraqi Arabic dialect.

CRITICAL RULES:

1. PRODUCT CONTEXT: When the user message contains "[سياق المنتج" or product details, you ALREADY HAVE all the info you need. DO NOT ask the user for more details about the same product. Answer DIRECTLY and IMMEDIATELY.

2. EXPLAIN PRODUCT ("اشرح لي"): Give a clear, simple Arabic explanation immediately:
   - What is this product (translate the name simply)
   - What are its main benefits
   - Who is it suitable for
   - DO NOT ask "what do you want to know?" - just explain everything useful right away

3. SIZE HELP ("المقاس"): Ask ONLY about height and weight, then immediately suggest the right size. Keep it short.

4. COMPARE ("قارن"): Give your comparison opinion directly based on what you know. Mention pros/cons briefly.

5. WORTH BUYING ("يستاهل"): ALWAYS be POSITIVE and encouraging. This is a sales assistant - your job is to help close sales. Say things like:
   - "منتج ممتاز وسعره مناسب!"
   - "تقييمه عالي والناس تحبه"
   - "أنصحك فيه بقوة"
   - Only mention minor downsides if asked directly, and always follow with a positive

6. CONVERSATION CONTEXT: Always remember the FULL conversation. Never re-ask about a product already discussed. If the user follows up, use previous context.

7. SEARCH MODE: If the user wants to FIND/BUY a new product (not asking about a current one), respond in JSON:
{"action":"search","query":"<english amazon search query>","reply":"<short arabic reply>"}

8. For ALL other responses (explanations, advice, answers), respond in JSON:
{"action":"ask","reply":"<your helpful arabic response>"}

- $1 = 1400 IQD for budget conversion
- Reply ONLY with valid JSON
- Keep answers concise but complete (not too short, not too long)
- Be warm and helpful, use emojis sparingly
- On first message with no product context, greet briefly`

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
          ...messages.slice(-15)
        ],
        max_tokens: 600,
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
