const https = require('https');

function makeRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: headers || {},
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({ status: false, msg: 'Invalid JSON response', raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, username, password, token, ...params } = JSON.parse(event.body || '{}');

    if (action === 'login') {
      const body = new URLSearchParams({ username, password }).toString();
      const result = await makeRequest(
        'https://api.alwaseet-iq.net/v1/merchant/login',
        'POST',
        { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        body
      );
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
    }

    if (action === 'package-sizes') {
      const result = await makeRequest(
        'https://api.alwaseet-iq.net/v1/merchant/package-sizes',
        'GET',
        { 'Content-Type': 'application/x-www-form-urlencoded', token }
      );
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
    }

    if (action === 'create-order') {
      const body = new URLSearchParams(params).toString();
      const result = await makeRequest(
        `https://api.alwaseet-iq.net/v1/merchant/create-order?token=${token}`,
        'POST',
        { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        body
      );
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
    }

    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
