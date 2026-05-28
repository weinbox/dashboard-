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

  // Build instructions optimized for mini model — explicit tool usage commands
  let instructions = `أنت مساعد BoxBuy الصوتي. تتكلم عراقي مختصر وودود.
المواقع المتاحة: Amazon, eBay, Walmart, Taobao, 1688, iHerb.

## قواعد إلزامية:
- عندما يطلب الزبون بحث عن منتج: اسأله "من أي موقع تحب؟" ثم نفّذ navigate_to_store فوراً.
- إذا ذكر الموقع مباشرة: نفّذ navigate_to_store بدون سؤال.
- لا تشرح كيف يبحث. لا تقترح. نفّذ الأداة مباشرة.
- أجب بجملة أو اثنتين فقط. لا ثرثرة.
- يجب أن تستخدم الأدوات (tools) لتنفيذ الطلبات. لا ترد بالكلام فقط.`;

  if (currentPage === "product" && productInfo) {
    instructions += `\nالزبون يشوف منتج: ${productInfo.title || ""} - ${productInfo.price || ""} (${productInfo.platform || ""}). اسأله شلون تساعده.`;
  } else if (currentPage === "search" && searchQuery) {
    instructions += `\nالزبون بحث عن: "${searchQuery}". اسأله من أي موقع يريد ونفّذ navigate_to_store.`;
  } else {
    instructions += `\nرحّب بجملة قصيرة واسأله شنو يبحث.`;
  }

  // Tools that the voice agent can call
  const tools = [
    {
      type: "function",
      name: "navigate_to_store",
      description: "الدخول على موقع/متجر معين والبحث فيه. استخدم هذه الأداة دائماً عندما يطلب الزبون البحث عن منتج.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "iherb"], description: "الموقع" },
          query: { type: "string", description: "كلمة البحث" },
        },
        required: ["platform", "query"],
      },
    },
    {
      type: "function",
      name: "search_products",
      description: "البحث عن منتجات عامة",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "كلمة البحث" },
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "iherb"] },
        },
        required: ["query"],
      },
    },
    {
      type: "function",
      name: "navigate_to",
      description: "التنقل إلى صفحة",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["home", "search", "cart", "orders"] },
          searchQuery: { type: "string" },
        },
        required: ["page"],
      },
    },
    {
      type: "function",
      name: "calculate_price",
      description: "حساب السعر بالدينار العراقي",
      parameters: {
        type: "object",
        properties: {
          priceUSD: { type: "number" },
          weightKg: { type: "number" },
        },
        required: ["priceUSD"],
      },
    },
  ];

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
    tools,
    tool_choice: "auto",
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
