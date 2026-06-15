export const KG_TO_LBS = 2.20462;

export type ProductCategory = "perfume" | "hazardous" | "supplement" | "mobile" | "laptop" | "regular";

// ── Dynamic pricing settings (editable from the /admin dashboard) ──
// Defaults must match the seed values in supabase/sql/dashboard_schema.sql
interface PricingSettings {
  usd_to_iqd: number;
  iqd_markup: number;
  cny_to_usd: number;
  usd_to_iqd_china: number;
  china_shipping_per_kg: number;
  shipping_regular_per_lb: number;
  shipping_perfume_flat: number;
  shipping_hazardous_flat: number;
  shipping_supplement_per_lb: number;
  shipping_supplement_tax: number;
  shipping_mobile_flat: number;
  shipping_laptop_flat: number;
}

const DEFAULTS: PricingSettings = {
  usd_to_iqd: 1350,
  iqd_markup: 1.2,
  cny_to_usd: 6.5,
  usd_to_iqd_china: 1400,
  china_shipping_per_kg: 15_500,
  shipping_regular_per_lb: 8_900,
  shipping_perfume_flat: 40_000,
  shipping_hazardous_flat: 25_000,
  shipping_supplement_per_lb: 12_000,
  shipping_supplement_tax: 2_000,
  shipping_mobile_flat: 95_000,
  shipping_laptop_flat: 55_000,
};

let PRICING: PricingSettings = { ...DEFAULTS };
let lastFetch = 0;
let inFlight: Promise<void> | null = null;
const TTL_MS = 60_000;

