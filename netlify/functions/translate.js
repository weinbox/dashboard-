export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const text = event.queryStringParameters?.text
  const from = event.queryStringParameters?.from || 'ar'
  const to = event.queryStringParameters?.to || 'en'

  if (!text) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing text' }) }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const data = await res.json()
    const translated = data[0]?.map(s => s[0]).join('') || text
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, translated, original: text }),
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    }
  }
}
