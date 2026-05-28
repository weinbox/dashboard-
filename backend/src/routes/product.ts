import { Hono } from "hono";
import { env } from "../env";
import { formatIQD, detectCategory } from "../lib/pricing";
import { parseWeightKgFromSpecs, parseWeightKgFromTitle, defaultWeightKg, KG_TO_LBS } from "../lib/weight";
import type { ProductDetail, VariantGroup } from "../types";

const productRouter = new Hono();

const SERPAPI_BASE = "https://serpapi.com/search";

function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null;
  return `${env.BACKEND_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function stripHtml(str: string | undefined | null): string | null {
  if (!str) return null;
  return str.replace(/<[^>]*>/g, "").trim() || null;
}

function emptyDetail(title: string, price: string): ProductDetail {
  return {
    title,
    price,
    images: [],
    rating: null,
    reviewCount: null,
    availability: null,
    brand: null,
    aboutItem: [],
    specifications: [],
    badges: [],
    description: null,
    variantGroups: [],
  };
}

interface AmazonProductResult {
  title?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  old_price?: string;
  discount?: string;
  thumbnails?: string[];
  availability?: string;
  brand?: string;
  badges?: string[];
  bought_last_month?: string;
  variants?: Array<{
    title?: string;
    items?: Array<{ asin?: string; name?: string; image?: string; selected?: boolean }>;
  }>;
}

interface AmazonTopLevel {
  product_results?: AmazonProductResult;
  about_item?: string[];
  item_specifications?: Record<string, string>;
  product_details?: Record<string, string>;
}


interface WalmartProductResult {
  title?: string;
  rating?: number;
  reviews?: number;
  price_map?: {
    price?: number;
    was_price?: { price?: number; priceString?: string };
  };
  images?: string[];
  short_description_html?: string;
  highlights?: string[];
  specifications?: Array<{ name?: string; value?: string }>;
  in_stock?: boolean;
  manufacturer?: string;
  badges?: Array<{ name?: string }>;
}

interface EbaySearchResult {
  title?: string;
  price?: { raw?: string; extracted?: number };
  thumbnail?: string;
  link?: string;
  condition?: string;
  item_id?: string;
  shipping?: { price?: string };
}

async function fetchEbayDetail(itemId: string): Promise<ProductDetail> {
  // itemId might be an index (short number) — can't fetch details for those
  if (!itemId || itemId.length < 10) throw new Error("Invalid eBay item ID");

  // Search eBay for this specific item ID using SerpAPI
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "ebay");
  url.searchParams.set("_nkw", itemId);
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`eBay SerpAPI error: ${res.status}`);

  const data = await res.json() as { organic_results?: EbaySearchResult[] };
  const results = data.organic_results ?? [];

  // Find the result matching our item ID from its link
  const item = results.find(r => {
    const idFromLink = r.link?.match(/\/itm\/(?:[^/?]+\/)?(\d{10,})/)?.[1];
    return idFromLink === itemId || r.item_id === itemId;
  }) ?? results[0];

  if (!item) throw new Error("eBay item not found");

  const usdPrice = item.price?.extracted ?? null;
  const ebayTitle = item.title ?? "";

  return {
    title: ebayTitle,
    price: formatIQD(usdPrice, detectCategory(ebayTitle)),
    images: item.thumbnail ? [proxyImage(item.thumbnail) as string] : [],
    rating: null,
    reviewCount: null,
    availability: null,
    brand: null,
    aboutItem: [],
    specifications: item.condition ? [{ name: "الحالة", value: item.condition }] : [],
    badges: [],
    description: null,
    variantGroups: [],
  };
}

async function fetchAmazonDetail(asin: string): Promise<ProductDetail> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "amazon_product");
  url.searchParams.set("asin", asin);
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Amazon product SerpAPI error: ${res.status}`);

  const data = (await res.json()) as AmazonTopLevel;
  const p = data.product_results ?? {};

  // Images from thumbnails (top quality) — proxied through our backend for reliability
  const images: string[] = (Array.isArray(p.thumbnails)
    ? p.thumbnails.filter((t): t is string => typeof t === "string")
    : []
  ).map((t) => proxyImage(t) as string);

  // Specifications: merge item_specifications + product_details (both at top level)
  const specifications: { name: string; value: string }[] = [];
  for (const src of [data.item_specifications, data.product_details]) {
    if (src && typeof src === "object") {
      for (const [name, value] of Object.entries(src)) {
        if (typeof value === "string") {
          specifications.push({ name: name.replace(/_/g, " "), value });
        }
      }
    }
  }

  // Badges
  const badges: string[] = Array.isArray(p.badges)
    ? p.badges.filter((s): s is string => typeof s === "string")
    : [];
  if (p.bought_last_month) badges.push(`${p.bought_last_month} bought last month`);
  if (p.discount) badges.push(p.discount);

  const rawPriceNum = parseFloat(String(p.price ?? "").replace(/[^0-9.]/g, ""));
  const amazonTitle = p.title ?? "";
  const amazonCategory = detectCategory(amazonTitle);
  const PACKAGING_KG = 0.3;
  const rawAmazonWeightKg =
    parseWeightKgFromSpecs(specifications) ??
    parseWeightKgFromTitle(amazonTitle) ??
    null;
  const amazonWeightKg = rawAmazonWeightKg !== null
    ? rawAmazonWeightKg + PACKAGING_KG
    : defaultWeightKg(amazonCategory);
  const amazonWeightLbs = Math.max(0.5, amazonWeightKg * KG_TO_LBS);
  const priceText = formatIQD(isNaN(rawPriceNum) ? null : rawPriceNum, amazonCategory, amazonWeightLbs);

  // Variant groups
  const variantGroups: VariantGroup[] = (p.variants ?? [])
    .filter(g => g.title && Array.isArray(g.items))
    .map(g => ({
      title: g.title!,
      items: g.items!
        .filter(item => item.asin && item.name)
        .map(item => ({
          asin: item.asin!,
          name: item.name!,
          image: item.image,
          selected: item.selected ?? false,
        })),
    }));

  return {
    title: p.title ?? "",
    price: priceText,
    images,
    rating: p.rating ?? null,
    reviewCount: p.reviews ?? null,
    availability: p.availability ?? null,
    brand: p.brand ?? null,
    aboutItem: Array.isArray(data.about_item)
      ? data.about_item.filter((s): s is string => typeof s === "string")
      : [],
    specifications,
    badges,
    description: null,
    variantGroups,
  };
}