async function fetchSettings(): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return;
    const res = await fetch(`${url}/rest/v1/settings?select=key,value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return;
    const rows = (await res.json()) as Array<{ key: string; value: number | string }>;
    const next: PricingSettings = { ...DEFAULTS };
    for (const r of rows) {
      if (r.key in next) {
        const n = Number(r.value);
        if (!isNaN(n)) (next as unknown as Record<string, number>)[r.key] = n;
      }
    }
    PRICING = next;
    lastFetch = Date.now();
  } catch {
    // keep last known good values
  }
}

/**
 * Loads pricing settings from the DB (cached for TTL_MS).
 * Call this once at the start of each request before formatting prices.
 */
export async function loadPricing(): Promise<void> {
  if (Date.now() - lastFetch < TTL_MS) return;
  if (!inFlight) inFlight = fetchSettings().finally(() => { inFlight = null; });
  await inFlight;
}

export function getCnyToUsd(): number {
  return PRICING.cny_to_usd;
}

export function detectCategory(title: string): ProductCategory {
  const t = title.toLowerCase();
  if (/iphone|samsung\s*galaxy|pixel\s+\d|oneplus|xiaomi.*phone|oppo|vivo|smartphone|موبايل|جوال|هاتف/.test(t)) return "mobile";
  if (/\blaptop\b|notebook|\bmacbook\b|chromebook|\bthinkpad\b|لابتوب/.test(t)) return "laptop";
  if (/perfume|cologne|fragrance|parfum|eau\s+de|عطر/.test(t)) return "perfume";
  if (/supplement|protein\s+powder|whey|creatine|\bbcaa\b|pre.?workout|\bvitamin\b|omega.3|fish\s+oil|مكمل/.test(t)) return "supplement";
  if (/lithium\s+battery|lipo\s+battery|flammable|hazardous/.test(t)) return "hazardous";
  return "regular";
}

export function calcShipping(category: ProductCategory, weightLbs = 1): number {
  switch (category) {
    case "mobile": return PRICING.shipping_mobile_flat;
    case "laptop": return PRICING.shipping_laptop_flat;
    case "perfume": return PRICING.shipping_perfume_flat;
    case "hazardous": return PRICING.shipping_hazardous_flat;
    case "supplement": return PRICING.shipping_supplement_per_lb * weightLbs + PRICING.shipping_supplement_tax;
    case "regular": return PRICING.shipping_regular_per_lb * weightLbs;
  }
}

export function formatIQD(usd: number | null, category: ProductCategory = "regular", weightLbs = 1): string {
  if (usd === null || isNaN(usd)) return "";
  const shipping = calcShipping(category, weightLbs);
  const iqd = Math.round(usd * PRICING.usd_to_iqd * PRICING.iqd_markup) + shipping;
  return `${iqd.toLocaleString("en", { maximumFractionDigits: 0 })} دينار`;
}

export function formatIQD_China(usd: number | null, weightKg = 1): string {
  if (usd === null || isNaN(usd)) return "";
  const shipping = Math.round(weightKg * PRICING.china_shipping_per_kg);
  const iqd = Math.round(usd * PRICING.usd_to_iqd_china) + shipping;
  return `${iqd.toLocaleString("en", { maximumFractionDigits: 0 })} دينار`;
}

export function parseWeightKgFromTitle(title: string): number | null {
  const lbMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i);
  if (lbMatch) return parseFloat(lbMatch[1]!) / KG_TO_LBS;
  const kgMatch = title.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) return parseFloat(kgMatch[1]!);
  const gMultiMatch = title.match(/(\d+)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*g\b/);
  if (gMultiMatch) return (parseInt(gMultiMatch[1]!) * parseFloat(gMultiMatch[2]!)) / 1000;
  const gMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:grams?|g\b)/i);
  if (gMatch && parseFloat(gMatch[1]!) >= 5) return parseFloat(gMatch[1]!) / 1000;
  const ozMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\b/i);
  if (ozMatch) return parseFloat(ozMatch[1]!) * 0.0283495;
  const mlMatch = title.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (mlMatch) return parseFloat(mlMatch[1]!) / 1000;
  const lMatch = title.match(/(\d+(?:\.\d+)?)\s*[Ll]\b/);
  if (lMatch) return parseFloat(lMatch[1]!);
  return null;
}

export function parseWeightKgFromSpecs(specs: { name: string; value: string }[]): number | null {
  for (const spec of specs) {
    if (!/weight|وزن/i.test(spec.name)) continue;
    const w = parseWeightString(spec.value);
    if (w !== null) return w;
  }
  return null;
}

function parseWeightString(str: string): number | null {
  const s = str.toLowerCase().trim();
  const lbMatch = s.match(/^([\d.]+)\s*(?:lb|lbs|pound|pounds)/);
  if (lbMatch) return parseFloat(lbMatch[1]!) / KG_TO_LBS;
  const kgMatch = s.match(/^([\d.]+)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]!);
  const gMatch = s.match(/^([\d.]+)\s*(?:g|gram|grams)/);
  if (gMatch) return parseFloat(gMatch[1]!) / 1000;
  const ozMatch = s.match(/^([\d.]+)\s*oz/);
  if (ozMatch) return parseFloat(ozMatch[1]!) * 0.0283495;
  return null;
}

export function defaultWeightKg(category: ProductCategory): number {
  switch (category) {
    case "mobile": return 0.2;
    case "laptop": return 2.0;
    case "perfume": return 0.3;
    case "supplement": return 1.0;
    case "hazardous": return 0.5;
    case "regular": return 0.5;
  }
}

const VALID_CATEGORIES = new Set<ProductCategory>(["perfume", "hazardous", "supplement", "mobile", "laptop", "regular"]);

export async function batchClassify(titles: string[], openaiApiKey: string): Promise<{ category: ProductCategory; weightKg: number }[]> {
  const preParseWeights = titles.map(t => parseWeightKgFromTitle(t));
  const results: { category: ProductCategory; weightKg: number }[] = titles.map((t, i) => {
    const category = detectCategory(t);
    return { category, weightKg: preParseWeights[i] ?? defaultWeightKg(category) };
  });

  const uncachedIdx = titles.map((_, i) => i);
  if (uncachedIdx.length === 0) return results;

  const prompt = `For each product title below, classify its shipping category and estimate its shipping weight in kg.

Categories:
- "mobile" — smartphones, iPhones, any mobile phone (~0.2 kg)
- "laptop" — laptops, notebooks, MacBooks, Chromebooks (~2 kg)
- "perfume" — perfumes, colognes, fragrances (~0.3 kg)
- "supplement" — protein powder, vitamins, creatine, BCAA, fish oil, pre-workout (~varies)
- "hazardous" — lithium batteries, lipo batteries, flammables (~0.5 kg)
- "regular" — everything else

Weight rules:
- If the title explicitly mentions weight/size (e.g. "5 lbs", "2kg", "500g"), use that exact weight
- Minimum weight: 0.5 kg

Products:
${uncachedIdx.map((i, n) => `${n + 1}. ${titles[i]}`).join("\n")}

Reply with ONLY a JSON array of objects, same count as products.
Example: [{"cat":"regular","kg":0.5},{"cat":"mobile","kg":0.18}]`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 600,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "[]";
    const raw = JSON.parse(content) as unknown[];

    uncachedIdx.forEach((originalIdx, n) => {
      const item = raw[n] as { cat?: unknown; kg?: unknown } | undefined;
      const catRaw = typeof item?.cat === "string" ? item.cat : "regular";
      const category = (VALID_CATEGORIES.has(catRaw as ProductCategory) ? catRaw : "regular") as ProductCategory;
      const aiWeight = typeof item?.kg === "number" ? item.kg : null;
      const weightKg = preParseWeights[originalIdx] ?? aiWeight ?? defaultWeightKg(category);
      results[originalIdx] = { category, weightKg };
    });
  } catch {
    // Keep keyword-based results
  }

  return results;
}
