import { Hono } from "hono";
import { env } from "../env";
import { supabase } from "../lib/supabase";
import { upsertTrendingSearch } from "../lib/db";
import { formatIQD, formatIQD_China, detectCategory, batchClassify, calcShipping, USD_TO_IQD, IQD_MARKUP, CNY_TO_USD } from "../lib/pricing";
import { parseWeightKgFromTitle, defaultWeightKg, KG_TO_LBS } from "../lib/weight";
import type { Product, ProductVariant } from "../types";

const searchRouter = new Hono();

const SERPAPI_BASE = "https://serpapi.com/search";

function proxyImage(url: string | null): string | null {
  if (!url) return null;
  return `${env.BACKEND_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function parsePrice(raw: string | undefined | null, title = ""): { price: number | null; priceText: string } {
  if (!raw) return { price: null, priceText: "" };
  const numeric = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  const price = isNaN(numeric) ? null : numeric;
  const category = detectCategory(title);
  const weightKg = parseWeightKgFromTitle(title) ?? defaultWeightKg(category);
  const weightLbs = weightKg * KG_TO_LBS;
  return {
    price,
    priceText: formatIQD(price, category, weightLbs),
  };
}

interface EbayResult {
  item_id?: string;
  title?: string;
  price?: { raw?: string };
  thumbnail?: string;
  link?: string;
  seller?: { name?: string };
}

interface AmazonResult {
  asin?: string;
  title?: string;
  price?: string | { raw?: string; symbol?: string; value?: number };
  thumbnail?: string;
  link?: string;
  rating?: number;
  reviews?: number;
  seller?: string;
  variants?: {
    options?: Array<{ asin?: string; title?: string; link?: string }>;
  };
}

interface WalmartResult {
  product_id?: string | number;
  title?: string;
  primary_price?: number | string;
  thumbnail?: string;
  product_page_url?: string;
  rating?: number;
  reviews?: number;
  seller_name?: string;
}

async function searchEbay(query: string, page = 1): Promise<Product[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "ebay");
  url.searchParams.set("_nkw", query);
  url.searchParams.set("_pgn", String(page));
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`eBay SerpAPI error: ${res.status}`);

  const data = (await res.json()) as { organic_results?: EbayResult[] };
  const results = data.organic_results ?? [];

  return results.map((item, index): Product => {
    const { price, priceText } = parsePrice(item.price?.raw, item.title ?? "");
    const itemIdFromLink = item.link?.match(/\/itm\/(?:[^/?]+\/)?(\d{10,})/)?.[1];
    const itemId = item.item_id ?? itemIdFromLink ?? String(index);
    return {
      id: `ebay-${itemId}`,
      title: item.title ?? "",
      price,
      priceText,
      image: proxyImage(item.thumbnail ?? null),
      platform: "ebay",
      url: item.link ?? "",
      seller: item.seller?.name,
    };
  });
}

async function searchAmazon(query: string, page = 1): Promise<Product[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "amazon");
  url.searchParams.set("k", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Amazon SerpAPI error: ${res.status}`);

  const data = (await res.json()) as { organic_results?: AmazonResult[] };
  const results = data.organic_results ?? [];

  const products = results.map((item, index): Product => {
    const rawPrice = typeof item.price === 'string' ? item.price : item.price?.raw;
    const { price, priceText } = parsePrice(rawPrice, item.title ?? "");
    const variants: ProductVariant[] = (item.variants?.options ?? [])
      .filter((v): v is { asin: string; title: string; link?: string } => !!(v.asin && v.title))
      .map(v => ({ asin: v.asin, title: v.title, url: v.link ?? item.link ?? '' }));
    return {
      id: `amazon-${item.asin ?? index}`,
      title: item.title ?? "",
      price,
      priceText,
      image: proxyImage(item.thumbnail ?? null),
      platform: "amazon",
      url: item.link ?? "",
      rating: item.rating,
      reviewCount: item.reviews,
      seller: item.seller,
      variants: variants.length > 0 ? variants : undefined,
    };
  });

  // Deduplicate by variant group — many results are just color/size variants of the same item
  const seen = new Set<string>();
  const deduped: Product[] = [];
  for (const product of products) {
    const variantAsins = (product.variants ?? []).map(v => v.asin).sort().join(',');
    const key = variantAsins || product.id;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(product);
    }
  }
  return deduped;
}

