import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const supabase = getSupabaseClient();

  try {
    const { data: rows, error } = await supabase
      .from("trending_searches")
      .select("query, count, platforms, cached_products, last_searched_at")
      .order("count", { ascending: false })
      .limit(10);

    if (error) throw error;

    const trendingItems = (rows ?? []).map((row: any) => {
      let products = [];
      try { products = JSON.parse(row.cached_products ?? "[]"); } catch {}
      return { query: row.query, products, count: row.count };
    });

    return new Response(JSON.stringify({ data: trendingItems }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ data: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