async function fetchWalmartDetail(productId: string): Promise<ProductDetail> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "walmart_product");
  url.searchParams.set("product_id", productId);
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Walmart product SerpAPI error: ${res.status}`);

  const data = (await res.json()) as { product_results?: WalmartProductResult };
  const p = data.product_results ?? {};

  // Images (array of strings)
  const images: string[] = Array.isArray(p.images)
    ? p.images.filter((s): s is string => typeof s === "string")
    : [];

  // Specifications
  const specifications: { name: string; value: string }[] = [];
  if (Array.isArray(p.specifications)) {
    for (const spec of p.specifications) {
      if (spec?.name && spec?.value) {
        specifications.push({ name: spec.name, value: spec.value });
      }
    }
  }

  // Price with was_price — weight extracted after specs are built
  const currentPrice = p.price_map?.price ?? null;
  const walmartTitle = p.title ?? "";
  const walmartCategory = detectCategory(walmartTitle);
  const PACKAGING_KG_W = 0.3;
  const rawWalmartWeightKg =
    parseWeightKgFromSpecs(specifications) ??
    parseWeightKgFromTitle(walmartTitle) ??
    null;
  const walmartWeightKg = rawWalmartWeightKg !== null
    ? rawWalmartWeightKg + PACKAGING_KG_W
    : defaultWeightKg(walmartCategory);
  const walmartWeightLbs = Math.max(0.5, walmartWeightKg * KG_TO_LBS);
  const priceText = formatIQD(currentPrice, walmartCategory, walmartWeightLbs);

  const description = stripHtml(p.short_description_html);

  return {
    title: p.title ?? "",
    price: priceText,
    images,
    rating: p.rating ?? null,
    reviewCount: p.reviews ?? null,
    availability: p.in_stock != null ? (p.in_stock ? "In Stock" : "Out of Stock") : null,
    brand: p.manufacturer ?? null,
    aboutItem: Array.isArray(p.highlights) ? p.highlights.filter((s): s is string => typeof s === "string") : [],
    specifications,
    badges: Array.isArray(p.badges) ? p.badges.map((b) => b.name ?? "").filter(Boolean) : [],
    description,
    variantGroups: [],
  };
}

interface ApifyIherbItem {
  name?: string;
  title?: string;
  url?: string;
  price?: number | string;
  originalPrice?: number | string;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  numberOfRatings?: number;
  images?: string[];
  image?: string;
  brand?: string;
  availability?: string;
  inStock?: boolean;
  description?: string;
  ingredients?: string;
  supplementFacts?: Array<{ name?: string; value?: string; perServing?: string }>;
  highlights?: string[];
  features?: string[];
  categories?: string[];
}

async function fetchIherbDetail(productUrl: string): Promise<ProductDetail> {
  if (!env.APIFY_API_KEY) throw new Error("APIFY_API_KEY not configured");

  const runRes = await fetch(
    `https://api.apify.com/v2/acts/vaunted~iherb-scraper/run-sync-get-dataset-items?token=${env.APIFY_API_KEY}&timeout=55&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: productUrl }],
        maxItems: 1,
      }),
    }
  );

  if (!runRes.ok) throw new Error(`Apify run failed: ${runRes.status}`);

  const items = await runRes.json() as ApifyIherbItem[];
  const item = Array.isArray(items) ? items[0] : null;
  if (!item) throw new Error("No data returned from Apify");

  const rawPrice = item.price ?? item.originalPrice;
  const priceNum = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice ?? ""));
  const priceText = formatIQD(isNaN(priceNum) ? null : priceNum, detectCategory(item.name ?? item.title ?? ""));

  const images: string[] = Array.isArray(item.images)
    ? item.images.filter((s): s is string => typeof s === "string" && s.startsWith("http"))
    : item.image ? [item.image] : [];

  const aboutItem: string[] = [];
  if (Array.isArray(item.highlights)) aboutItem.push(...item.highlights.filter((s): s is string => typeof s === "string"));
  if (Array.isArray(item.features)) aboutItem.push(...item.features.filter((s): s is string => typeof s === "string"));
  if (item.ingredients && typeof item.ingredients === "string" && item.ingredients.length > 0) {
    aboutItem.push(`المكونات: ${item.ingredients.slice(0, 300)}`);
  }

  const specifications: { name: string; value: string }[] = [];
  if (Array.isArray(item.supplementFacts)) {
    for (const fact of item.supplementFacts) {
      if (fact?.name) {
        specifications.push({ name: fact.name, value: fact.perServing ?? fact.value ?? "" });
      }
    }
  }

  const availability = item.inStock != null
    ? (item.inStock ? "In Stock" : "Out of Stock")
    : (item.availability ?? null);

  return {
    title: item.name ?? item.title ?? "",
    price: priceText,
    images,
    rating: item.rating ?? null,
    reviewCount: item.reviewCount ?? item.numberOfRatings ?? null,
    availability,
    brand: item.brand ?? null,
    aboutItem,
    specifications,
    badges: [],
    description: item.description ?? null,
    variantGroups: [],
  };
}