async function searchWalmart(query: string, page = 1): Promise<Product[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "walmart");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Walmart SerpAPI error: ${res.status}`);

  const data = (await res.json()) as { organic_results?: WalmartResult[] };
  const results = data.organic_results ?? [];

  return results.map((item, index): Product => {
    const rawPrice =
      item.primary_price != null ? `$${item.primary_price}` : null;
    const { price, priceText } = parsePrice(rawPrice, item.title ?? "");
    return {
      id: `walmart-${item.product_id ?? index}`,
      title: item.title ?? "",
      price,
      priceText,
      image: proxyImage(item.thumbnail ?? null),
      platform: "walmart",
      url: item.product_page_url ?? "",
      rating: item.rating,
      reviewCount: item.reviews,
      seller: item.seller_name,
    };
  });
}

const RAPIDAPI_HOST_TAOBAO1688 = "taobao-1688-api1.p.rapidapi.com";

function getRapidAPIHeaders(host: string) {
  return {
    "X-RapidAPI-Key": env.RAPIDAPI_KEY ?? "",
    "X-RapidAPI-Host": host,
    "Content-Type": "application/json",
  };
}

interface Taobao1688Item {
  id?: string | number;
  num_iid?: string | number;
  title?: string;
  price?: number | string;
  promotion_price?: number | string;
  image?: string;
  pic_url?: string;
  detail_url?: string;
  seller_nick?: string;
  sales?: number | string;
  repurchaseRate?: string;
}

interface Taobao1688Response {
  success?: boolean;
  code?: number;
  data?: {
    items?: Taobao1688Item[];
    total_results?: number;
  };
}

function isArabicQuery(query: string): boolean {
  return /[\u0600-\u06FF]/.test(query);
}

function isEnglishQuery(query: string): boolean {
  return /^[a-zA-Z0-9\s\-_.,!?'"()&]+$/.test(query.trim());
}

async function translateToEnglishIfNeeded(query: string): Promise<string> {
  if (isEnglishQuery(query)) return query;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Translate the user's product search query to English. Return only the translated query, nothing else. Keep product names and brands as-is.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });
    if (!res.ok) return query;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const translated = data.choices?.[0]?.message?.content?.trim();
    return translated || query;
  } catch {
    return query;
  }
}

function isChineseQuery(query: string): boolean {
  return /[\u4e00-\u9fff]/.test(query);
}

async function translateToChineseIfNeeded(query: string): Promise<string> {
  if (isChineseQuery(query)) return query;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Translate the user's product search query to Simplified Chinese (Mandarin). Return only the translated query, nothing else.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });
    if (!res.ok) return query;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const translated = data.choices?.[0]?.message?.content?.trim();
    return translated || query;
  } catch {
    return query;
  }
}

function mapTaobao1688Item(item: Taobao1688Item, platform: "taobao" | "1688", index: number): Product {
  const rawPrice = item.promotion_price ?? item.price;
  const cnyPrice = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice ?? ""));
  const usdPrice = isNaN(cnyPrice) ? null : cnyPrice / CNY_TO_USD;
  const title = item.title ?? "";
  const category = detectCategory(title);
  const weightKg = parseWeightKgFromTitle(title) ?? defaultWeightKg(category);
  const priceText = usdPrice !== null ? formatIQD_China(usdPrice, weightKg) : '';
  const id = String(item.num_iid ?? item.id ?? index);
  const defaultUrl = platform === "taobao"
    ? `https://item.taobao.com/item.htm?id=${id}`
    : `https://detail.1688.com/offer/${id}.html`;
  const salesNum = typeof item.sales === "number" ? item.sales : parseInt(String(item.sales ?? "0"), 10);
  return {
    id: `${platform}-${id}`,
    title: item.title ?? "",
    price: usdPrice,
    priceText,
    image: (() => { const rawImage = item.image ?? item.pic_url ?? null; const normalized = rawImage ? (rawImage.startsWith('//') ? `https:${rawImage}` : rawImage.startsWith('http') ? rawImage : `https://${rawImage}`) : null; return proxyImage(normalized); })(),
    platform,
    url: item.detail_url ?? defaultUrl,
    seller: item.seller_nick,
    sales: isNaN(salesNum) ? undefined : salesNum,
    repurchaseRate: item.repurchaseRate,
  };
}

async function searchTaobao(query: string, page = 1): Promise<Product[]> {
  if (!env.RAPIDAPI_KEY) return [];
  const chineseQuery = await translateToChineseIfNeeded(query);
  const url = `https://${RAPIDAPI_HOST_TAOBAO1688}/v7/search?keyword=${encodeURIComponent(chineseQuery)}&site=taobao&page=${page}`;
  const res = await fetch(url, { headers: getRapidAPIHeaders(RAPIDAPI_HOST_TAOBAO1688) });
  if (res.status === 429) {
    console.warn("Taobao RapidAPI monthly quota exceeded");
    return [];
  }
  if (!res.ok) throw new Error(`Taobao API error: ${res.status}`);

  const data = await res.json() as Taobao1688Response;
  if (!data.success || !data.data?.items) return [];

  return data.data.items.map((item, index) => mapTaobao1688Item(item, "taobao", index));
}

