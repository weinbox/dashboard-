import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { formatIQD, detectCategory, parseWeightKgFromTitle, parseWeightKgFromSpecs, defaultWeightKg, KG_TO_LBS } from "../_shared/pricing.ts";
import type { ProductDetail, VariantGroup } from "../_shared/types.ts";

const SERPAPI_BASE = "https://serpapi.com/search";
function getEnv(key: string): string { return Deno.env.get(key) ?? ""; }

function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null;
  const fnUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return `${fnUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}

function stripHtml(str: string | undefined | null): string | null {
  if (!str) return null;
  return str.replace(/<[^>]*>/g, "").trim() || null;
}

function emptyDetail(title: string, price: string): ProductDetail {
  return { title, price, images: [], rating: null, reviewCount: null, availability: null, brand: null, aboutItem: [], specifications: [], badges: [], description: null, variantGroups: [] };
}

async function fetchEbayDetail(itemId: string): Promise<ProductDetail> {
  if (!itemId || itemId.length < 10) throw new Error("Invalid eBay item ID");
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "ebay"); url.searchParams.set("_nkw", itemId); url.searchParams.set("api_key", getEnv("SERPAPI_KEY"));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`eBay error: ${res.status}`);
  const data = await res.json();
  const results = data.organic_results ?? [];
  const item = results.find((r: any) => r.link?.match(/\/itm\/(?:[^/?]+\/)?(\d{10,})/)?.[1] === itemId || r.item_id === itemId) ?? results[0];
  if (!item) throw new Error("eBay item not found");
  const usdPrice = item.price?.extracted ?? null;
  const title = item.title ?? "";
  return { title, price: formatIQD(usdPrice, detectCategory(title)), images: item.thumbnail ? [proxyImage(item.thumbnail)!] : [], rating: null, reviewCount: null, availability: null, brand: null, aboutItem: [], specifications: item.condition ? [{ name: "الحالة", value: item.condition }] : [], badges: [], description: null, variantGroups: [] };
}

async function fetchAmazonDetail(asin: string): Promise<ProductDetail> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "amazon_product"); url.searchParams.set("asin", asin); url.searchParams.set("api_key", getEnv("SERPAPI_KEY"));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Amazon error: ${res.status}`);
  const data = await res.json();
  const p = data.product_results ?? {};
  const images: string[] = (Array.isArray(p.thumbnails) ? p.thumbnails.filter((t: any) => typeof t === "string") : []).map((t: string) => proxyImage(t)!);
  const specifications: { name: string; value: string }[] = [];
  for (const src of [data.item_specifications, data.product_details]) {
    if (src && typeof src === "object") { for (const [name, value] of Object.entries(src)) { if (typeof value === "string") specifications.push({ name: name.replace(/_/g, " "), value }); } }
  }
  const badges: string[] = Array.isArray(p.badges) ? p.badges.filter((s: any) => typeof s === "string") : [];
  if (p.bought_last_month) badges.push(`${p.bought_last_month} bought last month`);
  if (p.discount) badges.push(p.discount);
  const rawPriceNum = parseFloat(String(p.price ?? "").replace(/[^0-9.]/g, ""));
  const amazonTitle = p.title ?? "";
  const amazonCategory = detectCategory(amazonTitle);
  const amazonWeightKg = parseWeightKgFromSpecs(specifications) ?? parseWeightKgFromTitle(amazonTitle) ?? defaultWeightKg(amazonCategory);
  const priceText = formatIQD(isNaN(rawPriceNum) ? null : rawPriceNum, amazonCategory, Math.max(0.5, amazonWeightKg * KG_TO_LBS));
  const variantGroups: VariantGroup[] = (p.variants ?? []).filter((g: any) => g.title && Array.isArray(g.items)).map((g: any) => ({ title: g.title!, items: g.items!.filter((item: any) => item.asin && item.name).map((item: any) => ({ asin: item.asin!, name: item.name!, image: item.image, selected: item.selected ?? false })) }));
  return { title: p.title ?? "", price: priceText, images, rating: p.rating ?? null, reviewCount: p.reviews ?? null, availability: p.availability ?? null, brand: p.brand ?? null, aboutItem: Array.isArray(data.about_item) ? data.about_item.filter((s: any) => typeof s === "string") : [], specifications, badges, description: null, variantGroups };
}