productRouter.get("/", async (c) => {
  const platform = c.req.query("platform")?.toLowerCase();
  const id = c.req.query("id");

  if (!platform || !["amazon", "walmart", "ebay", "iherb"].includes(platform)) {
    return c.json(
      { error: { message: "Query parameter 'platform' must be 'amazon', 'walmart', 'ebay', or 'iherb'", code: "INVALID_PLATFORM" } },
      400
    );
  }

  if (!id || id.trim() === "") {
    return c.json(
      { error: { message: "Query parameter 'id' is required", code: "MISSING_ID" } },
      400
    );
  }

  if (platform === "ebay") {
    try {
      const detail = await fetchEbayDetail(id.trim());
      return c.json({ data: { detail } });
    } catch (err) {
      console.error(`eBay detail fetch failed for ${id}:`, err);
      const title = c.req.query("title") ?? "";
      const price = c.req.query("price") ?? "";
      return c.json({ data: { detail: emptyDetail(title, price) } });
    }
  }

  if (platform === "iherb") {
    const productUrl = c.req.query("url");
    if (!productUrl) {
      return c.json({ error: { message: "Query parameter 'url' is required for iherb", code: "MISSING_URL" } }, 400);
    }
    try {
      const detail = await fetchIherbDetail(decodeURIComponent(productUrl));
      return c.json({ data: { detail } });
    } catch (err) {
      console.error("iHerb detail fetch failed:", err);
      const title = c.req.query("title") ?? "";
      const price = c.req.query("price") ?? "";
      return c.json({ data: { detail: emptyDetail(title, price) } });
    }
  }

  try {
    let detail: ProductDetail;
    if (platform === "amazon") {
      detail = await fetchAmazonDetail(id.trim());
    } else {
      detail = await fetchWalmartDetail(id.trim());
    }
    return c.json({ data: { detail } });
  } catch (err) {
    console.error(`Product detail fetch failed for ${platform}/${id}:`, err);
    return c.json(
      { error: { message: "Failed to fetch product details", code: "FETCH_ERROR" } },
      502
    );
  }
});

export { productRouter };
