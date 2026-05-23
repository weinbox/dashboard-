import { Hono } from 'hono';

const imageProxyRouter = new Hono();

imageProxyRouter.get('/', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'url required' }, 400);

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return c.json({ error: 'invalid url' }, 400);
  }

  // Only allow image CDN domains to prevent SSRF abuse
  const allowed = [
    // Chinese e-commerce CDNs
    'alicdn.com', 'taobao.com', 'tmall.com',
    'aliyuncs.com', 'aliimg.com', '1688.com',
    // Amazon CDNs
    'm.media-amazon.com', 'images-amazon.com', 'ssl-images-amazon.com',
    'media-amazon.com',
    // eBay CDNs
    'ebayimg.com', 'ebaystatic.com',
    // Walmart CDNs
    'walmartimages.com', 'i5.walmartimages.com',
    // Temu / Google Shopping thumbnails
    'aimg.kwcdn.com', 'img.kwcdn.com', 'cdn.temu.com',
    'encrypted-tbn0.gstatic.com', 'encrypted-tbn1.gstatic.com',
    'encrypted-tbn2.gstatic.com', 'encrypted-tbn3.gstatic.com',
    // iHerb
    'cloudinary.com', 'iherb.com',
    // General Shopify / CDN
    'cdn.shopify.com',
  ];
  let hostname: string;
  try {
    hostname = new URL(decoded).hostname;
  } catch {
    return c.json({ error: 'invalid url' }, 400);
  }
  if (!allowed.some((d) => hostname.endsWith(d))) {
    return c.json({ error: 'domain not allowed' }, 403);
  }

  try {
    const upstream = await fetch(decoded, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)' },
    });
    if (!upstream.ok) {
      return c.json({ error: 'upstream failed' }, 502);
    }
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return c.json({ error: 'fetch failed' }, 502);
  }
});

export { imageProxyRouter };
