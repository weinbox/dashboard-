import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { getCnyToUsd, loadPricing } from "../_shared/pricing.ts";
import type { Product, ProductVariant } from "../_shared/types.ts";

const SERPAPI_BASE = "https://serpapi.com/search";

function getEnv(key: string): string {
  return Deno.env.get(key) ?? "";
}

function proxyImage(url: string | null): string | null {
  if (!url) return null;
  const fnUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return `${fnUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}

function parsePrice(raw: string | undefined | null, _title = ""): { price: number | null; priceText: string } {
  if (!raw) return { price: null, priceText: "" };
  const numeric = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  const price = isNaN(numeric) ? null : numeric;
  return { price, priceText: price !== null ? `$${price.toFixed(2)}` : "" };
}

function isEnglishQuery(q: string): boolean { return /^[a-zA-Z0-9\s\-_.,!?'"()&]+$/.test(q.trim()); }
function isChineseQuery(q: string): boolean { return /[\u4e00-\u9fff]/.test(q); }

async function translateWithOpenAI(query: string, targetLang: string): Promise<string> {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) return query;
  try {
    const sys = targetLang === "English"
      ? "Translate the user's product search query to English. Return only the translated query."
      : "Translate the user's product search query to Simplified Chinese. Return only the translated query.";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: sys }, { role: "user", content: query }], max_tokens: 100, temperature: 0 }),
    });
    if (!res.ok) return query;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || query;
  } catch { return query; }
}

async function translateToEnglish(q: string) { return isEnglishQuery(q) ? q : translateWithOpenAI(q, "English"); }
async function translateToChinese(q: string) { return isChineseQuery(q) ? q : translateWithOpenAI(q, "Chinese"); }

async function searchEbay(query: string, page = 1): Promise<Product[]> {
  const apiKey = getEnv("SERPAPI_KEY");
  const url = `${SERPAPI_BASE}?engine=ebay&_nkw=${encodeURIComponent(query)}&_pgn=${page}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.organic_results ?? []).map((item: any, i: number): Product => {
    const { price, priceText } = parsePrice(item.price?.raw, item.title ?? "");
    const itemId = item.item_id ?? item.link?.match(/\/itm\/(?:[^/?]+\/)?(\d{10,})/)?.[1] ?? String(i);
    return { id: `ebay-${itemId}`, title: item.title ?? "", price, priceText, image: proxyImage(item.thumbnail ?? null), platform: "ebay", url: item.link ?? "", seller: item.seller?.name };
  });
}

async function searchAmazon(query: string, page = 1): Promise<Product[]> {
  const apiKey = getEnv("SERPAPI_KEY");
  const url = `${SERPAPI_BASE}?engine=amazon&k=${encodeURIComponent(query)}&page=${page}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.organic_results ?? []).map((item: any, i: number): Product => {
    const rawPrice = typeof item.price === 'string' ? item.price : item.price?.raw;
    const { price, priceText } = parsePrice(rawPrice, item.title ?? "");
    const variants: ProductVariant[] = (item.variants?.options ?? []).filter((v: any) => v.asin && v.title).map((v: any) => ({ asin: v.asin, title: v.title, url: v.link ?? item.link ?? '' }));
    return { id: `amazon-${item.asin ?? i}`, title: item.title ?? "", price, priceText, image: proxyImage(item.thumbnail ?? null), platform: "amazon", url: item.link ?? "", rating: item.rating, reviewCount: item.reviews, seller: item.seller, variants: variants.length > 0 ? variants : undefined };
  });
}

async function searchWalmart(query: string, page = 1): Promise<Product[]> {
  const apiKey = getEnv("SERPAPI_KEY");
  const url = `${SERPAPI_BASE}?engine=walmart&query=${encodeURIComponent(query)}&page=${page}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.organic_results ?? []).map((item: any, i: number): Product => {
    const rawPrice = item.primary_price != null ? `$${item.primary_price}` : null;
    const { price, priceText } = parsePrice(rawPrice, item.title ?? "");
    return { id: `walmart-${item.product_id ?? i}`, title: item.title ?? "", price, priceText, image: proxyImage(item.thumbnail ?? null), platform: "walmart", url: item.product_page_url ?? "", rating: item.rating, reviewCount: item.reviews, seller: item.seller_name };
  });
}

function mapChinaItem(item: any, platform: "taobao" | "1688", index: number): Product {
  const rawPrice = item.promotion_price ?? item.price ?? item.priceInfo?.promotionPrice ?? item.priceInfo?.price;
  const cnyPrice = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice ?? ""));
  const usdPrice = isNaN(cnyPrice) ? null : cnyPrice / getCnyToUsd();
  const title = item.title ?? item.subject ?? "";
  const priceText = !isNaN(cnyPrice) ? `¥${cnyPrice.toFixed(0)}` : '';
  const id = String(item.num_iid ?? item.id ?? item.offerId ?? index);
  const defaultUrl = platform === "taobao" ? `https://item.taobao.com/item.htm?id=${id}` : `https://detail.1688.com/offer/${id}.html`;
  const rawImage = item.image ?? item.pic_url ?? item.imageUrl ?? null;
  const normalized = rawImage ? (rawImage.startsWith('//') ? `https:${rawImage}` : rawImage.startsWith('http') ? rawImage : `https://${rawImage}`) : null;
  return { id: `${platform}-${id}`, title, price: usdPrice, priceText, image: proxyImage(normalized), platform, url: item.detail_url ?? item.link ?? defaultUrl, seller: item.seller_nick };
}

