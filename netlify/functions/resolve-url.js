const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000 
    }, (res) => {
      // Handle redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return resolve({ type: 'redirect', url: res.headers.location });
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ type: 'html', body: data }));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const shortUrl = (event.queryStringParameters || {}).url;
    if (!shortUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing url param' }) };
    }

    const result = await fetchPage(shortUrl);

    let resolvedUrl = null;

    const cleanUrl = shortUrl.replace(/\/$/, '');

    // التحقق من رابط مختصر (e.tb.cn, m.tb.cn)
    if (/https?:\/\/(e|m)\.tb\.cn\//i.test(cleanUrl)) {
      resolvedUrl = result.url;
    } else if (result.type === 'redirect') {
      resolvedUrl = result.url;
    } else if (result.type === 'html') {
      // Extract target URL from the HTML page
      // Pattern: var url = '...'
      const match = result.body.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
      if (match) {
        resolvedUrl = match[1];
      }
    }

    if (resolvedUrl) {
      // Extract product ID from resolved URL
      let productId = null;
      let provider = null;

      const taobaoMatch = resolvedUrl.match(/[?&]id=(\d+)/);
      if (taobaoMatch) {
        productId = taobaoMatch[1];
        provider = resolvedUrl.includes('tmall.com') ? 'taobao' : 'taobao';
      }

      const match1688 = resolvedUrl.match(/1688\.com\/offer\/(\d+)/);
      if (match1688) {
        productId = match1688[1];
        provider = '1688';
      }

      // Amazon: https://www.amazon.com/dp/B0XXXXXX
      const amazonMatch = resolvedUrl.match(/amazon\.com.*\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (amazonMatch) {
        productId = amazonMatch[1];
        provider = 'amazon';
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ resolvedUrl, productId, provider }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'could not resolve URL', resolvedUrl: null }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