interface V5Item {
  offerId?: number | string;
  subject?: string;
  imageUrl?: string;
  priceInfo?: { price?: string; promotionPrice?: string; consignPrice?: string };
  link?: string;
  repurchaseRate?: string;
  monthSold?: number | string;
}

interface V5Response {
  success?: boolean;
  data?: V5Item[] | { items?: V5Item[] };
}

function mapV5Item(item: V5Item, index: number): Product {
  const rawPrice = item.priceInfo?.promotionPrice ?? item.priceInfo?.price ?? item.priceInfo?.consignPrice;
  const cnyPrice = rawPrice ? parseFloat(rawPrice) : NaN;
  const usdPrice = isNaN(cnyPrice) ? null : cnyPrice / CNY_TO_USD;
  const subject = item.subject ?? "";
  const category = detectCategory(subject);
  const weightKg = parseWeightKgFromTitle(subject) ?? defaultWeightKg(category);
  const priceText = usdPrice !== null ? formatIQD_China(usdPrice, weightKg) : '';
  const id = String(item.offerId ?? index);
  const salesNum = typeof item.monthSold === "number" ? item.monthSold : parseInt(String(item.monthSold ?? "0"), 10);
  return {
    id: `1688-${id}`,
    title: item.subject ?? "",
    price: usdPrice,
    priceText,
    image: (() => { const rawImage = item.imageUrl ?? null; const normalized = rawImage ? (rawImage.startsWith('//') ? `https:${rawImage}` : rawImage.startsWith('http') ? rawImage : `https://${rawImage}`) : null; return proxyImage(normalized); })(),
    platform: "1688",
    url: item.link ?? `https://detail.1688.com/offer/${id}.html`,
    sales: isNaN(salesNum) ? undefined : salesNum,
    repurchaseRate: item.repurchaseRate,
  };
}

async function search1688(query: string, page = 1): Promise<Product[]> {
  if (!env.RAPIDAPI_KEY) return [];
  const chineseQuery = await translateToChineseIfNeeded(query);
  const url = `https://${RAPIDAPI_HOST_TAOBAO1688}/v5/search?keyword=${encodeURIComponent(chineseQuery)}&site=1688&page=${page}`;
  const res = await fetch(url, { headers: getRapidAPIHeaders(RAPIDAPI_HOST_TAOBAO1688) });
  if (res.status === 429) {
    console.warn("1688 RapidAPI monthly quota exceeded");
    return [];
  }
  if (!res.ok) throw new Error(`1688 API error: ${res.status}`);

  const data = await res.json() as V5Response;
  const items: V5Item[] = Array.isArray(data.data)
    ? data.data
    : (data.data as { items?: V5Item[] })?.items ?? [];

  return items.map((item, index) => mapV5Item(item, index));
}

interface IherbProduct {
  productId?: string | number;
  displayName?: string;
  title?: string;
  price?: number | string;
  discount?: number | string;
  imageUrl?: string;
  pictureUrl?: string;
  productUrl?: string;
  averageRating?: number;
  rating?: number;
  reviewCount?: number;
  ratingCount?: number;
  brandName?: string;
  brand?: string;
}

interface GoogleShoppingResult {
  position?: number;
  title?: string;
  price?: string;
  extracted_price?: number;
  link?: string;
  product_link?: string;
  thumbnail?: string;
  source?: string;
  rating?: number;
  reviews?: number;
  seller?: string;
}

async function searchIherb(query: string, page = 1): Promise<Product[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", `${query} iherb`);
  url.searchParams.set("api_key", env.SERPAPI_KEY);
  url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en");
  url.searchParams.set("start", String((page - 1) * 20));

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json() as { shopping_results?: GoogleShoppingResult[] };
    const results = (data.shopping_results ?? [])
      .filter(r => (r.source ?? '').toLowerCase().includes('iherb'));

    return results.map((item, index): Product => {
      const price = item.extracted_price ?? null;
      const priceText = formatIQD(price, detectCategory(item.title ?? "")) || (item.price ?? '');
      return {
        id: `iherb-${item.position ?? index}`,
        title: item.title ?? '',
        price,
        priceText,
        image: proxyImage(item.thumbnail ?? null),
        platform: 'iherb',
        url: `https://www.iherb.com/search?kw=${encodeURIComponent(item.title ?? query)}`,
        rating: item.rating,
        reviewCount: item.reviews,
      };
    });
  } catch {
    return [];
  }
}