async function searchTaobao(query: string, page = 1): Promise<Product[]> {
  const rapidKey = getEnv("RAPIDAPI_KEY");
  if (!rapidKey) return [];
  const chineseQuery = await translateToChinese(query);
  const host = "taobao-1688-api1.p.rapidapi.com";
  const url = `https://${host}/v7/search?keyword=${encodeURIComponent(chineseQuery)}&site=taobao&page=${page}`;
  const res = await fetch(url, { headers: { "X-RapidAPI-Key": rapidKey, "X-RapidAPI-Host": host } });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.success || !data.data?.items) return [];
  return data.data.items.map((item: any, i: number) => mapChinaItem(item, "taobao", i));
}

async function search1688(query: string, page = 1): Promise<Product[]> {
  const rapidKey = getEnv("RAPIDAPI_KEY");
  if (!rapidKey) return [];
  const chineseQuery = await translateToChinese(query);
  const host = "taobao-1688-api1.p.rapidapi.com";
  const url = `https://${host}/v5/search?keyword=${encodeURIComponent(chineseQuery)}&site=1688&page=${page}`;
  const res = await fetch(url, { headers: { "X-RapidAPI-Key": rapidKey, "X-RapidAPI-Host": host } });
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data.data) ? data.data : data.data?.items ?? [];
  return items.map((item: any, i: number) => mapChinaItem(item, "1688", i));
}

async function searchIherb(query: string, page = 1): Promise<Product[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "google_shopping"); url.searchParams.set("q", `${query} iherb`);
  url.searchParams.set("api_key", getEnv("SERPAPI_KEY")); url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en"); url.searchParams.set("start", String((page - 1) * 20));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.shopping_results ?? []).filter((r: any) => (r.source ?? '').toLowerCase().includes('iherb')).map((item: any, i: number): Product => {
      const price = item.extracted_price ?? null;
      const priceText = price !== null ? `$${price.toFixed(2)}` : (item.price ?? '');
      return { id: `iherb-${item.position ?? i}`, title: item.title ?? '', price, priceText, image: proxyImage(item.thumbnail ?? null), platform: 'iherb', url: `https://www.iherb.com/search?kw=${encodeURIComponent(item.title ?? query)}`, rating: item.rating, reviewCount: item.reviews };
    });
  } catch { return []; }
}

const platformSearchers: Record<string, (q: string, p: number) => Promise<Product[]>> = {
  ebay: searchEbay, amazon: searchAmazon, walmart: searchWalmart,
  taobao: searchTaobao, "1688": search1688, iherb: searchIherb,
};

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  await loadPricing();

  const url = new URL(req.url);
  const query = url.searchParams.get("q");
  if (!query || query.trim() === "") {
    return new Response(JSON.stringify({ error: { message: "Query parameter 'q' is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const platformsParam = url.searchParams.get("platforms") ?? "ebay,amazon,walmart,taobao,1688,iherb";
  const requestedPlatforms = platformsParam.split(",").map(p => p.trim().toLowerCase()).filter(p => p in platformSearchers);
  if (requestedPlatforms.length === 0) {
    return new Response(JSON.stringify({ error: { message: "No valid platforms" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const chinesePlatforms = new Set(['taobao', '1688']);
  const hasNonChinese = requestedPlatforms.some(p => !chinesePlatforms.has(p));
  const englishQuery = hasNonChinese ? await translateToEnglish(query.trim()) : query.trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  // Cache check
  const normalizedQuery = englishQuery.toLowerCase();
  const cacheKey = `v2:${normalizedQuery}:${[...requestedPlatforms].sort().join(",")}:p${page}`;
  const supabase = getSupabaseClient();

  try {
    const { data: cached } = await supabase.from("search_cache").select("results, expires_at").eq("cache_key", cacheKey).single();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify({ data: { results: cached.results } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch {}

  // Search
  const searches = requestedPlatforms.map(platform => {
    const searcher = platformSearchers[platform]!;
    const q = chinesePlatforms.has(platform) ? query.trim() : englishQuery;
    return searcher(q, page).catch(() => [] as Product[]);
  });

  const settled = await Promise.allSettled(searches);
  const results: Product[] = [];
  settled.forEach((outcome) => { if (outcome.status === "fulfilled") results.push(...outcome.value); });

  // Search results now show original currency prices ($USD / ¥CNY)
  // IQD conversion happens only on product detail page

  // Sort
  const platformOrder: Record<string, number> = { ebay: 0, amazon: 1, walmart: 2, taobao: 3, "1688": 4, iherb: 5 };
  results.sort((a, b) => (platformOrder[a.platform] ?? 99) - (platformOrder[b.platform] ?? 99));

  // Cache store
  try {
    const oneHour = new Date(Date.now() + 3600000).toISOString();
    await supabase.from("search_cache").upsert({ cache_key: cacheKey, results, expires_at: oneHour });
  } catch {}

  // Track trending
  try {
    if (results.length > 0) {
      await supabase.from("trending_searches").upsert(
        { query: query.trim().toLowerCase(), count: 1, platforms: JSON.stringify(requestedPlatforms), cached_products: JSON.stringify(results.slice(0, 10)), last_searched_at: new Date().toISOString() },
        { onConflict: "query" }
      );
      // Increment count
      const { data: existing } = await supabase.from("trending_searches").select("count").eq("query", query.trim().toLowerCase()).single();
      if (existing) {
        await supabase.from("trending_searches").update({ count: existing.count + 1, cached_products: JSON.stringify(results.slice(0, 10)), last_searched_at: new Date().toISOString() }).eq("query", query.trim().toLowerCase());
      }
    }
  } catch {}

  return new Response(JSON.stringify({ data: { results } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