async function fetchWalmartDetail(productId: string): Promise<ProductDetail> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "walmart_product"); url.searchParams.set("product_id", productId); url.searchParams.set("api_key", getEnv("SERPAPI_KEY"));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Walmart error: ${res.status}`);
  const data = await res.json();
  const p = data.product_results ?? {};
  const images: string[] = Array.isArray(p.images) ? p.images.filter((s: any) => typeof s === "string") : [];
  const specifications: { name: string; value: string }[] = [];
  if (Array.isArray(p.specifications)) { for (const spec of p.specifications) { if (spec?.name && spec?.value) specifications.push({ name: spec.name, value: spec.value }); } }
  const currentPrice = p.price_map?.price ?? null;
  const wTitle = p.title ?? "";
  const wCat = detectCategory(wTitle);
  const wKg = parseWeightKgFromSpecs(specifications) ?? parseWeightKgFromTitle(wTitle) ?? defaultWeightKg(wCat);
  const priceText = formatIQD(currentPrice, wCat, Math.max(0.5, wKg * KG_TO_LBS));
  return { title: p.title ?? "", price: priceText, images, rating: p.rating ?? null, reviewCount: p.reviews ?? null, availability: p.in_stock != null ? (p.in_stock ? "In Stock" : "Out of Stock") : null, brand: p.manufacturer ?? null, aboutItem: Array.isArray(p.highlights) ? p.highlights.filter((s: any) => typeof s === "string") : [], specifications, badges: Array.isArray(p.badges) ? p.badges.map((b: any) => b.name ?? "").filter(Boolean) : [], description: stripHtml(p.short_description_html), variantGroups: [] };
}

async function fetchIherbDetail(productUrl: string): Promise<ProductDetail> {
  const apifyKey = getEnv("APIFY_API_KEY");
  if (!apifyKey) throw new Error("APIFY_API_KEY not configured");
  const runRes = await fetch(`https://api.apify.com/v2/acts/vaunted~iherb-scraper/run-sync-get-dataset-items?token=${apifyKey}&timeout=55&memory=256`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startUrls: [{ url: productUrl }], maxItems: 1 }),
  });
  if (!runRes.ok) throw new Error(`Apify failed: ${runRes.status}`);
  const items = await runRes.json();
  const item = Array.isArray(items) ? items[0] : null;
  if (!item) throw new Error("No data from Apify");
  const rawPrice = item.price ?? item.originalPrice;
  const priceNum = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice ?? ""));
  const priceText = formatIQD(isNaN(priceNum) ? null : priceNum, detectCategory(item.name ?? item.title ?? ""));
  const images: string[] = Array.isArray(item.images) ? item.images.filter((s: any) => typeof s === "string" && s.startsWith("http")) : item.image ? [item.image] : [];
  const aboutItem: string[] = [...(item.highlights ?? []), ...(item.features ?? [])];
  if (item.ingredients) aboutItem.push(`المكونات: ${item.ingredients.slice(0, 300)}`);
  const specifications: { name: string; value: string }[] = [];
  if (Array.isArray(item.supplementFacts)) { for (const fact of item.supplementFacts) { if (fact?.name) specifications.push({ name: fact.name, value: fact.perServing ?? fact.value ?? "" }); } }
  return { title: item.name ?? item.title ?? "", price: priceText, images, rating: item.rating ?? null, reviewCount: item.reviewCount ?? item.numberOfRatings ?? null, availability: item.inStock != null ? (item.inStock ? "In Stock" : "Out of Stock") : (item.availability ?? null), brand: item.brand ?? null, aboutItem, specifications, badges: [], description: item.description ?? null, variantGroups: [] };
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform")?.toLowerCase();
  const id = url.searchParams.get("id");

  if (!platform || !["amazon", "walmart", "ebay", "iherb"].includes(platform)) {
    return new Response(JSON.stringify({ error: { message: "platform must be amazon, walmart, ebay, or iherb" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!id || id.trim() === "") {
    return new Response(JSON.stringify({ error: { message: "id is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    let detail: ProductDetail;
    if (platform === "ebay") detail = await fetchEbayDetail(id.trim());
    else if (platform === "amazon") detail = await fetchAmazonDetail(id.trim());
    else if (platform === "walmart") detail = await fetchWalmartDetail(id.trim());
    else {
      const productUrl = url.searchParams.get("url");
      if (!productUrl) return new Response(JSON.stringify({ error: { message: "url required for iherb" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      detail = await fetchIherbDetail(decodeURIComponent(productUrl));
    }
    return new Response(JSON.stringify({ data: { detail } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const title = url.searchParams.get("title") ?? "";
    const price = url.searchParams.get("price") ?? "";
    return new Response(JSON.stringify({ data: { detail: emptyDetail(title, price) } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
