import { parseWeightKgFromTitle, defaultWeightKg } from "./weight";

export const USD_TO_IQD = 1350;
export const IQD_MARKUP = 1.2;

export const CNY_TO_USD = 6.5;
export const USD_TO_IQD_CHINA = 1400;
export const CHINA_SHIPPING_PER_KG = 15_500;

export function formatIQD_China(usd: number | null, weightKg = 1): string {
  if (usd === null || isNaN(usd)) return "";
  const shipping = Math.round(weightKg * CHINA_SHIPPING_PER_KG);
  const iqd = Math.round(usd * USD_TO_IQD_CHINA) + shipping;
  return `${iqd.toLocaleString("en")} دينار`;
}

// Shipping rates (IQD) — US shipments measured in lbs
const SHIPPING_REGULAR_PER_LB   = 8_900;
const SHIPPING_PERFUME_FLAT      = 40_000;
const SHIPPING_HAZARDOUS_FLAT    = 25_000;
const SHIPPING_SUPPLEMENT_PER_LB = 12_000;
const SHIPPING_SUPPLEMENT_TAX    = 2_000;
const SHIPPING_MOBILE_FLAT       = 95_000;
const SHIPPING_LAPTOP_FLAT       = 55_000;

export type ProductCategory = "perfume" | "hazardous" | "supplement" | "mobile" | "laptop" | "regular";
const VALID_CATEGORIES = new Set<ProductCategory>(["perfume", "hazardous", "supplement", "mobile", "laptop", "regular"]);

// In-memory cache — avoids re-classifying the same title across requests
const classifyWeightCache = new Map<string, { category: ProductCategory; weightKg: number }>();

// Keyword fallback (used when AI is unavailable)
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
    case "mobile":     return SHIPPING_MOBILE_FLAT;
    case "laptop":     return SHIPPING_LAPTOP_FLAT;
    case "perfume":    return SHIPPING_PERFUME_FLAT;
    case "hazardous":  return SHIPPING_HAZARDOUS_FLAT;
    case "supplement": return SHIPPING_SUPPLEMENT_PER_LB * weightLbs + SHIPPING_SUPPLEMENT_TAX;
    case "regular":    return SHIPPING_REGULAR_PER_LB * weightLbs;
  }
}

export function formatIQD(usd: number | null, category: ProductCategory = "regular", weightLbs = 1): string {
  if (usd === null || isNaN(usd)) return "";
  const shipping = calcShipping(category, weightLbs);
  const iqd = Math.round(usd * USD_TO_IQD * IQD_MARKUP) + shipping;
  return `${iqd.toLocaleString("en")} دينار`;
}

// Batch-classify titles using OpenAI — one API call for all products
// Returns both category AND weight estimate to avoid a second AI call
export async function batchClassify(titles: string[], openaiApiKey: string): Promise<{ category: ProductCategory; weightKg: number }[]> {
  const cacheKey = (t: string) => t.toLowerCase().slice(0, 120);

  // Pre-parse weights from titles using regex
  const preParseWeights = titles.map(t => parseWeightKgFromTitle(t));

  // Build result array, seeding from cache where possible
  const results: { category: ProductCategory; weightKg: number }[] = titles.map((t, i) => {
    const cached = classifyWeightCache.get(cacheKey(t));
    if (cached) return cached;
    const category = detectCategory(t);
    return { category, weightKg: preParseWeights[i] ?? defaultWeightKg(category) };
  });

  const uncachedIdx = titles.map((t, i) => classifyWeightCache.has(cacheKey(t)) ? -1 : i).filter(i => i >= 0);

  if (uncachedIdx.length === 0) return results;

  const prompt = `For each product title below, classify its shipping category and estimate its TOTAL shipping weight in kg (product + packaging).
IMPORTANT: Always estimate weight on the HIGHER side to avoid undercharging. Include packaging weight (~0.2-0.5 kg extra).

Categories:
- "mobile" — smartphones, iPhones, any mobile phone (~0.3 kg with box)
- "laptop" — laptops, notebooks, MacBooks, Chromebooks (~2.5 kg with box)
- "perfume" — perfumes, colognes, fragrances (~0.5 kg with box)
- "supplement" — protein powder, vitamins, creatine, BCAA, fish oil, pre-workout (~varies)
- "hazardous" — lithium batteries, lipo batteries, flammables (~0.7 kg)
- "regular" — everything else

Weight rules (INCLUDE packaging, estimate HIGH):
- If the title mentions weight (e.g. "5 lbs", "2kg", "500g"), use that + 0.3 kg for packaging
- Clothing: shirt=0.4, jeans=0.8, shoes=1.2, jacket=1.1, underwear pack=0.5, dress=0.6
- Bags/backpacks: small=0.8, medium=1.3, large=1.8, suitcase=3.5
- Supplements: use weight from title + 0.3, default=1.2
- Electronics: headphones=0.5, speaker=1.5, tablet=0.8, monitor=5.0, keyboard=1.0, mouse=0.3
- Kitchen: small appliance=2.0, cookware=2.5, utensils=0.8
- Books: paperback=0.4, hardcover=0.8, textbook=1.2
- Toys/games: small=0.5, medium=1.0, large=1.8, board game=1.2
- Tools: hand tool=0.8, power tool=2.5, drill=2.0
- Beauty/skincare: cream=0.4, set=0.8, device=0.6
- Home/furniture: pillow=1.0, blanket=1.5, small decor=0.8, lamp=1.5
- Sports: small gear=0.6, medium=1.5, large=3.0
- Minimum weight: 0.5 kg

Products:
${uncachedIdx.map((i, n) => `${n + 1}. ${titles[i]}`).join("\n")}

Reply with ONLY a JSON array of objects, same count as products.
Example: [{"cat":"regular","kg":0.7},{"cat":"mobile","kg":0.3},{"cat":"supplement","kg":2.57}]`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 1200,
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
      // Prefer pre-parsed regex weight, then AI weight, then category default
      const weightKg = preParseWeights[originalIdx] ?? aiWeight ?? defaultWeightKg(category);
      const entry = { category, weightKg };
      classifyWeightCache.set(cacheKey(titles[originalIdx] ?? ""), entry);
      results[originalIdx] = entry;
    });
  } catch {
    // Fallback to keyword detection + pre-parsed or default weights if AI fails
    uncachedIdx.forEach(i => {
      const category = detectCategory(titles[i] ?? "");
      const weightKg = preParseWeights[i] ?? defaultWeightKg(category);
      results[i] = { category, weightKg };
    });
  }

  return results;
}
