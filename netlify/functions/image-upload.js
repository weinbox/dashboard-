const https = require('https')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wlzwtsvvvzlprlmzukks.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsend0c3Z2dnpscHJsbXp1a2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc0MzYsImV4cCI6MjA5Mjg1MzQzNn0.1LlRBp6V2FY2kqtqJ-rFqQTtfnq8b2MeTd8KQRSALBQ'
const BUCKET = 'image-search'

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) }
  }

  try {
    const { base64, filename, contentType } = JSON.parse(event.body || '{}')
    if (!base64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing base64 image data' }) }
    }

    const imageBuffer = Buffer.from(base64, 'base64')
    const ctype = contentType || 'image/jpeg'
    const ext = ctype.includes('png') ? 'png' : ctype.includes('webp') ? 'webp' : 'jpg'
    const filePath = `search/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    // Upload to Supabase Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`
    
    const url = await new Promise((resolve, reject) => {
      const parsed = new URL(uploadUrl)
      const req = https.request({
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': ctype,
          'Content-Length': imageBuffer.length,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'x-upsert': 'true',
        },
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`
            resolve(publicUrl)
          } else {
            reject(new Error(`Supabase upload failed (${res.statusCode}): ${data.substring(0, 300)}`))
          }
        })
      })
      req.on('error', reject)
      req.write(imageBuffer)
      req.end()
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, url })
    }
  } catch (error) {
    console.error('Image upload error:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Upload failed', message: error.message })
    }
  }
}

module.exports = { handler }
