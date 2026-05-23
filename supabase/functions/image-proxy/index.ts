import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const allowed = [
  'alicdn.com', 'taobao.com', 'tmall.com', 'aliyuncs.com', 'aliimg.com', '1688.com',
  'm.media-amazon.com', 'images-amazon.com', 'ssl-images-amazon.com', 'media-amazon.com',
  'ebayimg.com', 'ebaystatic.com', 'walmartimages.com', 'i5.walmartimages.com',
  'aimg.kwcdn.com', 'img.kwcdn.com', 'cdn.temu.com',
  'encrypted-tbn0.gstatic.com', 'encrypted-tbn1.gstatic.com', 'encrypted-tbn2.gstatic.com', 'encrypted-tbn3.gstatic.com',
  'cloudinary.com', 'iherb.com', 'cdn.shopify.com',
];

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");
  if (!imageUrl) return new Response(JSON.stringify({ error: "url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let decoded: string;
  try { decoded = decodeURIComponent(imageUrl); } catch {
    return new Response(JSON.stringify({ error: "invalid url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let hostname: string;
  try { hostname = new URL(decoded).hostname; } catch {
    return new Response(JSON.stringify({ error: "invalid url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!allowed.some(d => hostname.endsWith(d))) {
    return new Response(JSON.stringify({ error: "domain not allowed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const upstream = await fetch(decoded, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)" } });
    if (!upstream.ok) return new Response(JSON.stringify({ error: "upstream failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new Response(upstream.body, { headers: { ...corsHeaders, "Content-Type": contentType, "Cache-Control": "public, max-age=86400" } });
  } catch {
    return new Response(JSON.stringify({ error: "fetch failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
