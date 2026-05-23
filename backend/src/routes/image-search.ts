import { Hono } from "hono";
import { env } from "../env";
import type { Product } from "../types";
import { searchAmazon, searchEbay, searchWalmart, searchTaobao, search1688, searchTemu, searchIherb } from "./search";

const imageSearchRouter = new Hono();

const SERPAPI_BASE = "https://serpapi.com/search";

interface LensVisualMatch {
  title?: string;
  link?: string;
  thumbnail?: string;
  source?: string;
}

interface LensResponse {
  visual_matches?: LensVisualMatch[];
  knowledge_graph?: { title?: string; subtitle?: string };
  text?: { detected_text?: string };
  related_searches?: Array<{ query?: string }>;
}

/** Generic/uninformative titles that should be skipped when picking a query. */
const GENERIC_TITLES = new Set([
  "product", "item", "image", "photo", "picture", "unknown", "untitled",
]);

/** Store prefixes that appear in visual_match titles from shopping sites */
const STORE_PREFIXES = [
  /^amazon\.com:\s*/i,
  /^amazon:\s*/i,
  /^walmart\.com:\s*/i,
  /^walmart:\s*/i,
  /^best buy:\s*/i,
  /^ebay:\s*/i,
  /^target:\s*/i,
  /^etsy:\s*/i,
];

function cleanTitle(raw: string | undefined): string | null {
  if (!raw) return null;
  let t = raw.trim();
  for (const re of STORE_PREFIXES) t = t.replace(re, "");
  t = t.trim();
  // Truncate at 80 chars on a word boundary
  if (t.length > 80) {
    const cut = t.lastIndexOf(" ", 80);
    t = cut > 20 ? t.slice(0, cut) : t.slice(0, 80);
  }
  return t || null;
}

function isDescriptive(title: string | null | undefined): title is string {
  if (!title) return false;
  const t = title.trim().toLowerCase();
  return t.length > 4 && !GENERIC_TITLES.has(t);
}

/**
 * Pick the most descriptive title from the first N visual matches.
 * "Most descriptive" = longest cleaned title that is not generic.
 */
function bestVisualMatchTitle(
  matches: LensVisualMatch[] | undefined,
  limit: number
): string | null {
  if (!matches || matches.length === 0) return null;
  const candidates = matches
    .slice(0, limit)
    .map((m) => cleanTitle(m.title))
    .filter(isDescriptive);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

/**
 * Extract the best product query from a Google Lens response.
 * Returns [primaryQuery, fallbackQuery].
 */
function extractQueries(lensData: LensResponse): [string | null, string | null] {
  // Priority 1: knowledge graph title (most reliable)
  const kgTitle = lensData.knowledge_graph?.title?.trim() || null;

  // Priority 2: best title from first 3 visual matches
  const vmTitle = bestVisualMatchTitle(lensData.visual_matches, 3);

  // Priority 3: first related search query
  const relatedQuery = lensData.related_searches?.find((r) => r.query?.trim())?.query?.trim() || null;

  // Priority 4: detected text
  const detectedText = lensData.text?.detected_text?.trim() || null;

  const primary = kgTitle || vmTitle || relatedQuery || detectedText || null;

  // Fallback: second-best visual match title (different from primary)
  const allVmTitles = (lensData.visual_matches || [])
    .map((m) => m.title?.trim())
    .filter(isDescriptive)
    .filter((t) => t !== primary);
  const fallback = allVmTitles.length > 0
    ? allVmTitles.reduce((best, cur) => (cur.length > best.length ? cur : best))
    : null;

  return [primary, fallback];
}

imageSearchRouter.get("/", async (c) => {
  const imageUrl = c.req.query("url");

  if (!imageUrl || imageUrl.trim() === "") {
    return c.json(
      { error: { message: "Query parameter 'url' is required", code: "MISSING_URL" } },
      400
    );
  }

  try {
    // Step 1: Use Google Lens to identify the product
    const lensUrl = new URL(SERPAPI_BASE);
    lensUrl.searchParams.set("engine", "google_lens");
    lensUrl.searchParams.set("url", imageUrl.trim());
    lensUrl.searchParams.set("api_key", env.SERPAPI_KEY);

    const lensRes = await fetch(lensUrl.toString());
    if (!lensRes.ok) throw new Error(`Google Lens SerpAPI error: ${lensRes.status}`);

    const lensData = (await lensRes.json()) as LensResponse;

    console.log("[image-search] lensData knowledge_graph:", lensData.knowledge_graph);
    console.log("[image-search] lensData visual_matches (first 3):", lensData.visual_matches?.slice(0, 3));
    console.log("[image-search] lensData related_searches (first 3):", lensData.related_searches?.slice(0, 3));

    const [primaryQuery, fallbackQuery] = extractQueries(lensData);

    console.log("[image-search] extracted primaryQuery:", primaryQuery, "| fallbackQuery:", fallbackQuery);

    if (!primaryQuery) {
      console.log("[image-search] No product identified from image");
      return c.json({ data: { results: [] } });
    }

    // Step 2: Search requested platforms with the identified product name
    const platformsParam = c.req.query("platforms");
    const requestedPlatforms = platformsParam
      ? platformsParam.split(",").map((p) => p.trim().toLowerCase())
      : ["amazon", "ebay", "walmart"];

    const first5Words = (q: string) => q.split(/\s+/).slice(0, 5).join(" ");

    const makePlatformSearchers = (query: string): Record<string, () => Promise<Product[]>> => ({
      amazon: () => searchAmazon(query),
      ebay: () => searchEbay(query),
      walmart: () => searchWalmart(query),
      taobao: () => searchTaobao(query),
      "1688": () => search1688(query),
      temu: () => searchTemu(query),
      iherb: () => searchIherb(first5Words(query)),
    });

    const runSearch = async (query: string): Promise<Product[]> => {
      const searchers = makePlatformSearchers(query);
      const settled = await Promise.allSettled(
        requestedPlatforms
          .filter((p) => searchers[p])
          .map((p) => searchers[p]!())
      );
      const out: Product[] = [];
      for (const outcome of settled) {
        if (outcome.status === "fulfilled") {
          out.push(...outcome.value);
        }
      }
      return out;
    };

    let results = await runSearch(primaryQuery);

    console.log("[image-search] results count (primary query):", results.length);

    // Step 3: If only one platform was requested and it returned 0 results,
    // retry with the fallback query derived from the second-best visual match.
    if (results.length === 0 && requestedPlatforms.length === 1 && fallbackQuery) {
      console.log("[image-search] 0 results for single platform — retrying with fallbackQuery:", fallbackQuery);
      results = await runSearch(fallbackQuery);
      console.log("[image-search] results count (fallback query):", results.length);
    }

    // Sort results in the order platforms were requested
    const platformOrder: Record<string, number> = Object.fromEntries(
      requestedPlatforms.map((p, i) => [p, i])
    );
    results.sort(
      (a, b) =>
        (platformOrder[a.platform] ?? requestedPlatforms.length) -
        (platformOrder[b.platform] ?? requestedPlatforms.length)
    );

    return c.json({ data: { results, detectedQuery: primaryQuery } });
  } catch (err) {
    console.error("Image search failed:", err);
    return c.json(
      { error: { message: "Image search failed", code: "FETCH_ERROR" } },
      502
    );
  }
});

export { imageSearchRouter };
