import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function getEnv(key: string): string {
  return Deno.env.get(key) ?? "";
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get context from request body (current page, product info, etc.)
  let context: Record<string, unknown> = {};
  try {
    context = await req.json();
  } catch {
    // No body is fine - default context
  }

  const currentPage = (context.currentPage as string) || "home";
  const productInfo = context.productInfo as Record<string, unknown> | undefined;
  const searchQuery = (context.searchQuery as string) || "";

  // Build concise system instructions to minimize token cost
  let instructions = `أنت مساعد BoxBuy. تتكلم عراقي مختصر.
المواقع: Amazon, eBay, Walmart, Taobao, 1688, iHerb.
عند طلب بحث: اسأل "من أي موقع؟" ثم استخدم navigate_to_store. إذا ذكر الموقع، ادخل مباشرة.
استخدم الأدوات بدل الشرح المطوّل.`;

  if (currentPage === "product" && productInfo) {
    instructions += `\nالزبون يشوف: ${productInfo.title || ""} - ${productInfo.price || ""} (${productInfo.platform || ""}). اسأله شلون تساعده.`;
  } else if (currentPage === "search" && searchQuery) {
    instructions += `\nالزبون بحث عن: "${searchQuery}". اسأله من أي موقع يريد.`;
  } else {
    instructions += `\nرحّب بجملة قصيرة واسأله شنو يبحث.`;
  }

  // Check if this is an SDP offer (unified interface for WebRTC)
  const sdpOffer = context.sdp as string | undefined;

  if (!sdpOffer) {
    return new Response(
      JSON.stringify({ error: "Missing SDP offer in request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime-mini",
    audio: { output: { voice: "alloy" } },
    instructions,
  });

  try {
    // Unified interface: send SDP + session config as multipart form to /v1/realtime/calls
    const formData = new FormData();
    formData.set("sdp", sdpOffer);
    formData.set("session", sessionConfig);

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OpenAI returns SDP answer as text
    const sdpAnswer = await response.text();

    return new Response(
      JSON.stringify({ sdp: sdpAnswer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to create realtime session", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
