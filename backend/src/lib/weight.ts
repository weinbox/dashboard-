import type { ProductCategory } from "./pricing";

export const KG_TO_LBS = 2.20462;

// Layer 1: Extract explicit weight from product specs (Amazon/Walmart detail pages)
export function parseWeightKgFromSpecs(specs: { name: string; value: string }[]): number | null {
  for (const spec of specs) {
    if (!/weight|وزن/i.test(spec.name)) continue;
    const w = parseWeightString(spec.value);
    if (w !== null) return w;
  }
  return null;
}

// Layer 2: Extract explicit weight from product title (handles "5 lbs", "500g", "2kg", "16oz")
export function parseWeightKgFromTitle(title: string): number | null {
  // lbs / pounds
  const lbMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i);
  if (lbMatch) return parseFloat(lbMatch[1]!) / KG_TO_LBS;

  // kg
  const kgMatch = title.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) return parseFloat(kgMatch[1]!);

  // grams (but not if preceded by another number as in "2x500g" — handle that as 1000g)
  const gMultiMatch = title.match(/(\d+)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*g\b/);
  if (gMultiMatch) return (parseInt(gMultiMatch[1]!) * parseFloat(gMultiMatch[2]!)) / 1000;

  const gMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:grams?|g\b)/i);
  if (gMatch && parseFloat(gMatch[1]!) >= 5) return parseFloat(gMatch[1]!) / 1000; // ignore tiny numbers like "5g protein"

  // oz (fluid oz for liquids ~1:1, dry oz)
  const ozMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\b/i);
  if (ozMatch) return parseFloat(ozMatch[1]!) * 0.0283495;

  // ml (liquids — density ~1 g/ml)
  const mlMatch = title.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (mlMatch) return parseFloat(mlMatch[1]!) / 1000;

  // liters
  const lMatch = title.match(/(\d+(?:\.\d+)?)\s*[Ll]\b/);
  if (lMatch) return parseFloat(lMatch[1]!);

  return null;
}

// Layer 4: Category-based default weights (fallback when no other info available)
export function defaultWeightKg(category: ProductCategory): number {
  switch (category) {
    case "mobile":     return 0.3;   // ~300g with box
    case "laptop":     return 2.5;   // ~2.5kg with box
    case "perfume":    return 0.5;   // ~500g with box
    case "supplement": return 1.2;   // ~1.2kg with packaging
    case "hazardous":  return 0.7;   // ~700g
    case "regular":    return 0.7;   // ~700g with packaging
  }
}

// Helper: parse a weight string like "2.3 pounds", "500 grams", "1.5 kg"
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