const platformSearchers: Record<string, (query: string, page: number) => Promise<Product[]>> = {
  ebay: searchEbay,
  amazon: searchAmazon,
  walmart: searchWalmart,
  taobao: searchTaobao,
  "1688": search1688,
  iherb: searchIherb,
};

searchRouter.get("/", async (c) => {
  const query = c.req.query("q");
  if (!query || query.trim() === "") {
    return c.json({ error: { message: "Query parameter 'q' is required", code: "MISSING_QUERY" } }, 400);
  }

  const platformsParam = c.req.query("platforms") ?? "ebay,amazon,walmart,taobao,1688,iherb";
  const requestedPlatforms = platformsParam
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p in platformSearchers);

  if (requestedPlatforms.length === 0) {
    return c.json({ error: { message: "No valid platforms specified", code: "INVALID_PLATFORMS" } }, 400);
  }

  // Translate to English BEFORE cache check so Arabic queries find correct cached results
  const chinesePlatforms = new Set(['taobao', '1688']);
  const hasNonChinesePlatforms = requestedPlatforms.some(p => !chinesePlatforms.has(p));
  const englishQuery = hasNonChinesePlatforms ? await translateToEnglishIfNeeded(query.trim()) : query.trim();

  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);

  const normalizedQuery = englishQuery.toLowerCase();
  const sortedPlatforms = [...requestedPlatforms].sort();
  const cacheKey = `${normalizedQuery}:${sortedPlatforms.join(",")}:p${page}`;

  // Check Supabase cache first
  try {
    const { data: cached, error } = await supabase
      .from("search_cache")
      .select("results, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (!error && cached) {
      const expiresAt = new Date(cached.expires_at as string);
      if (expiresAt > new Date()) {
        const cachedResults = cached.results as Product[];
        return c.json({ data: { results: cachedResults } });
      }
    }
  } catch {
    // Supabase unavailable or table missing — fall through to SerpAPI
  }

  const searches = requestedPlatforms.map((platform) => {
    const searcher = platformSearchers[platform];
    if (!searcher) return Promise.resolve([] as Product[]);
    // Chinese platforms get original query (they translate to Chinese internally)
    // Non-Chinese platforms get pre-translated English query
    const queryForPlatform = chinesePlatforms.has(platform) ? query.trim() : englishQuery;
    return searcher(queryForPlatform, page);
  });

  const settled = await Promise.allSettled(searches);

  const results: Product[] = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    } else {
      console.error(`Search failed for platform ${requestedPlatforms[i]}:`, outcome.reason);
    }
  });

  // AI batch-classify all product titles and update prices
  if (env.OPENAI_API_KEY && results.length > 0) {
    try {
      const titles = results.map(r => r.title);
      const classified = await batchClassify(titles, env.OPENAI_API_KEY);
      const chinesePlatformSet = new Set(['taobao', '1688']);
      results.forEach((r, i) => {
        const raw = classified[i] ?? { category: "regular" as const, weightKg: 0.5 };
        const { category } = raw;
        if (r.price !== null && r.price !== undefined) {
          if (chinesePlatformSet.has(r.platform)) {
            const weightKg = Math.max(0.5, raw.weightKg);
            r.priceText = formatIQD_China(r.price, weightKg);
          } else {
            const weightLbs = Math.max(0.5, raw.weightKg * KG_TO_LBS);
            const shipping = calcShipping(category, weightLbs);
            const iqd = Math.round(r.price * USD_TO_IQD * IQD_MARKUP) + shipping;
            r.priceText = `${iqd.toLocaleString("en")} دينار`;
          }
        }
      });
    } catch {
      // Keep keyword-based prices if AI fails
    }
  }

  // Sort by platform order
  const platformOrder: Record<string, number> = { ebay: 0, amazon: 1, walmart: 2, taobao: 3, "1688": 4, iherb: 5 };
  results.sort((a, b) => (platformOrder[a.platform] ?? 99) - (platformOrder[b.platform] ?? 99));

  // Track trending search if we got results
  if (results.length > 0) {
    try {
      upsertTrendingSearch(query.trim(), requestedPlatforms, results);
    } catch (err) {
      console.error("Failed to track trending search:", err);
    }
  }

  // Store fresh results in Supabase cache
  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from("search_cache").upsert({
      cache_key: cacheKey,
      results: results as unknown as Record<string, unknown>[],
      expires_at: oneHourFromNow,
    });
  } catch {
    // Cache write failure is non-fatal — search results are still returned
  }

  return c.json({ data: { results } });
});

export { searchRouter, searchAmazon, searchEbay, searchWalmart, searchTaobao, search1688, searchIherb };
