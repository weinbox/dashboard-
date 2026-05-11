const http = require('http');
const https = require('https');

function httpGet(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { timeout: 15000 }, (res) => {
      // Handle redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
        return resolve(httpGet(res.headers.location, maxRedirects - 1));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')));
  });
}

exports.handler = async (event) => {
  const resHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: resHeaders, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const method = params._method || 'SearchItemsFrame';

    const forwardParams = { ...params };
    delete forwardParams._method;

    const qs = Object.entries(forwardParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const url = `http://otapi.net/service-json/${method}?${qs}`;
    const data = await httpGet(url);

    return { statusCode: 200, headers: resHeaders, body: data };
  } catch (err) {
    return {
      statusCode: 500,
      headers: resHeaders,
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
