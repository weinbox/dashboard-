import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");
  if (!targetUrl || targetUrl.trim() === "") {
    return new Response(JSON.stringify({ error: { message: "url is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const res = await fetch(targetUrl.trim(), { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
    return new Response(JSON.stringify({ data: { url: res.url } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ data: { url: targetUrl.trim() } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
