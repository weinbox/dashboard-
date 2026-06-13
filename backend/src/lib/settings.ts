import { supabase } from "./supabase";

/**
 * Pricing settings — editable from the admin dashboard via the `settings` table.
 * Values are cached in-memory and refreshed lazily (TTL) so the hot pricing
 * functions in pricing.ts stay synchronous.
 */
export interface PricingSettings {
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

// Defaults — must match the seed values in supabase/sql/dashboard_schema.sql
export const DEFAULT_PRICING: PricingSettings = {
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

const TTL_MS = 60_000; // refresh at most once per minute

let current: PricingSettings = { ...DEFAULT_PRICING };
let lastFetch = 0;
let inFlight: Promise<void> | null = null;

async function fetchSettings(): Promise<void> {
  try {
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error || !data) return;
    const next: PricingSettings = { ...DEFAULT_PRICING };
    for (const row of data as { key: string; value: number | string }[]) {
      if (row.key in next) {
        const n = Number(row.value);
        if (!isNaN(n)) (next as Record<string, number>)[row.key] = n;
      }
    }
    current = next;
    lastFetch = Date.now();
  } catch {
    // keep last known good values on failure
  }
}

/**
 * Returns the current pricing settings synchronously.
 * Triggers a non-blocking background refresh when the cache is stale.
 */
export function getPricing(): PricingSettings {
  if (Date.now() - lastFetch > TTL_MS && !inFlight) {
    inFlight = fetchSettings().finally(() => {
      inFlight = null;
    });
  }
  return current;
}

// Warm the cache on startup (non-blocking).
getPricing();
