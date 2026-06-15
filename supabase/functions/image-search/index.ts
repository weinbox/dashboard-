import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { formatIQD, formatIQD_China, detectCategory, parseWeightKgFromTitle, defaultWeightKg, KG_TO_LBS, loadPricing } from "../_shared/pricing.ts";
import type { Product } from "../_shared/types.ts";

const SERPAPI_BASE = "https://serpapi.com/search";
function getEnv(key: string): string { return Deno.env.get(key) ?? ""; }

function proxyImage(url: string | null): string | null {
  if (!url) return null;
  const fnUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return `${fnUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}

function parsePrice(raw: string | undefined | null, title = ""): { price: number | null; priceText: string } {
  if (!raw) return { price: null, priceText: "" };
  const numeric = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  const price = isNaN(numeric) ? null : numeric;
  const category = detectCategory(title);
  const weightKg = parseWeightKgFromTitle(title) ?? defaultWeightKg(category);
  const weightLbs = weightKg * KG_TO_LBS;
  return { price, priceText: formatIQD(price, category, weightLbs) };
}

async function searchPlatform(query: string, platform: string): Promise<Product[]> {
  const apiKey = getEnv("SERPAPI_KEY");
  if (platform === "ebay") {
    const url = new URL(SERPAPI_BASE);
    url.searchParams.set("engine", "ebay"); url.searchParams.set("_nkw", query); url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic_results ?? []).map((item: any, i: number): Product => {
      const { price, priceText } = parsePrice(item.price?.raw, item.title ?? "");
      const itemId = item.item_id ?? item.link?.match(/\/itm\/(?:[^/?]+\/)?(\d{10,})/)?.[1] ?? String(i);
      return { id: `ebay-${itemId}`, title: item.title ?? "", price, priceText, image: proxyImage(item.thumbnail ?? null), platform: "ebay", url: item.link ?? "" };
    });
  }
  if (platform === "amazon") {
    const url = new URL(SERPAPI_BASE);
    url.searchParams.set("engine", "amazon"); url.searchParams.set("k", query); url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic_results ?? []).map((item: any, i: number): Product => {
      const rawPrice = typeof item.price === 'string' ? item.price : item.price?.raw;
      const { price, priceText } = parsePrice(rawPrice, item.title ?? "");
      return { id: `amazon-${item.asin ?? i}`, title: item.title ?? "", price, priceText, image: proxyImage(item.thumbnail ?? null), platform: "amazon", url: item.link ?? "" };
    });
  }
  if (platform === "walmart") {
    const url = new URL(SERPAPI_BASE);
    url.searchParams.set("engine", "walmart"); url.searchParams.set("query", query); url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic_results ?? []).map((item: any, i: number): Product => {
      const rawPrice = item.primary_price != null ? `$${item.primary_price}` : null;
      const { price, priceText } = parsePrice(rawPrice, item.title ?? "");
      return { id: `walmart-${item.product_id ?? i}`, title: item.title ?? "", price, priceText, image: proxyImage(item.thumbnail ?? null), platform: "walmart", url: item.product_page_url ?? "" };
    });
  }
  return [];
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  await loadPricing();

  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");
  if (!imageUrl || imageUrl.trim() === "") {
    return new Response(JSON.stringify({ error: { message: "url is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const lensUrl = new URL(SERPAPI_BASE);
    lensUrl.searchParams.set("engine", "google_lens"); lensUrl.searchParams.set("url", imageUrl.trim()); lensUrl.searchParams.set("api_key", getEnv("SERPAPI_KEY"));
    const lensRes = await fetch(lensUrl.toString());
    if (!lensRes.ok) throw new Error(`Lens error: ${lensRes.status}`);
    const lensData = await lensRes.json();

    const kgTitle = lensData.knowledge_graph?.title?.trim() || null;
    const vmTitle = (lensData.visual_matches ?? []).slice(0, 3).map((m: any) => m.title?.trim()).filter((t: any) => t && t.length > 4).sort((a: string, b: string) => b.length - a.length)[0] || null;
    const relatedQuery = lensData.related_searches?.find((r: any) => r.query?.trim())?.query?.trim() || null;
    const primaryQuery = kgTitle || vmTitle || relatedQuery || null;

    if (!primaryQuery) {
      return new Response(JSON.stringify({ data: { results: [] } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const platformsParam = url.searchParams.get("platforms");
    const requestedPlatforms = platformsParam ? platformsParam.split(",").map(p => p.trim().toLowerCase()) : ["amazon", "ebay", "walmart"];

    const settled = await Promise.allSettled(requestedPlatforms.map(p => searchPlatform(primaryQuery, p)));
    const results: Product[] = [];
    settled.forEach(outcome => { if (outcome.status === "fulfilled") results.push(...outcome.value); });

    return new Response(JSON.stringify({ data: { results, detectedQuery: primaryQuery } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: "Image search failed" } }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
