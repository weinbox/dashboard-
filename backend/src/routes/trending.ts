import { Hono } from "hono";
import { getTopTrending, updateTrendingCache } from "../lib/db";
import { searchAmazon, searchEbay, searchWalmart, searchTaobao, search1688, searchTemu } from "./search";
import type { Product } from "../types";

const trendingRouter = new Hono();

const platformSearchers: Record<string, (query: string) => Promise<Product[]>> = {
  ebay: searchEbay,
  amazon: searchAmazon,
  walmart: searchWalmart,
  taobao: searchTaobao,
  "1688": search1688,
  temu: searchTemu,
};

async function fetchFreshProducts(query: string, platforms: string[]): Promise<Product[]> {
  const validPlatforms = platforms.filter((p) => p in platformSearchers);
  if (validPlatforms.length === 0) return [];

  const settled = await Promise.allSettled(
    validPlatforms.map((p) => {
      const searcher = platformSearchers[p];
      if (!searcher) return Promise.resolve([] as Product[]);
      return searcher(query);
    })
  );

  const results: Product[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    }
  }
  return results;
}

trendingRouter.get("/", async (c) => {
  const rows = getTopTrending(10);

  const trendingItems = await Promise.all(
    rows.map(async (row) => {
      const now = new Date();
      const cacheExpires = row.cacheExpiresAt ? new Date(row.cacheExpiresAt) : null;
      const isCacheValid = cacheExpires !== null && cacheExpires > now;

      let products: Product[];

      if (isCacheValid && row.cachedProducts) {
        try {
          products = JSON.parse(row.cachedProducts) as Product[];
        } catch {
          products = [];
        }
      } else {
        // Cache expired — re-fetch
        let platforms: string[] = [];
        try {
          platforms = JSON.parse(row.platforms) as string[];
        } catch {
          platforms = ["ebay", "amazon", "walmart"];
        }

        try {
          const fresh = await fetchFreshProducts(row.query, platforms);
          products = fresh.slice(0, 10);
          if (products.length > 0) {
            updateTrendingCache(row.query, products, platforms);
          } else if (row.cachedProducts) {
            // Keep stale cache rather than returning nothing
            products = JSON.parse(row.cachedProducts) as Product[];
          }
        } catch {
          products = row.cachedProducts ? (JSON.parse(row.cachedProducts) as Product[]) : [];
        }
      }

      return {
        query: row.query,
        products,
        count: row.count,
      };
    })
  );

  return c.json({ data: trendingItems });
});

export { trendingRouter };
