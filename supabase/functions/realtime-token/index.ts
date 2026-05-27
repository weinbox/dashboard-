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

  // Build system instructions based on current page context
  let instructions = `أنت مساعد BoxBuy الصوتي الذكي. أنت تساعد الزبائن العراقيين في البحث عن المنتجات وشرائها من مواقع عالمية.
تتكلم بالعربي العراقي بأسلوب ودود ومختصر.
الأسعار تظهر بالدينار العراقي.
المنصات المتاحة: Amazon, eBay, Walmart, Taobao, 1688, iHerb.

## قاعدة مهمة جداً:
عندما يطلب الزبون البحث عن منتج، لا تبحث مباشرة في كل المواقع.
بدلاً من ذلك:
1. اسأل الزبون: "من أي موقع تحب أبحثلك؟" واذكر له المواقع المتاحة (Amazon, eBay, Walmart, Taobao, 1688, iHerb)
2. انتظر جواب الزبون
3. بعد ما يختار الموقع، استخدم navigate_to_store للدخول على ذلك الموقع والبحث فيه

لا تختار الموقع بنفسك ولا تنصح بموقع معين. دع الزبون هو الذي يقرر.
إذا الزبون قال اسم موقع مباشرة مع طلب البحث، ادخل على الموقع مباشرة بدون ما تسأل.

`;

  if (currentPage === "product" && productInfo) {
    instructions += `الزبون حالياً يشوف منتج:
- اسم المنتج: ${productInfo.title || "غير معروف"}
- السعر: ${productInfo.price || "غير محدد"}
- المنصة: ${productInfo.platform || "غير محددة"}
- التقييم: ${productInfo.rating || "غير متوفر"}

أنت على اطلاع بتفاصيل المنتج. لا تقرأها تلقائياً، لكن استخدمها للإجابة على أسئلة الزبون. اسأله كيف تقدر تساعده.`;
  } else if (currentPage === "search" && searchQuery) {
    instructions += `الزبون حالياً في صفحة البحث وبحث عن: "${searchQuery}"
ساعده بتحسين البحث أو اسأله إذا يريد يبحث في موقع معين.`;
  } else if (currentPage === "store") {
    instructions += `الزبون حالياً داخل متجر معين.
ساعده بالبحث عن منتجات داخل هذا المتجر.`;
  } else {
    instructions += `الزبون في الصفحة الرئيسية.
رحب به واسأله شنو يبحث عنه، وبعدها اسأله من أي موقع يحب يبحث.`;
  }

  // Tools that the voice agent can call
  const tools = [
    {
      type: "function",
      name: "search_products",
      description: "البحث عن منتجات في المتاجر المتاحة",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "كلمة البحث" },
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "temu", "iherb"], description: "المنصة المحددة (اختياري)" },
        },
        required: ["query"],
      },
    },
    {
      type: "function",
      name: "get_product_details",
      description: "الحصول على تفاصيل منتج معين",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "معرف المنتج" },
          platform: { type: "string", description: "المنصة" },
        },
        required: ["productId", "platform"],
      },
    },
    {
      type: "function",
      name: "calculate_price",
      description: "حساب السعر النهائي بالدينار العراقي شامل الشحن",
      parameters: {
        type: "object",
        properties: {
          priceUSD: { type: "number", description: "السعر بالدولار" },
          weightKg: { type: "number", description: "الوزن بالكيلوغرام" },
          category: { type: "string", enum: ["regular", "mobile", "laptop", "perfume", "supplement", "hazardous"], description: "تصنيف المنتج" },
        },
        required: ["priceUSD"],
      },
    },
    {
      type: "function",
      name: "navigate_to",
      description: "التنقل إلى صفحة معينة في التطبيق",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["home", "search", "cart", "orders"], description: "الصفحة المطلوبة" },
          searchQuery: { type: "string", description: "كلمة البحث إذا كانت الصفحة search" },
        },
        required: ["page"],
      },
    },
    {
      type: "function",
      name: "navigate_to_store",
      description: "الدخول على موقع/متجر معين والبحث فيه. ستحصل على نتائج البحث (اسم المنتج وسعره). كن على اطلاع بالنتائج واستخدمها للإجابة على أسئلة الزبون (مثل الأرخص، الأفضل، نطاق سعري معين). لا تقرأ كل النتائج، فقط أخبر الزبون أنك لقيت نتائج واسأله شنو يحتاج.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "iherb"], description: "الموقع/المتجر الذي اختاره الزبون" },
          query: { type: "string", description: "كلمة البحث داخل هذا الموقع" },
          minPrice: { type: "number", description: "الحد الأدنى للسعر بالدولار (اختياري)" },
          maxPrice: { type: "number", description: "الحد الأعلى للسعر بالدولار (اختياري)" },
        },
        required: ["platform", "query"],
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
    model: "gpt-realtime-2",
    audio: { output: { voice: "alloy" } },
    instructions,
    tools,
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
