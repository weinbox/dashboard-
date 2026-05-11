const https = require('https')
const http = require('http')

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
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)
    
    // Build multipart form data
    const fname = filename || 'image.jpg'
    const ctype = contentType || 'image/jpeg'
    
    const parts = []
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fname}"\r\nContent-Type: ${ctype}\r\n\r\n`))
    parts.push(imageBuffer)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
    const body = Buffer.concat(parts)

    // Upload to tmpfiles.org
    const url = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'tmpfiles.org',
        port: 443,
        path: '/api/v1/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.status === 'success' && json.data?.url) {
              // Convert tmpfiles.org/12345/file.png to tmpfiles.org/dl/12345/file.png for direct link
              const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
              resolve(directUrl)
            } else {
              reject(new Error('Upload failed: ' + data.substring(0, 200)))
            }
          } catch (e) {
            reject(new Error(`Upload parse error: ${res.statusCode} - ${data.substring(0, 200)}`))
          }
        })
      })
      req.on('error', reject)
      req.write(body)
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
